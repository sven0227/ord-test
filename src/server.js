const express = require('express')
const parser = require('body-parser')
const cors = require('cors')
const { getCardinals } = require('./appthread')

const { MAINNET, TESTNET, NETWORK, CMD_PREFIX, FRONT_SERVER, ORD_WALLET_ADDRESS } = require('./utils/config.js')

const log4js = require('log4js')
const logger = log4js.getLogger('API-' + NETWORK)
logger.level = 'debug' // Set log level to debug

const { sleep, jsonParse } = require('./utils/utils.js')
const { join } = require('path')

const ORDINAL_TYPE_TEXT = 0
const ORDINAL_TYPE_BRC20_DEPLOY = 1
const ORDINAL_TYPE_BRC20_MINT = 2
const ORDINAL_TYPE_BRC20_TRANSFER = 3

const ERROR_UNKNOWN = 'Unknown error'
const ERROR_INVALID_PARAMTER = 'Invalid parameter'
const ERROR_INVALID_TXID = 'Invalid txid'
const ERROR_DUPLICATED_TXID = 'Duplicated txid'

const app = express()
app.use(parser.urlencoded({ extended: false }))
app.use(parser.json())
app.use(cors())

const { checkOrder, insertOrder } = require('./mongodb')
const { SUCCESS, FAILED } = require('./utils/defines')

app.post('/textinscribe', async function (req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', FRONT_SERVER)
    res.setHeader('Access-Control-Allow-Methods', 'POST')
    console.log('/textinscribe')
    const { text, receiveAddress } = req.body

    if (!text || !receiveAddress) {
      res.send(JSON.stringify({ status: FAILED, description: ERROR_INVALID_PARAMTER }))
      return
    }

    const data = {
      network: NETWORK,
      cardinals_count: global.cardinals_count,
      app_status: 324,
    }

    const feeRateURL = 'https://mempool.space/api/v1/fees/recommended'
    let feeRate = 1
    if (NETWORK === MAINNET) {
      try {
        const response = await fetch(feeRateURL)
        const data = await response.json()
        feeRate = data.halfHourFee
      } catch (error) {
        res.send(JSON.stringify({ status: FAILED, description: 'FeeRate fetch error' }))
        return
      }
    }

    const result = await inscribeTextOrdinal(text, receiveAddress, feeRate)
    if (result) {
      res.send(JSON.stringify({ status: SUCCESS, data: result }))
    } else {
      res.send(JSON.stringify({ status: FAILED, description: 'Inscribe Failed', data }))
    }
  } catch {
    res.send(JSON.stringify({ status: FAILED, description: ERROR_UNKNOWN, data }))
  }
})

app.post('/inscribe/text', async function (req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', FRONT_SERVER)
    res.setHeader('Access-Control-Allow-Methods', 'POST')

    const order = req.body
    if (!(await checkOrder(order))) {
      res.send(JSON.stringify({ status: FAILED, description: order.description }))
      return
    }

    order.ordinal_type = ORDINAL_TYPE_TEXT

    if (await insertOrder(order)) {
      res.send(JSON.stringify({ status: SUCCESS, data: order }))
      logger.fatal('New order added...')
      global.new_order_detected = true
    } else {
      logger.error('New order adding Failed...')
      res.send(JSON.stringify({ status: FAILED, description: ERROR_UNKNOWN }))
    }
  } catch (error) {
    logger.error('New order adding Failed...')
    res.send(JSON.stringify({ status: FAILED, description: ERROR_UNKNOWN }))
  }
})

app.get('/test', async function (req, res) {
  try {
    // console.log('/test...........');
    res.setHeader('Access-Control-Allow-Origin', FRONT_SERVER)
    res.setHeader('Access-Control-Allow-Methods', 'GET')
    const cradinals = getCardinals()
    const appData = {
      network: NETWORK,
      cardinals_now: cradinals ? cradinals.length : FAILED,
      cardinals_count: global.cardinals_count,
      app_status: 324,
    }
    // console.log('/test :>> ', appData);
    res.send(JSON.stringify({ status: SUCCESS, data: { ...appData } }))
  } catch (error) {
    res.send(JSON.stringify({ status: FAILED, description: error }))
  }
})

app.get('/getvaultaddress', async function (req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', FRONT_SERVER)
    res.setHeader('Access-Control-Allow-Methods', 'GET')

    res.send(JSON.stringify({ status: SUCCESS, data:  ORD_WALLET_ADDRESS}))
  } catch (error) {
    console.error(error)
    res.send(JSON.stringify({ status: FAILED, description: ERROR_UNKNOWN }))
  }
})

app.post('/getorder', async function (req, res) {
  try {
    res.setHeader('Access-Control-Allow-Origin', FRONT_SERVER)
    res.setHeader('Access-Control-Allow-Methods', 'POST')

    const orders = await orderCollection.find(req.body).toArray()

    res.send(JSON.stringify({ status: SUCCESS, data: orders }))
  } catch (error) {
    console.error(error)
    res.send(JSON.stringify({ status: FAILED, description: ERROR_UNKNOWN }))
  }
})

module.exports = {
  server: app,
}
