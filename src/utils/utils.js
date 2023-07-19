const sleep = (timeout) => {
  return new Promise((res, rej) => {
    setTimeout(() => {
      res(true);
    }, timeout);
  })
}

const jsonParse = (val) => {
  return JSON.parse(val.toString().replace(/\n/g, ''))
}

const exeToString = (val) => {
  return (val?.toString().replace(/\n/g, ''))
}

module.exports = {
  sleep,
  jsonParse,
  exeToString
}