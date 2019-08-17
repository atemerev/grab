const WS_ENDPOINT = 'wss://ws.bitstamp.net'

const WS = require('ws')
const ReconnectingWebSocket = require('reconnecting-websocket')

const wsOptions = {
    WebSocket: WS
}

class Bitstamp {
    constructor(symbols, callback) {
        let subscribes = symbols.map((s) => {
            let ticker = s.replace('/', '').toLowerCase()
            return {
                'event': 'bts:subscribe',
                'data': {
                    'channel': 'live_trades_' + ticker
                }
            }
        })
        this.ws = new ReconnectingWebSocket(WS_ENDPOINT, [], wsOptions)
        this.ws.onopen =() => {
            console.log('Bitstamp connected.')
            subscribes.forEach((s) => {
                let msg = JSON.stringify(s)
                this.ws.send(msg)
            })
        }
        let self = this
        this.ws.onmessage = (e) => {
            let obj = JSON.parse(e.data)
            if (obj.event && obj.event === 'trade') {
                let ticker = obj.channel.replace('live_trades_', '')
                let symbol = (ticker.substr(0, 3) + '/' + ticker.substr(3, ticker.length - 3)).toUpperCase()
                let price = obj.data.price
                let size = obj.data.amount
                let microTs = obj.data.microtimestamp
                let time = microTs.substr(0, microTs.length - 3)
                let side = obj.data.type === 1 ? 'sell' : 'buy'
                let misc = {'id': obj.data.id}
                let trade = {
                    'time': time,
                    'venue': 'bitstamp',
                    'symbol': symbol,
                    'side': side,
                    'price': price,
                    'size': size,
                    'misc': misc
                }
                self.onTrades([trade])
            }
        }
    }
}

module.exports = Bitstamp