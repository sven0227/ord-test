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
} = require('./utils/config.js')
const { existsSync, mkdirSync, readFileSync, writeFileSync } = require('fs')
const { execSync } = require('child_process')
const MempoolJS = require('@mempool/mempool.js')
const { sleep } = require('./utils/utils')

const mempool = MempoolJS({
  hostname: 'mempool.space',
  network: 'mainnet',
  timeout: 60000,
})
const bitcoin = mempool.bitcoin

async function appThread() {
  try {
    const blockHeight = await bitcoin.blocks.getBlocksTipHeight()
    console.log('blockHeight :>> ', blockHeight);
    const indexRunRet = await execSync(`ord ${CMD_PREFIX} --chain ${NETWORK} index`) // It's for ord version bellow 6.0
    console.log('indexRunRet :>> ', indexRunRet);
    // const balance = await execSync(`ord wallet balance`)
    // console.log('balance :>> ', balance);
    const cardinals = await execSync(`ord wallet cardinals`)
    console.log('cardinals :>> ', cardinals);
    const inscriptionRet = await execSync(`ord wallet inscribe --dry-run --fee-rate 5 inscription.txt`)
    console.log('inscriptionRet :>> ', inscriptionRet);
    // await sleep(1000);
    console.log('thread end');

  } catch (error) {
    console.error("APPTHREAD ERROR=========>", error)
  }
}

appThread()