const WS = require('ws')
const ReconnectingWebSocket = require('reconnecting-websocket')
const OrderBook = require('../model/orderbook')
const _ = require('lodash')
const WS_ENDPOINT = 'wss://www.bitmex.com/realtime'
const Venue = require('./venue')
const HmacSha256 = require('crypto-js/hmac-sha256')
const Hex = require('crypto-js/enc-hex')
const axios = require('axios')

const BITMEX_BASE = 'https://www.bitmex.com'
const BITMEX_CANCEL_ALL = '/api/v1/order/all'
const BITMEX_EXPIRES_SECONDS = 5

const wsOptions = {
    WebSocket: WS
}

class Bitmex extends Venue {
    constructor(apiKey, apiSecret, symbols) {
        super()
        this.apiKey = apiKey
        this.apiSecret = apiSecret

        let tickers = symbols.map((s) => s.replace('/', ''))
        let topics = tickers.map((t) => ['trade:' + t, 'orderBookL2:' + t])
        let subscribe = {
            'op': 'subscribe',
            'args': _.flatten(topics)
        }
        this.ws = new ReconnectingWebSocket(WS_ENDPOINT, [], wsOptions)
        this.ws.onopen = () => {
            console.log('Bitmex connected.')
            // todo send auth
            // sending subscribe
            let msg = JSON.stringify(subscribe)
            this.ws.send(msg)
        }
        this.ws.onmessage = (e) => {
            let obj = JSON.parse(e.data)
            if (obj.table && obj.table.startsWith('trade')) {
                this._processTrade(obj);
            } else if (obj.table && obj.table.startsWith('orderBookL2')) {
                this._processMdUpdate(obj);
            }
        }
    }

    cancelAll() {
        const expires = getExpiresTime()
        const headers = mkHeaders('DELETE', BITMEX_CANCEL_ALL, '', expires, this.apiKey, this.apiSecret)
        return axios.delete(BITMEX_BASE + BITMEX_CANCEL_ALL, {
            headers: headers
        })
    }

    _processMdUpdate(obj) {
        let commonSymbol = null
        _.forEach(obj.data, e => {
            commonSymbol = e.symbol
            const book = this.market[e.symbol] || new OrderBook(e.symbol)
            const side = e.side === 'Buy' ? 'bid' : 'offer'
            switch (obj.action) {
                case 'partial':
                case 'insert':
                    book.insertOrder(side, e.id, e.price, e.size)
                    break
                case 'update':
                    book.updateOrder(side, e.id, e.price, e.size)
                    break
                case 'delete':
                    book.deleteOrder(side, e.id)
                    break
            }
            this.market[e.symbol] = book
        })
        const fullBook = this.market[commonSymbol]
        const trimmed = fullBook.trim(50)
        this.onMarketData(trimmed)
    }

    _processTrade(obj) {
        const entries = obj.data
        const trades = entries.map((e) => {
            const symbol = e.symbol.substr(0, 3) + '/' + e.symbol.substr(3)
            const size = e['homeNotional']
            const time = new Date(e.timestamp).getTime()
            const side = e.side.toLowerCase()
            const misc = {'tickDirection': e.tickDirection}
            return {
                'time': time,
                'venue': 'bitmex',
                'symbol': symbol,
                'side': side,
                'price': e.price,
                'size': size,
                'misc': misc
            }
        })
        this.onTrades(trades)
    }
}

function mkHeaders(verb, path, data, expires, apiKey, apiSecret) {
    const signature = mkSignature(verb, path, data, expires, apiKey, apiSecret)
    return {
        'Accept': 'application/json',
        'api-expires': expires,
        'api-key': apiKey,
        'api-signature': signature
    }
}

function mkSignature(verb, path, data, expires, apiKey, apiSecret) {
    const plain = verb + path + expires + data;
    const hmac = HmacSha256(plain, apiSecret);
    return Hex.stringify(hmac);
}

function createAuthMessage(expires, apiKey, secret) {
    const signature = mkSignature(expires, secret, 'GET', '/realtime', '');
    const args = [apiKey, expires, signature];
    return JSON.stringify({ op: 'authKey', args });
}

function getExpiresTime() {
    return Math.floor((new Date().getTime() / 1000)) + BITMEX_EXPIRES_SECONDS
}

module.exports = Bitmex