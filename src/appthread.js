const {
  MAINNET,
  TESTNET,
  NETWORK,
  CMD_PREFIX,
  FRONT_SERVER,
  MIN_CARDINAL,
  ADDRESS_COUNT,
  AMOUNT_PER_ADDRESS,
  INSCRIPTION_PATH,
  ORD_WALLET_NAME,
  TEMP_WALLET_NAME,
} = require('./utils/config.js')

global.lastBlockHeight = 0
global.cardinals_count = 0
global.isAddingCardinal = false
global.new_block_detected = false
global.new_order_detected = false

const WAIT_TIME = 60
const ORDER_PERIOD = 5 * 1000

// logger config
const { logger, orderLog } = require('./logger.js')

const { writeFileSync } = require('fs')
const { inscribeOrdinal } = require('./utils/ord-wallet.js')

const {
  ORDER_STATUS_ORDERED,
  ORDER_STATUS_TRANSACTION_CONFIRMED,
  ORDER_STATUS_ORDINAL_INSCRIBED,
  ORDER_STATUS_FAILED,
  ORDER_STATUS_CONFIRMED,
  ERROR_UNKNOWN,
  ERROR_INVALID_PARAMTER,
  ERROR_INVALID_TXID,
  ERROR_DUPLICATED_TXID,
  SUCCESS,
  FAILED,
} = require('./utils/defines.js')

const { generateAddress, splitUtxo } = require('./utils/ord-wallet.js')

const { execSync } = require('child_process')
const MempoolJS = require('@mempool/mempool.js')
const { sleep, jsonParse } = require('./utils/utils.js')

const mempool = MempoolJS({
  hostname: 'mempool.space',
  network: NETWORK,
  timeout: 60000,
})
const bitcoin = mempool.bitcoin

async function appThread() {
  await sleep(1000)
  init()
  orderThread()
  cardinalThread()
}

const init = () => {
  console.log('initializing app...')
  const { status, data: cardinals, error } = getCardinals()
  if (status == SUCCESS) {
    global.cardinals_count = cardinals.length
    console.log('cardinals_count=', global.cardinals_count)
  }
}

