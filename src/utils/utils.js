const sleep = (timeout) => {
  return new Promise((res, rej) => {
    setTimeout(() => {
      res(true);
    }, timeout);
  })
}

module.exports = {
  sleep
}