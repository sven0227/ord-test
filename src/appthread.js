global.lastBlockHeight = 0
global.cardinals_count = 0
const WAIT_TIME = 60

const {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
} = require('fs')

const {
  inscribeOrdinal,
} = require('./utils/ord-wallet.js')

const { MAINNET, TESTNET,
  NETWORK,
  CMD_PREFIX,
  FRONT_SERVER,
  MIN_CARDINAL,
  ADDRESS_COUNT,
  AMOUNT_PER_ADDRESS,
  INSCRIPTION_PATH
} = require('./utils/config.js')

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

const getTransaction = async (txid) => {
  try {
    let tx = null
    let waitTime = 0

    while (!tx && waitTime < WAIT_TIME) {
      try {
        waitTime++
        await sleep(1000)
        tx = await bitcoin.transactions.getTx({ txid })
      } catch (error) {
      }
    }

    return tx
  } catch (error) {
    console.error(error)
  }
}

const getInscriptionSats = async (inscription) => {
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
    console.log('wallet indexing...');
    execSync(`ord ${CMD_PREFIX} --chain ${NETWORK} index`) // It's for ord version below 6.0
    console.log('  success wallet indexing');
  } catch (error) {
    console.log('  failed wallet indexing');
  }
}

const getCardinals = () => {
  try {
    console.log('getting cardinals...');
    const cardinals = execSync(`ord ${CMD_PREFIX} --chain ${NETWORK} wallet cardinals`)
    console.log('  success getting cardinals', jsonParse(cardinals).length);
    return jsonParse(cardinals)
  } catch (error) {
    console.log('  failed getting cardinals');
    return null
  }
}

const addCardinals = (blockHeight) => {
  const cardinals = getCardinals()
  if (cardinals != null && cardinals.length < MIN_CARDINAL) {
    console.log('adding cardinals...', cardinals.length);
    try {
      const addresses = generateAddress(ADDRESS_COUNT)
      const status = splitUtxo(addresses, AMOUNT_PER_ADDRESS)
      if (status) {
        console.log('  success adding cardinals', cardinals.length);
        global.lastBlockHeight = blockHeight
      }
      else {
        console.log('  failed adding cardinals');
      }
    } catch (error) {
      console.log('  failed adding cardinals', error);
    }
  }
  else if (cardinals != null && cardinals.length >= MIN_CARDINAL) {
    global.lastBlockHeight = blockHeight
  }
}

const inscribeTextOrdinal = async (text, destination, feeRate) => {
  try {
    const inscriptionPath = `${INSCRIPTION_PATH}/inscription.txt`
    writeFileSync(inscriptionPath, text)
    console.log('inscribeTextOrdinal', text, destination, feeRate);
    const response = await inscribeOrdinal(inscriptionPath, destination, feeRate)
    return response
  } catch (error) {
    console.error(error)
    return { status: 'failed', e }
  }
}

const orderMain = async () => {
  const orders = await global.orderCollection.find({ order_status: { $lt: ORDER_STATUS_FAILED } }).toArray()
  // const orders = [
  //   {
  //     txid: '7b83af5c4f3545684e0cdcbf9f24ebfcced9c459266b1c380cwc516393fad5273',
  //     receiveAddress: 'tb1qu9ud2zct3m4s6ljvwqdk5sumf4vpdqtv4zulpr',
  //     fee_rate: 4,
  //     text: 'text to sincrip',
  //     ordinal_type: 0,
  //     timestamp: 1689731995272,
  //     // description: 'ReferenceError: getTransaction is not defined',
  //     order_status: ORDER_STATUS_ORDINAL_INSCRIBED,
  //     ordinal: {
  //       "commit": "188e4fe11d6cd3712b3bb8b2d6eacd45457507b2744133c138ef8b86bfc0181f",
  //       "inscription": "7b83af5c4f3545684e0cdcbf9f24ebfcced9c459266b1c380cc516393fad5273i0",
  //       "reveal": "5263b197d060c17d346efafa270f9cd2acb77c86879a7af274419a328482d406",
  //       "fees": 2556
  //     }
  //   }
  // ]
  // console.log('orders :>> ', orders);
  for (const order of orders) {
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
          const response = await inscribeTextOrdinal(
            order.text,
            order.receiveAddress,
            order.fee_rate
          )
          console.log('ordinal :>> ', response);
          if (response.status == 'failed') {
            // order.order_status = ORDER_STATUS_FAILED
            order.description = response.error
            break
          }

          order.ordinal = response.data

          order.order_status = ORDER_STATUS_ORDINAL_INSCRIBED
          order.description = 'Ordinal inscribed'
        case ORDER_STATUS_ORDINAL_INSCRIBED:
          const ordinalTx = await getTransaction(order.ordinal.reveal)
          if (!ordinalTx) {
            order.order_status = ORDER_STATUS_FAILED
            order.description = 'Inscribe ordinal transaction not exist'
            break
          } else if (!ordinalTx.status.confirmed) {
            break
          }

          order.spent_fee += order.ordinal.fees//token_transfer is not defined!!
          order.spent_fee += await getInscriptionSats(order.ordinal.inscription)

          order.order_status = ORDER_STATUS_CONFIRMED
          order.description = 'Confirmed'
          break
      }

      // order.remain_btc_balance = order.btc_balance - order.spent_fee
      await orderCollection.updateOne({ _id: order._id }, { $set: order })
    } catch (error) {
      order.status = ORDER_STATUS_FAILED
      order.description = error.toString()
      await orderCollection.updateOne({ _id: order._id }, { $set: order })
      console.error(error)
    }
  }
}

const main = async () => {
  try {
    const blockHeight = await bitcoin.blocks.getBlocksTipHeight()
    if (blockHeight > global.lastBlockHeight) {
      console.log('----new blockHeight-----------------------------', blockHeight);
      runWalletIndex() // ord wallet index
      // addCardinals(blockHeight)
      await orderMain()
    }
  } catch (error) {

  }
}

const init = () => {
  console.log('initializing app...');
  const cardinals = getCardinals()
  global.cardinals_count = cardinals.length
  console.log('cardinals_count=', global.cardinals_count);
}

async function appThread() {
  await sleep(1000)
  // init()
  while (true) {
    try {
      // console.log('-----start----');
      // console.time('main')
      await main()
      // console.timeEnd('main')
      // console.log('zzz...');
      await sleep(10000)
      // console.log('=====end==============================');
      // console.log('    ');
    } catch (error) {

    }
  }
}

async function test() {
  try {
    const blockHeight = await bitcoin.blocks.getBlocksTipHeight()
    console.log('blockHeight :>> ', blockHeight);
    const indexRunRet = await execSync(`ord ${CMD_PREFIX} --chain ${NETWORK} index`) // It's for ord version bellow 6.0
    console.log('indexRunRet :>> ', indexRunRet.toString());
    // const balance = await execSync(`ord wallet balance`)
    // console.log('balance :>> ', balance);
    const cardinals = execSync(`ord wallet cardinals`)
    console.log('cardinals :>> ', jsonParse(cardinals).length);
    const inscriptionRet = execSync(`ord wallet inscribe --dry-run --fee-rate 5 inscription.txt`)
    console.log('inscriptionRet :>> ', inscriptionRet.toString());
    // await sleep(1000);
    console.log('thread end');

  } catch (error) {
    console.error("APPTHREAD ERROR=========>", error)
  }
}

module.exports = {
  appThread,
  getCardinals
}