const orderThread = async () => {
  while (true) {
    try {
      await sleep(ORDER_PERIOD)
      const orders = await global.orderCollection.find({ order_status: { $lt: ORDER_STATUS_FAILED } }).toArray()
      const toInscribe = orders.filter(order => order.order_status == ORDER_STATUS_TRANSACTION_CONFIRMED).length
      console.log('=====================')
      console.log('=====================')
      console.log('=== NEW ORDER =', toInscribe, orders.length)
      console.log('=====================')
      console.log('=====================')
      console.log('global.new_block_detected :>> ', global.new_block_detected);
      if (toInscribe > 0 || (global.new_block_detected && orders.length - toInscribe > 0)) {
        orderLog.info('OrderThread Start, toInscribe, total', toInscribe, orders.length)
      } else {
        orderLog.info('No orders..., waiting for new orders', orders.length)
        continue
      }
      let index = 0,
        isBreaked = false
      const feeRate = await getFeeRate()
      console.log('feeRate', feeRate)
      if (global.cardinals_count == 0) {
        orderLog.error('No cardinals..., waiting for cardinals')
        continue
      }
      for (const order of orders) {
        index++
        if (global.cardinals_count == 0) {
          isBreaked = true
          orderLog.info('Waiting for cardinals added...')
          break
        }
        try {
          switch (order.order_status) {
            case ORDER_STATUS_ORDERED:
              let tx = await getTransaction(order.txid)

              if (!tx) {
                order.order_status = ORDER_STATUS_FAILED
                order.description = 'Transaction not exist'
                break
              } else if (!tx.status.confirmed) {
                break
              }

              let validSenderAddress = true

              for (const vin of tx.vin) {
                if (vin.prevout.scriptpubkey_address !== order.btc_sender_address) {
                  validSenderAddress = false
                  break
                }
              }

              if (!validSenderAddress) {
                order.order_status = ORDER_STATUS_FAILED
                order.description = 'Invalid sender address'
                break
              }

              let btcBalance = 0
              let validReceiverAddress = false

              for (const vout of tx.vout) {
                if (vout.scriptpubkey_address === VAULT_ADDRESS) {
                  btcBalance += vout.value
                  validReceiverAddress = true
                }
              }

              if (!validReceiverAddress) {
                order.order_status = ORDER_STATUS_FAILED
                order.description = 'Invalid receiver address'
                break
              }

              order.btc_balance = btcBalance
              order.spent_fee = 0

              if (order.btc_balance < STATIC_FEE + DYNAMIC_FEE * order.fee_rate) {
                order.order_status = ORDER_STATUS_FAILED
                order.description = 'Insufficient BTC balance'
                break
              }

              order.order_status = ORDER_STATUS_TRANSACTION_CONFIRMED
              order.description = 'Transaction confirmed'
            case ORDER_STATUS_TRANSACTION_CONFIRMED:
              orderLog.debug('Inscribing ...', index)
              orderLog.debug('cardinals_count', global.cardinals_count)
              console.log("DDDDDDDDDDDDDD:", order.feeRate)
              if(!order.feeRate){
                order.feeRate = feeRate
              }
              const response = await inscribeTextOrdinal(order.text, order.receiveAddress, order.feeRate)
              if (response.status == FAILED) {
                // order.order_status = ORDER_STATUS_FAILED
                orderLog.error('Inscribe failed:', response.error)
                order.description = response.error
                break
              }

              order.ordinal = response.data
              // order.feeRate = feeRate
              order.order_status = ORDER_STATUS_ORDINAL_INSCRIBED
              order.description = 'Ordinal inscribed'
              orderLog.fatal('Inscribing success...txid, reveal, text', order.txid, order.ordinal.reveal, order.text)
              if (global.cardinals_count > 0) global.cardinals_count -= 1
              break
            case ORDER_STATUS_ORDINAL_INSCRIBED:
              if (!global.new_block_detected || toInscribe > 0 || global.new_order_detected) {
                isBreaked = true
                continue
              }
              orderLog.debug('Checking if inscription confimed', index)
              const ordinalTx = await getTransaction(order.ordinal.reveal)
              if (!ordinalTx) {
                order.order_status = ORDER_STATUS_FAILED
                order.description = 'Inscribe ordinal transaction not exist'
                break
              } else if (!ordinalTx.status.confirmed) {
                break
              }
              order.spent_fee = 0
              order.spent_fee += order.ordinal.fees //token_transfer is not defined!!
              order.spent_fee += await getInscriptionSats(order.ordinal.inscription)

              order.order_status = ORDER_STATUS_CONFIRMED
              order.description = 'Confirmed'
              orderLog.fatal('inscription confimed', order.txid)
              break
          }

          // order.remain_btc_balance = order.btc_balance - order.spent_fee
          await orderCollection.updateOne({ _id: order._id }, { $set: order })
        } catch (error) {
          order.status = ORDER_STATUS_FAILED
          order.description = error.toString()
          orderLog.fatal('UNKOWN FATAL ERROR ***')
          await orderCollection.updateOne({ _id: order._id }, { $set: order })
          console.error(error)
        }
        await sleep(300)
      }
      if (!isBreaked) global.new_block_detected = false
      global.new_order_detected = false
      console.log('orderthread end...')
    } catch (error) {
      orderLog.fatal('OrderThread unexpected error', error)
    }
  }
}

const cardinalThread = async () => {
  while (true) {
    try {
      const blockHeight = await bitcoin.blocks.getBlocksTipHeight()
      console.log('currentBlockHeight', blockHeight, global.lastBlockHeight)
      await sleep(10000)
      if (blockHeight > global.lastBlockHeight) {
        console.log('------------------------------------------')
        console.log('------NEW BLOCK---------------------------')
        console.log('------------------------------------------')
        global.new_block_detected = true
        await sleep(1000)
        logger.debug('New blockHeight', blockHeight)
        runWalletIndex() // ord wallet index
        const { status: getStatus, data: cardinals, error } = getCardinals()
        if (process.env.ADD_CARDINAL_ENABLE == 'false') {
          logger.debug('ADD_CARDINAL is disabled')
          global.lastBlockHeight = blockHeight
          continue
        }
        if (getStatus === SUCCESS && cardinals.length < MIN_CARDINAL) {
          logger.debug('Adding cardinals ...', cardinals.length, MIN_CARDINAL)
          global.isAddingCardinal = true
          global.cardinals_count = cardinals.length
          const { status: addStatus, data, error } = addCardinals()
          if (addStatus === SUCCESS) {
            logger.fatal('Add cardinal success')
            global.lastBlockHeight = blockHeight
            global.isAddingCardinal = false
          } else {
            logger.error('Add cardinal failed, retrying...')
          }
          logger.debug('Waiting for new block ...')
        } else if (getStatus === SUCCESS && cardinals.length >= MIN_CARDINAL) {
          global.isAddingCardinal = false
          global.lastBlockHeight = blockHeight
          logger.debug('Enough cardinals, waiting for new block ...')
        }
      }
    } catch (error) {
      logger.error('Cardinals thread unexpected error', error)
    }
  }
}

