// "use strict";

// const ccxt = require('../../ccxt.js')
import ccxt from '../../ccxt'

;(async () => {
    
    // const coinsbit = new ccxt.coinsbit()
    
    const coinsbit = new ccxt.coinsbit({
        "apiKey": "95e892b1866e7bd38642d747d237b597",
        "secret": "52d4683f08220cce6ffb17e889a757d6",
    })
    // PUBLIC
    // const a = await coinsbit.fetchOrderBook('ETH/BTC')
    const a = await coinsbit.fetchTrades('ETH/BTC', 1, 5)
    // const a = await coinsbit.fetchTicker('ETH/BTC')
    // const a = await coinsbit.fetchTickers()
    // const a = await coinsbit.fetchMarkets()
    
    // PRIVATE
    // symbol, 'market', 'sell', amount
    // const a = await coinsbit.createOrder('ETH/BTC', 'limit', 'buy', '1000', '0.0112233')
    // const a = await coinsbit.fetchOrders('ETH/BTC', 0, 50)
    // const a = await coinsbit.fetchOrder(689083)
    // const a = await coinsbit.fetchBalance()
  // const a = await coinsbit.fetchMyTrades('ETH/BTC')
  // const a = await coinsbit.cancelOrder(4560936, 'ETH/BTC')
    // console.warn(coinsbit.currencies)
    // console.log('markets::', coinsbit.markets)
    console.log('a', a)


    // const binance = new ccxt.binance()
    // const b = await binance.fetchBidsAsks('ETH/BTC')
    // console.log(b)

    // const bytetrade = new ccxt.bytetrade()
    // const c = await bytetrade.fetchBidsAsks('ETH/BTC')
    // console.log(c)



    // fetch(
    //     "https://coinsbit.io/api/v1/public/ticker?market=ETH_BTC", 
    //     { "credentials": "omit", "headers": 
    //     { "accept": "*/*", "accept-language": "en-US,en;q=0.9,uk-UA;q=0.8,uk;q=0.7,ru-RU;q=0.6,ru;q=0.5", "cache-control": "no-cache", "pragma": "no-cache", "sec-fetch-mode": "cors", "sec-fetch-site": "cross-site" }, "referrer": "http://localhost:1234/", "referrerPolicy": "no-referrer-when-downgrade", "body": null, "method": "GET", "mode": "cors" }
    // )
    // .then(r => r.json())
    // .then(r => console.log(r))
})()