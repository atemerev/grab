const Bitmex = require('./venues/bitmex')
const axios = require('axios')

const conf = {
    watcherApi: 'https://api02.ethercast.net/spread',
    spreadThreshold: 20,
    holdInterval: 15
}

let lastCancelTs = 0

const bitmex = new Bitmex(BITMEX_API_KEY, BITMEX_SECRET, ['XBT/USD'])

bitmex.onMarketData = (orderBook) => {
    let spread = orderBook.offers[0].price - orderBook.bids[0].price
    if (spread > conf.spreadThreshold) {
        console.log(spread)
        let ts = new Date().getTime()
        if (ts - lastCancelTs > (conf.holdInterval * 1000)) {
            lastCancelTs = ts
            console.log("Circuit breaker: spread is " + spread + ". Cancelling all orders!")
            bitmex.cancelAll().then((response) => {
                console.log('Orders cancelled: ' + JSON.stringify(response.data))
            }).catch((err) => {
                console.log('Error: ' + JSON.stringify(err.response.data))
            })
            notifyWatcher(spread)
        }
    }
}

function notifyWatcher(spread) {
    axios.post(conf.watcherApi, {spread: spread}, {
        auth: {
            username: 'user',
            password: 'FitoJabaX'
        }
    }).then((response) => {
        console.log('Notifier ok: ' + JSON.stringify(response.data))
    }).catch((err) => {
        console.log('Notifier error ' + err.response.status + ': ' + JSON.stringify(err.response.data))
    })
}