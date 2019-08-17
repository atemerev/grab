const Bitmex = require('./venues/bitmex')
const Bitstamp = require('./venues/bitstamp')
const Coinbase = require('./venues/coinbase')
const Kraken = require('./venues/kraken')

const bitmex = new Bitmex('', '', ['XBT/USD'])
const bitstamp = new Bitstamp(['BTC/USD'])
const coinbase = new Coinbase(['BTC/USD'])
const kraken = new Kraken(['XBT/USD'])

const tradeLogger = function (name) {
    return function (trades) {
        for (let trade of trades) {
            console.log(name + ': ' + JSON.stringify(trade))
        }
    }
}

bitmex.onTrades = tradeLogger('bitmex')
bitstamp.onTrades = tradeLogger('bitstamp')
coinbase.onTrades = tradeLogger('coinbase')
kraken.onTrades = tradeLogger('kraken')

