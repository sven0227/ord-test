const { execSync } = require('child_process')

const { NETWORK, MAINNET, ORD_WALLET_NAME, TEMP_WALLET_NAME, CMD_PREFIX } = require('./config.js')
const { SUCCESS, FAILED } = require('./defines.js')
const { jsonParse, exeToString } = require('./utils.js')
const { logger, orderLog } = require('../logger.js')

const NO_CARDINALS_ERROR = 'error: wallet contains no cardinal utxos'
const DATABASE_LOCK_ERROR = 'error: Database already open. Cannot acquire lock.'

const INSUFFICIENT_FUND_ERROR = 'error code: -6error message:Insufficient funds'

////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////

async function inscribeOrdinal(inscriptionPath, destination, feeRate) {
  try {
    console.log("FFFFFFFFFFFFFFFFFFFF: ", feeRate)
    // console.log("inscribling =============>", `ord ${CMD_PREFIX} --chain ${NETWORK} --wallet ${WALLET_NAME} wallet inscribe --destination ${destination} --fee-rate ${feeRate} ${inscriptionPath}`);
    // console.log("inscribling =============>")
    const cmd = `ord ${CMD_PREFIX} --chain ${NETWORK} --wallet ${ORD_WALLET_NAME} wallet inscribe --destination ${destination} --fee-rate ${feeRate} ${inscriptionPath}`
    const execOut = execSync(cmd)
    const inscribeInfo = jsonParse(execOut)
    // console.log('inscribeInfo :>> ', inscribeInfo);
    return { status: SUCCESS, data: inscribeInfo }
  } catch (error) {
    const { status, signal, output, pid, stdout, stderr } = error
    // console.log('-----------inscribling failied', exeToString(stderr));
    return { status: FAILED, error: exeToString(stderr) }
  }
}

async function sendOrdinal(inscriptionId, address, feeRate) {
  try {
    const execOut = execSync(
      `ord ${CMD_PREFIX} --chain ${NETWORK} --wallet ${ORD_WALLET_NAME} wallet send  --fee-rate ${feeRate} ${address} ${inscriptionId}`,
    )
    const txid = execOut.toString().replace(/\n/g, '')

    return txid
  } catch (error) {
    console.error(error)
  }
}

const string2json = string => {
  try {
    return JSON.parse(string.replace(/\\n/g, ''))
  } catch (error) {}
}

function generateAddress(addressCount) {
  try {
    const addresses = []
    for (let index = 0; index < addressCount; index++) {
      const cmd =
        NETWORK === MAINNET
          ? `ord --wallet ${ORD_WALLET_NAME} wallet receive`
          : `ord --${NETWORK} --wallet ${ORD_WALLET_NAME} wallet receive`
      const execOut = execSync(cmd)
      const address = string2json(execOut.toString()).address

      addresses.push(address)
      // console.log(address)
    }
    return addresses
  } catch (error) {
    console.error(error)
  }
}

function splitUtxo(addresses, amount) {
  try {
    const chain = NETWORK === 'mainnet' ? 'main' : 'test'
    const data = {}
    for (const address of addresses) {
      data[address] = amount / 10 ** 8
    }

    // console.log(`bitcoin-cli -chain=${NETWORK === 'mainnet' ? 'main' : 'test'} -rpcwallet=${TEMP_WALLET_NAME} sendmany '' '${JSON.stringify(data)}'`);
    const balance = execSync(`bitcoin-cli -chain=${chain} -rpcwallet=${TEMP_WALLET_NAME} getbalance`)
    console.log('temp wallet balance=', jsonParse(balance) * 1e8, 'sats')
    console.log('need wallet balance=', addresses.length * amount, 'sats')
    logger.info('temp wallet balance=', jsonParse(balance) * 1e8, 'sats', ORD_WALLET_NAME, TEMP_WALLET_NAME)
    const cmd = `bitcoin-cli -chain=${chain} -rpcwallet=${TEMP_WALLET_NAME} sendmany '' '${JSON.stringify(data)}'`
    logger.info('excuting sendmany===========>', cmd)
    const execOut = execSync(cmd)
    logger.info('success sendmany')
    return { status: SUCCESS, data: execOut.toString() }
  } catch (error) {
    logger.error('  failed sendmany', exeToString(error))
    return { status: FAILED, error: exeToString(error.stderr) }
  }
}

module.exports = {
  inscribeOrdinal,
  sendOrdinal,
  generateAddress,
  splitUtxo,
}
