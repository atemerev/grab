const WS_ENDPOINT = 'wss://ws-feed.pro.coinbase.com'

const WS = require('ws')
const ReconnectingWebSocket = require('reconnecting-websocket')

const wsOptions = {
    WebSocket: WS
}

class Coinbase {
    constructor(symbols, callback) {
        let tickers = symbols.map((s) => s.replace('/', '-'))
        let subscribe = {
            'type': 'subscribe',
            'product_ids': tickers,
            'channels': ['full']
        }
        this.ws = new ReconnectingWebSocket(WS_ENDPOINT, [], wsOptions)
        this.ws.onopen = () => {
            console.log('Coinbase Pro connected.')
            let msg = JSON.stringify(subscribe)
            this.ws.send(msg)
        }
        this.ws.onmessage = (e) => {
            let obj = JSON.parse(e.data)
            if (obj.type && obj.type === 'match') {
                let symbol = obj.product_id.replace('-', '/')
                let price = parseFloat(obj.price)
                let size = parseFloat(obj.size)
                let time = new Date(obj.time).getTime()
                let side = obj.side
                let misc = {'sequence': obj.sequence}
                let trade = {
                    'time': time,
                    'venue': 'coinbasepro',
                    'symbol': symbol,
                    'side': side,
                    'price': price,
                    'size': size,
                    'misc': misc
                }
                let result = {'type': 'trades', 'data': [trade]}
                callback(result)
            }
        }
    }
}

module.exports = Coinbase