const addCardinals = () => {
  try {
    const addresses = generateAddress(ADDRESS_COUNT)
    const response = splitUtxo(addresses, AMOUNT_PER_ADDRESS)
    if (response.status == SUCCESS) {
      logger.info('Adding cardinals success (count, amount)', ADDRESS_COUNT, AMOUNT_PER_ADDRESS)
    } else {
      logger.error('Adding cardinals failed:', response.error)
    }
    return response
  } catch (error) {
    logger.error('Adding cardinals failed:', error)
    return { status: FAILED, error: ERROR_UNKNOWN }
  }
}

const getFeeRate = async () => {
  const feeRateURL = 'https://mempool.space/api/v1/fees/recommended'
  let feeRate = 1
  // if (NETWORK === MAINNET) {
  const response = await fetch(feeRateURL)
  const data = await response.json()
  feeRate = data.halfHourFee
  // }
  return feeRate
}

const getTransaction = async txid => {
  try {
    let tx = null
    let waitTime = 0

    while (!tx && waitTime < WAIT_TIME) {
      try {
        waitTime++
        await sleep(1000)
        tx = await bitcoin.transactions.getTx({ txid })
      } catch (error) {}
    }

    return tx
  } catch (error) {
    console.error(error)
  }
}

const getInscriptionSats = async inscription => {
  try {
    const parts = inscription.split('i')
    const txid = parts[0]
    const vout = parts[1]

    const tx = await bitcoin.transactions.getTx({ txid })

    if (tx && tx.status.confirmed) {
      return tx.vout[vout].value
    }
  } catch (error) {
    console.error
  }
}

const runWalletIndex = () => {
  try {
    logger.debug('Wallet indexing ...')
    execSync(`ord ${CMD_PREFIX} --chain ${NETWORK} --wallet ${ORD_WALLET_NAME} index`) // It's for ord version below 6.0
    logger.debug('Wallet indexing success')
  } catch (error) {
    logger.error('  failed wallet indexing')
  }
}

const getCardinals = () => {
  try {
    logger.debug('Getting cardinals ...')
    const cardinals = execSync(`ord ${CMD_PREFIX} --chain ${NETWORK} --wallet ${ORD_WALLET_NAME} wallet cardinals`)
    logger.debug('Getting cardinals success')
    logger.info('Cardinals count=', jsonParse(cardinals).length)
    return { status: SUCCESS, data: jsonParse(cardinals) }
  } catch (error) {
    logger.error('Getting cardinals failed')
    return { status: FAILED }
  }
}

const inscribeTextOrdinal = async (text, destination, feeRate) => {
  try {
    const inscriptionPath = `${INSCRIPTION_PATH}/inscription_txt.txt`
    writeFileSync(inscriptionPath, text)
    const response = await inscribeOrdinal(inscriptionPath, destination, feeRate)
    return response
  } catch (error) {
    console.error(error)
    return { status: FAILED, error }
  }
}

async function test() {
  try {
    const blockHeight = await bitcoin.blocks.getBlocksTipHeight()
    console.log('blockHeight :>> ', blockHeight)
    const indexRunRet = await execSync(`ord ${CMD_PREFIX} --chain ${NETWORK} index`) // It's for ord version bellow 6.0
    console.log('indexRunRet :>> ', indexRunRet.toString())
    // const balance = await execSync(`ord wallet balance`)
    // console.log('balance :>> ', balance);
    const cardinals = execSync(`ord wallet cardinals`)
    console.log('cardinals :>> ', jsonParse(cardinals).length)
    const inscriptionRet = execSync(`ord wallet inscribe --dry-run --fee-rate 5 inscription.txt`)
    console.log('inscriptionRet :>> ', inscriptionRet.toString())
    // await sleep(1000);
    console.log('thread end')
  } catch (error) {
    console.error('APPTHREAD ERROR=========>', error)
  }
}

module.exports = {
  appThread,
  getCardinals,
}
