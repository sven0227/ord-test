const TESTNET = 'testnet'
const MAINNET = 'mainnet'
const NETWORK = TESTNET

const WALLET_NAME = 'ord'
const TEMP_WALLET_NAME = 'temp'

const CMD_PREFIX = ''
const VAULT_ADDRESS =
  NETWORK === MAINNET ?
    'bc1pydgcpvd6mnayqr2j5gme52t955p06vnktx5eavggwj3meht3vqzsnquufz' :
    'tb1p6t6clw0geqhem86jjfclcd8z5zagd4w4d84gzqmn9rlgca59w03qk5qdpn'
const TEMP_ADDRESS =
  NETWORK === MAINNET ?
    'bc1qmzpte6hj2z6mzmsmqzg3edds32w03y0ecmg28u' :
    'tb1qskhwu8a088wmez90njdlfvarlpwmr87yv8psrh'


const MONGODB_URI = 'mongodb://127.0.0.1:27017'
const DB_NAME = 'ordinals'
const COLLECTION_NAME = 'order'

const FRONT_SERVER = '*'

// APP setting
const STATIC_FEE = 546
const DYNAMIC_FEE = 500

const MIN_CARDINAL = 10
const ADDRESS_COUNT = NETWORK === MAINNET ? 1 : MIN_CARDINAL
const AMOUNT_PER_ADDRESS = NETWORK === MAINNET ? 1 : 4000

const INSCRIPTION_PATH = 'inscription'

module.exports = {
  MAINNET,
  TESTNET,
  NETWORK,
  WALLET_NAME,
  TEMP_WALLET_NAME,
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
  AMOUNT_PER_ADDRESS,
}
