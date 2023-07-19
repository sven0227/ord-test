const {
  MongoClient
} = require('mongodb')

const {
  MONGODB_URI,
  DB_NAME,
  COLLECTION_NAME,
} = require('./utils/config')

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

const mongoClient = new MongoClient(MONGODB_URI)
// const mongodb = mongoClient.db(DB_NAME)
let orderCollection //= mongodb.collection(COLLECTION_NAME)

async function dbInit() {
  console.log('connectingdb...');
  await mongoClient.connect()
  global.mongodb = mongoClient.db(DB_NAME)
  global.orderCollection = global.mongodb.collection(COLLECTION_NAME)
  console.log('connected...');
}

async function insertOrder(order) {
  try {
    order.timestamp = Date.now()
    const result = await global.orderCollection.insertOne(order)
    order._id = result.insertedId

    order.order_status = ORDER_STATUS_TRANSACTION_CONFIRMED
    order.description = 'TX Confirmed'
    await global.orderCollection.updateOne({ _id: order._id }, { $set: order })

    return true
  } catch (error) {
    console.error(error)
  }
}

async function checkOrder(order) {
	if (!order.txid
		|| !order.feeRate
		|| !order.receiveAddress
		|| !order.text) {
		order.description = ERROR_INVALID_PARAMTER
		return
	}

	// if (!/^[a-fA-F0-9]{64}$/.test(order.txid)) {
	// 	order.description = ERROR_INVALID_TXID
	// 	return
	// }
	const txs = await global.orderCollection.find({ txid: order.txid }).toArray()

	if (txs.length) {
		order.description = ERROR_DUPLICATED_TXID
		return
	}

	return true
}

dbInit() 

module.exports = {
  checkOrder,
  insertOrder
}