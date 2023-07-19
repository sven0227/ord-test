const TESTNET = 'testnet'
const MAINNET = 'mainnet'
const NETWORK = process.env.NETWORK

const WALLET_NAME = 'ord'
const TEMP_WALLET_NAME = process.env.TEMP_WALLET_NAME

const CMD_PREFIX = ''
const FRONT_SERVER = '*'

// APP setting
const MIN_CARDINAL = NETWORK === MAINNET ? process.env.MIN_CARDINAL_MAINNET : process.env.MIN_CARDINAL_TESTNET
const ADDRESS_COUNT =
  NETWORK === MAINNET ? process.env.CARDINAL_ADD_COUNT_MAINNET : process.env.CARDINAL_ADD_COUNT_TESTNET
const AMOUNT_PER_ADDRESS =
  NETWORK === MAINNET ? process.env.AMOUNT_PER_ADDRESS_MAINNET : process.env.AMOUNT_PER_ADDRESS_TESTNET

const INSCRIPTION_PATH = 'inscription'

//mongodb setting
const MONGODB_URI = `mongodb://${process.env.MONGODB_USERNAME}:${process.env.MONGODB_PASSWORD}@127.0.0.1:3306/?authSource=admin&readPreference=primary&appname=MongoDB%20Compass&ssl=false`
const DB_NAME = 'ordinals'
const COLLECTION_NAME = 'order'

module.exports = {
  MAINNET,
  TESTNET,
  NETWORK,
  WALLET_NAME,
  TEMP_WALLET_NAME,
  CMD_PREFIX,
  FRONT_SERVER,
  INSCRIPTION_PATH,
  MIN_CARDINAL,
  ADDRESS_COUNT,
  AMOUNT_PER_ADDRESS,
  MONGODB_URI,
  DB_NAME,
  COLLECTION_NAME,
}
