let OrderBook = require('../model/orderbook')

class Venue {
    constructor() {
        this.market = {}
        this.trades = []
    }

    onMarketData(orderBook) {}
    onTrades(trades) {}
}

module.exports = Venue