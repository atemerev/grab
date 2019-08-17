const WS_ENDPOINT = 'wss://ws.kraken.com'

const WS = require('ws')
const ReconnectingWebSocket = require('reconnecting-websocket')

const wsOptions = {
    WebSocket: WS
}

class Kraken {
    constructor(symbols, callback) {
        let subscribe = {
            'event': 'subscribe',
            'pair': symbols,
            'subscription': {'name': 'trade'}
        }
        this.ws = new ReconnectingWebSocket(WS_ENDPOINT, [], wsOptions)
        this.ws.onopen = () => {
            let msg = JSON.stringify(subscribe)
            this.ws.send(msg)
        }
        this.ws.onmessage = (e) => {
            let obj = JSON.parse(e.data)
            if (Array.isArray(obj)) {
                let entries = obj[1]
                let symbol = obj[3]
                let trades = entries.map((e) => {
                    let price = parseFloat(e[0])
                    let size = parseFloat(e[1])
                    let time = Math.trunc(parseFloat(e[2]) * 1000)
                    let side = e[3] === 'b' ? 'buy' : 'sell'
                    let misc = {'triggerType': e[4] === 'm' ? 'market' : 'limit'}
                    return {
                        'time': time,
                        'venue': 'kraken',
                        'symbol': symbol,
                        'side': side,
                        'price': price,
                        'size': size,
                        'misc': misc
                    }
                })
                let result = {'type': 'trades', 'data': trades}
                callback(result)
            }
        }
    }
}

module.exports = Kraken