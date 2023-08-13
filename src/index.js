console.log("Start")
require('dotenv').config();
const { appThread } = require('./appthread')
const { server } = require('./server')

appThread()
server.listen(80)
console.log('Server started ...')
