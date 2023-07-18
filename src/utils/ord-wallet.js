const {
  execSync
} = require('child_process')

const {
  NETWORK,
  MAINNET,
  WALLET_NAME,
  TEMP_WALLET_NAME,
  CMD_PREFIX,
} = require('./config.js');
const { jsonParse } = require('./utils.js');

////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////

async function inscribeOrdinal(inscriptionPath, destination, feeRate) {
  try {
    console.log("inscribling =============>", `ord ${CMD_PREFIX} --chain ${NETWORK} --wallet ${WALLET_NAME} wallet inscribe --destination ${destination} --fee-rate ${feeRate} ${inscriptionPath}`);
    const execOut = execSync(`ord ${CMD_PREFIX} --chain ${NETWORK} --wallet ${WALLET_NAME} wallet inscribe --destination ${destination} --fee-rate ${feeRate} ${inscriptionPath}`)
    const inscribeInfo = JSON.parse(execOut.toString().replace(/\n/g, ''))
    console.log('inscribeInfo :>> ', inscribeInfo);
    return inscribeInfo
  } catch (error) {
    console.error(error)
  }
}

async function sendOrdinal(inscriptionId, address, feeRate) {
  try {
    const execOut = execSync(`ord ${CMD_PREFIX} --chain ${NETWORK} --wallet ${WALLET_NAME} wallet send  --fee-rate ${feeRate} ${address} ${inscriptionId}`)
    const txid = execOut.toString().replace(/\n/g, '')

    return txid
  } catch (error) {
    console.error(error)
  }
}


const string2json = (string) => {
  try {
    return JSON.parse(string.replace(/\\n/g, ''))
  } catch (error) {
  }
}

function generateAddress(addressCount) {
  try {
    const addresses = []
    for (let index = 0; index < addressCount; index++) {
      const cmd =
        NETWORK === MAINNET ?
          `ord --wallet ${WALLET_NAME} wallet receive` :
          `ord --${NETWORK} --wallet ${WALLET_NAME} wallet receive`
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
    const balance = execSync(`bitcoin-cli -chain=${chain} -rpcwallet=temp getbalance`)
    console.log('temp wallet balance=', jsonParse(balance) * 1e8);
    const cmd = `bitcoin-cli -chain=${chain} -rpcwallet=${TEMP_WALLET_NAME} sendmany '' '${JSON.stringify(data)}' '' '["bc1pnz95rrkg9j64p05vct2lf5hvhmke6d3apkwfsjly28xy6ermystqm7hk4k"]' true '' 'UNSET' 9 true`
    console.log('cmd :>> ', cmd);
    const execOut = execSync(`bitcoin-cli -chain=${chain} -rpcwallet=${TEMP_WALLET_NAME} sendmany '' '${JSON.stringify(data)}' `)
    // console.log(execOut.toString())
    return true
  } catch (error) {
    console.error('  failed sendmany')
    // console.error(error)
    return false
  }
}


module.exports = {
  inscribeOrdinal,
  sendOrdinal,
  generateAddress,
  splitUtxo,
}
