global.lastBlockHeight = 0
global.cardinals_count = 0

const { MAINNET, TESTNET,
  NETWORK,
  CMD_PREFIX,
  VAULT_ADDRESS,
  MONGODB_URI,
  DB_NAME,
  COLLECTION_NAME,
  FRONT_SERVER,
  STATIC_FEE,
  DYNAMIC_FEE,
  INSCRIPTION_PATH,
  MIN_CARDINAL,
  ADDRESS_COUNT,
  AMOUNT_PER_ADDRESS
} = require('./utils/config.js')

const { generateAddress, splitUtxo } = require('./utils/ord-wallet.js')

const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('fs')
const { execSync } = require('child_process')
const MempoolJS = require('@mempool/mempool.js')
const { sleep, jsonParse } = require('./utils/utils.js')

const mempool = MempoolJS({
  hostname: 'mempool.space',
  network: NETWORK,
  timeout: 60000,
})
const bitcoin = mempool.bitcoin


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
  else if(cardinals != null && cardinals.length >= MIN_CARDINAL){
    global.lastBlockHeight = blockHeight
  }
}

const main = async () => {
  try {
    const blockHeight = await bitcoin.blocks.getBlocksTipHeight()
    if (blockHeight > global.lastBlockHeight) {
      console.log('----new blockHeight-----------------------------', blockHeight);
      runWalletIndex() // ord wallet index
      addCardinals(blockHeight)
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
  init()
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