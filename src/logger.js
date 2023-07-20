const { NETWORK } = require('./utils/config')
const log4js = require('log4js')
const logger = log4js.getLogger('cardinal')
const orderLog = log4js.getLogger('order')
logger.level = 'debug' // Set log level to debug
orderLog.level = 'debug' // Set log level to debug
log4js.configure({
  appenders: {
    console: { type: 'console', filename: 'cardinal.log' },
    file: { type: 'file', filename: `${NETWORK}.log` },
  },
  categories: { default: { appenders: ['console', 'file'], level: 'debug' } },
})

module.exports = {
  logger,
  orderLog,
}
