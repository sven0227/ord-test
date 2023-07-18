const express = require('express')
const parser = require('body-parser')
const cors = require('cors')
const { getCardinals } = require('./appthread')

const {
	existsSync,
	mkdirSync,
	readFileSync,
	writeFileSync,
} = require('fs')

const {
	execSync
} = require('child_process')

const {
	MAINNET,
	TESTNET,
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

const {
	inscribeOrdinal,
} = require('./utils/ord-wallet.js')

const { sleep, jsonParse } = require('./utils/utils.js')
const { join } = require('path')
const { error } = require('console')

const ERROR_UNKNOWN = 'Unknown error'
const ERROR_INVALID_PARAMTER = 'Invalid parameter'
const ERROR_INVALID_TXID = 'Invalid txid'
const ERROR_DUPLICATED_TXID = 'Duplicated txid'

const app = express()
app.use(parser.urlencoded({ extended: false }))
app.use(parser.json())
app.use(cors())

const DIR_PATH = `${INSCRIPTION_PATH}`

const inscribeTextOrdinal = async (text, destination, feeRate) => {
	try {
		const inscriptionPath = `${DIR_PATH}/inscription.txt`
		writeFileSync(inscriptionPath, text)

		return await inscribeOrdinal(inscriptionPath, destination, feeRate)
	} catch (error) {
		console.error(error)
	}
}

app.post('/textinscribe', async function (req, res) {
	try {
		res.setHeader('Access-Control-Allow-Origin', FRONT_SERVER)
		res.setHeader('Access-Control-Allow-Methods', 'POST')

		const { text, receiveAddress } = req.body

		if (!text || !receiveAddress) {
			res.send(JSON.stringify({ status: 'error', description: ERROR_INVALID_PARAMTER }))
			return
		}

		const feeRateURL = 'https://mempool.space/api/v1/fees/recommended'
		let feeRate = 1
		if (NETWORK === MAINNET) {
			try {
				const response = await fetch(feeRateURL);
				const data = await response.json();
				feeRate = data.halfHourFee
			} catch (error) {
				res.send(JSON.stringify({ status: 'error', description: 'FeeRate fetch error' }))
				return
			}
		}

		const result = await inscribeTextOrdinal(text, receiveAddress, feeRate)
		if (result) {
			res.send(JSON.stringify({ status: 'success', data: result }))
		}
		else {
			res.send(JSON.stringify({ status: 'error', description: "Inscribe Failed" }))
		}
	}
	catch {
		res.send(JSON.stringify({ status: 'error', description: ERROR_UNKNOWN }))
	}
})

app.get('/test', async function (req, res) {
	try {
		console.log('/test...........');
		res.setHeader('Access-Control-Allow-Origin', FRONT_SERVER)
		res.setHeader('Access-Control-Allow-Methods', 'GET')
		const cradinals = getCardinals()
		const appData = {
			newwork: NETWORK,
			cardinals_now: cradinals ? cradinals.length : 'error',
			cardinals_count: global.cardinals_count,
			app_status: 324
		}
		console.log('/test :>> ', appData);
		res.send(JSON.stringify({ status: 'success', data: { ...appData } }))
	}
	catch (error) {
		res.send(JSON.stringify({ status: 'error', description: error }))
	}
})

module.exports = {
	server: app,
}