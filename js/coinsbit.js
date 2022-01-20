
'use strict';

//  ---------------------------------------------------------------------------

const Exchange = require ('./base/Exchange');
// const { ExchangeError, ArgumentsRequired, ExchangeNotAvailable, InsufficientFunds, OrderNotFound, InvalidOrder, DDoSProtection, InvalidNonce, AuthenticationError, InvalidAddress } = require ('./base/errors');
// const { ROUND } = require ('./base/functions/number');

//  ---------------------------------------------------------------------------

module.exports = class coinsbit extends Exchange {
    describe () {
        return this.deepExtend (super.describe (), {
            'id': 'coinsbit',
            'name': 'Coinsbit',
            'country': ['US', 'EU', 'CN', 'RU'],
            'rateLimit': 1000,
            'timeout': 10000,
            'version': '1',
            'comment': 'This comment is optional',
            'has': {
                'CORS': false,
                'createMarketOrder': false, // does not allow create new "market" order, only "limit"

                // public
                'fetchOrderBook': true,
                'fetchCurrencies': false, // TODO: implement on backend
                'fetchMarkets': false,
                'fetchTicker': false,
                'fetchTickers': false,
                'fetchTrades': false,
                // 'createDepositAddress': false,
                // 'fetchDepositAddress': false,
                // 'fetchOHLCV': false,
                // 'fetchStatus': 'emulated',
                // 'fetchBidsAsks': false,

                // private
                'cancelOrder': false, // private
                'createOrder': false, // private
                'fetchOrder': false, // private
                'fetchOrders': false, // private
                'fetchBalance': false, // private
                'fetchMyTrades': false, // private
                // 'fetchClosedOrders': false, // private
                // 'fetchOpenOrders': false, // private
                // 'deposit': false, // private
                // 'withdraw': false, // private

            },
            // 'timeframes': {                     // empty if the exchange !has.fetchOHLCV
            //     '1m': '1minute',
            //     '1h': '1hour',
            //     '1d': '1day',
            //     '1M': '1month',
            //     '1y': '1year',
            // },
            'apiString': 'api/v1',
            'urls': {
                'logo': 'https://coinsbit.io/img/logoCoinsbitDark.svg',
                'api': 'http://testsite-profit.pp.ua/',
                'www': 'http://testsite-profit.pp.ua/',
                'doc': [
                    'https://www.example.com/docs/api',
                    'https://www.example.com/docs/howto',
                    'https://github.com/example/docs',
                ],
            },
            'api': {
                'public': {
                    'get': [
                        'markets',
                        'tickers',
                        'ticker',
                        'book',
                        'history',
                        'history/result',
                        'products',
                        'symbols',
                        'depth/result',
                    ],
                },
                'order': {
                    'post': [
                        'new',
                        'cancel',
                        'orders', // opened orders
                    ],
                },
                'account': {
                    'post': [
                        'balances',
                        'balance',
                        'order', // (one last trade) // TODO: should return all latest trades for order
                        'order_history', // list of my trades // history traded trades
                        'trades',
                        'order_history_list',
                    ],
                },
            },
        });
    }

    sign (path, api = 'public', method = 'GET', params = {}, headers = {}, body = {}) {
        let requestPath = this.apiString + '/' + api + '/' + path;
        const baseUrl = this.urls['api'];
        let url = baseUrl + requestPath;
        const apiWithBodyParams = {
            'public': false, // params in url
            'order': true,
            'account': true,
        };
        if (this.safeValue (apiWithBodyParams, api)) {
            body = this.extend (body, params);
        } else {
            url += '?' + this.urlencode (params);
        }
        // protected api with authentication
        if (api === 'order' || api === 'account') {
            // overwrite for orders request
            if (path === 'orders') {
                requestPath = this.apiString + '/orders';
                // should end with /api/v1/orders
                url = baseUrl + requestPath;
            }
            const authData = {
                'request': '/' + requestPath,
                'nonce': this.milliseconds ().toString (),
            };
            body = this.extend (body, authData);
            const payload = this.stringToBase64 (JSON.stringify (body));
            const signature = this.hmac (this.encode (payload), this.encode (this.secret), 'sha512');
            headers['Content-type'] = 'application/json';
            headers['X-TXC-APIKEY'] = this.apiKey;
            headers['X-TXC-PAYLOAD'] = payload;
            headers['X-TXC-SIGNATURE'] = signature;
        }
        body = Object.keys (body).length ? JSON.stringify (body) : undefined;
        const obj = {
            'url': url,
            'method': method,
            'body': body,
            'headers': headers,
        };
        return obj;
    }

    async fetchBalance (params) {
        const resp = await this.accountPostBalances ();
        const data = this.safeValue (resp, 'result');
        const tickers = Object.keys (data);
        const replacedKeys = {};
        for (let i = 0; i < tickers.length; i++) {
            const obj = {};
            obj['used'] = this.safeFloat (data[tickers[i]], 'freeze');
            obj['free'] = this.safeFloat (data[tickers[i]], 'available');
            replacedKeys[tickers[i]] = obj;
        }
        const balance = this.parseBalance (replacedKeys);
        return balance;
    }

    parseOrder (result) {
        // const result = this.safeValue (response, 'result');
        // "orderId": 25749,
        // "market": "ETH_BTC",
        // "price": "0.1",
        // "side": "sell",
        // "type": "limit",
        // "timestamp": 1537535284.828868,
        // "dealMoney": "0",
        // "dealStock": "0",
        // "amount": "0.1",
        // "takerFee": "0.002",
        // "makerFee": "0.002",
        // "left": "0.1",
        // "dealFee": "0"
        // return resp.result;
        const marketId = this.safeValue (result, 'market');
        const symbol = this.findSymbol (marketId);
        const orderId = this.safeValue2 (result, 'orderId', 'id');
        const respTimestamp = this.safeTimestamp (result, 'timestamp');
        const respType = this.safeString (result, 'type');
        const respSide = this.safeString (result, 'side');
        const respPrice = this.safeFloat (result, 'price');
        const respAmount = this.safeFloat (result, 'amount');
        const respRemaining = this.safeFloat (result, 'left'); // TODO: check
        const respCost = this.safeFloat (result, 'dealFee');
        const respRate = this.safeFloat (result, 'takerFee');
        const filled = respAmount - respRemaining;
        // debugger;
        return {
            'id': orderId, // string
            'datetime': this.iso8601 (respTimestamp), // '2017-08-17 12:42:48.000', // ISO8601 datetime of 'timestamp' with milliseconds
            'timestamp': respTimestamp, // order placing/opening Unix timestamp in milliseconds
            'lastTradeTimestamp': undefined, // Unix timestamp of the most recent trade on this order
            'status': 'open',         // 'open', 'closed', 'canceled' // TODO: canceled do not exists :(
            'symbol': symbol,      // symbol
            'type': respType,        // 'market', 'limit'
            'side': respSide,          // 'buy', 'sell'
            'price': respPrice,    // float price in quote currency
            'amount': respAmount,           // ordered amount of base currency
            'filled': filled,           // filled amount of base currency
            'remaining': respRemaining,           // remaining amount to fill
            'cost': filled * respPrice,   // 'filled' * 'price' (filling price used where available)
            'trades': [
                //
            ],         // a list of order trades/executions
            'fee': {                      // fee info, if available
                'currency': 'BTC',        // which currency the fee is (usually quote)
                'cost': respCost,           // the fee amount in that currency
                'rate': respRate,            // the fee rate (if available)
            },
            'info': result,              // the original unparsed order structure as is
        };
    }

    async createOrder (symbol, type, side, amount, price = undefined, params = undefined) {
        await this.loadMarkets ();
        if (type === 'market') {
            throw new Error ('Only "limit" market allowed.');
        }
        const market = this.market (symbol);
        const resp = await this.orderPostNew ({
            'market': market['id'],
            'side': side,
            'amount': this.amountToPrecision (market['symbol'], amount),
            'price': this.priceToPrecision (market['symbol'], price),
        });
        const result = this.safeValue (resp, 'result');
        const parsedOrder = this.parseOrder (result);
        return parsedOrder;
    }

    async cancelOrder (id, symbol = undefined, params = undefined) {
        await this.loadMarkets ();
        const market = this.market (symbol);
        const resp = this.orderPostCancel ({
            'market': market['id'], // "ETH_BTC",
            'orderId': id,
        });
        const result = this.safeValue (resp, 'result');
        const parsedOrder = this.parseOrder (result);
        return parsedOrder;
    }

    async fetchOrders (symbol, since, limit, params) {
        await this.loadMarkets ();
        const market = this.market (symbol);
        const resp = await this.orderPostOrders ({
            'market': market['id'],
            'offset': since, // optional; default value 0
            'limit': limit, // optional; default value 50
        });
        const orders = [];
        const result = this.safeValue (this.safeValue (resp, 'result'), 'result');
        for (let i = 0; i < result.length; i++) {
            const notParsed = this.safeValue (result, i);
            const parsedOrder = this.parseOrder (notParsed);
            orders.push (parsedOrder);
        }
        // replace result with parsed orders
        resp.result = orders;
        return resp;
    }

    // TODO: account/order works wrong
    async fetchOrder (id, symbol = undefined, params = {}) {
        // {
        //     "orderId": id,
        //     "offset": 10, //optional; default value 0
        //     "limit": 100// optional; default value 50
        // }
        params['orderId'] = id;
        const resp = await this.accountPostOrder (params);
        console.log (resp);
    }

    async fetchOrderBook (symbol, limit = undefined, params = {}) {
        await this.loadMarkets ();
        const market = this.market (symbol);
        const resp1 = await this.publicGetBook ({
            'market': market['id'],
            'side': 'sell',
            'offset': 0,
            'limit': limit,
        });
        const resp2 = await this.publicGetBook ({
            'market': market['id'],
            'side': 'buy',
            'offset': 0,
            'limit': limit,
        });
        const sellSide = this.safeValue (this.safeValue (resp1, 'result'), 'orders');
        const buySide = this.safeValue (this.safeValue (resp2, 'result'), 'orders');
        const bidsAndAsks = {
            'bids': [],
            'asks': [],
        };
        if (buySide) {
            for (let i = 0; i < buySide.length; i++) {
                const price = this.safeFloat (buySide[i], 'price');
                const amount = this.safeFloat (buySide[i], 'amount');
                bidsAndAsks['bids'].push ([price, amount]);
            }
        }
        if (sellSide) {
            for (let i = 0; i < sellSide.length; i++) {
                const price = this.safeFloat (sellSide[i], 'price');
                const amount = this.safeFloat (sellSide[i], 'amount');
                bidsAndAsks['asks'].push ([price, amount]);
            }
        }
        const book = this.parseOrderBook (bidsAndAsks);
        return book;
    }

    // TODO: this is orders, refactor to trades !!!
    async fetchTrades (symbol, since, limit, params) {
        await this.loadMarkets ();
        const options = {};
        const market = this.market (symbol);
        options['market'] = market['id'];
        options['since'] = since; // TODO: refactor not from lastId but from timestamp
        if (limit) {
            options['limit'] = limit;
        }
        const data = await this.publicGetHistoryResult (options);
        return this.parseTrades (data, market, since, limit);
    }

    // TODO: refactor for trades, not for orders
    async fetchMyTrades (symbol, since = undefined, limit = undefined, params = {}) {
        await this.loadMarkets ();
        const resp = await this.accountPostOrderHistoryList ({
            'offset': since,
            'limit': limit,
        });
        const result = this.safeValue (this.safeValue (resp, 'result'), 'records');
        const market = this.market (symbol);
        return this.parseTrades (result, market, since, limit);
    }

    parseTrade (trade, market = undefined) {
        // TODO: parse
        return {
            'info': trade,                  // the original decoded JSON as is
            'id': '12345-67890:09876/54321', // string trade id
            'timestamp': 1502962946216,            // Unix timestamp in milliseconds
            'datetime': '2017-08-17 12:42:48.000', // ISO8601 datetime with milliseconds
            'symbol': 'ETH/BTC',                 // symbol
            'order': '12345-67890:09876/54321', // string order id or undefined/None/null
            'type': 'limit',                   // order type, 'market', 'limit' or undefined/None/null
            'side': 'buy',                     // direction of the trade, 'buy' or 'sell'
            'price': 0.06917684,               // float price in quote currency
            'amount': 1.5,                      // amount of base currency
        };
        //  {
        // 'info': { ... },                    // the original decoded JSON as is
        // 'id': '12345-67890:09876/54321',  // string trade id
        // 'timestamp': 1502962946216,              // Unix timestamp in milliseconds
        // 'datetime': '2017-08-17 12:42:48.000',  // ISO8601 datetime with milliseconds
        // 'symbol': 'ETH/BTC',                  // symbol
        // 'order': '12345-67890:09876/54321',  // string order id or undefined/None/null
        // 'type': 'limit',                    // order type, 'market', 'limit' or undefined/None/null
        // 'side': 'buy',                      // direction of the trade, 'buy' or 'sell'
        // // 'takerOrMaker': 'taker',                    // string, 'taker' or 'maker'
        // 'price': 0.06917684,                 // float price in quote currency
        // 'amount': 1.5,                        // amount of base currency
        // // 'cost': 0.10376526,                 // total cost (including fees), `price * amount`
        // // 'fee': {                           // provided by exchange or calculated by ccxt
        // // 'cost': 0.0015,                        // float
        // // 'currency': 'ETH',                      // usually base currency for buys, quote currency for sells
        // // 'rate': 0.002,                          // the fee rate (if available)
        //  },
        //  }
    }

    parseTicker (symbol, data) {
        const ask = this.safeFloat (data, 'ask');
        const bid = this.safeFloat (data, 'bid');
        const last = this.safeFloat (data, 'last');
        const open = this.safeFloat (data, 'open');
        const high = this.safeFloat (data, 'high');
        const low = this.safeFloat (data, 'low');
        const volume = this.safeFloat (data, 'volume');
        const change = last - open;
        return {
            'symbol': symbol,           // string symbol of the market ('BTC/USD', 'ETH/BTC', ...)
            'info': data,              // the original non-modified unparsed reply from exchange API },
            'timestamp': 0,         // int (64-bit Unix Timestamp in milliseconds since Epoch 1 Jan 1970) // TODO:
            'datetime': 0,          // ISO8601 datetime string with milliseconds // TODO:
            'high': high,              // float, // highest price
            'low': low,               // float, // lowest price
            'bid': bid,               // float, // current best bid (buy) price
            'bidVolume': 0,         // float, // current best bid (buy) amount (may be missing or undefined)
            'ask': ask,               // float, // current best ask (sell) price
            'askVolume': 0,         // float, // current best ask (sell) amount (may be missing or undefined)
            'vwap': undefined,              // float, // volume weighed average price // TODO:
            'open': open,              // float, // opening price
            'close': last,             // float, // price of last trade (closing price for current period)
            'last': last,              // float, // same as `close`, duplicated for convenience
            'previousClose': undefined,     // float, // closing price for the previous period // TODO:
            'change': change,            // float, // absolute change, `last - open`
            'percentage': (change / open) * 100,        // float, // relative change, `(change/open) * 100`
            'average': (this.sum (last + open)) / 2,           // float, // average price, `(last + open) / 2`
            'baseVolume': volume,        // float, // volume of base currency traded for last 24 hours
            'quoteVolume': volume * last,                      // volume of quote currency traded for last 24 hours // TODO: should return from back-end
        };
    }

    filterTickers (symbol, tickers) {
        const filtered = [];
        for (let i = 0; i < tickers.length; i++) {
            const ticker = tickers[i];
            if (ticker.symbol === symbol) {
                filtered.push (ticker);
            }
        }
        return filtered;
    }

    async fetchTicker (symbol, params = {}) {
        await this.loadMarkets ();
        const market = this.market (symbol);
        const request = {
            'market': market['id'],
        };
        const resp = await this.publicGetTicker (this.extend (request, params));
        // resp.result = {
        //     ask: "7447.3"
        //     bid: "7360"
        //     change: "1"
        //     deal: "569915276.5617382279677655"
        //     high: "7443.19999999"
        //     last: "7411.77889448"
        //     low: "7295.92522614"
        //     open: "7303.25045227"
        //     volume: "77033.90307283"
        // }
        const data = this.safeValue (resp, 'result');
        // console.warn (data);
        return this.parseTicker (market['symbol'], data);
    }

    async fetchTickers (symbols = undefined, params = {}) {
        await this.loadMarkets ();
        const resp = await this.publicGetTickers ();
        const result = this.safeValue (resp, 'result');
        const keys = Object.keys (result);
        const tickers = [];
        // {
        //     bid: '0.00000108', // buy
        //     ask: '0.00000116', // sell
        //     low: '0.00000113', // lowest price
        //     high: '0.00000115', // highest price
        //     last: '0.00000113', // same as theirs
        //     vol: '79149378.805' // baseVolume
        // }
        // debugger;
        for (let i = 0; i < keys.length; i++) {
            const symbol = this.findSymbol (keys[i]);
            const tick = this.safeValue (result, [keys[i]]);
            const ticker = this.safeValue (tick, 'ticker');
            const obj = this.parseTicker (symbol, ticker);
            tickers.push (obj);
        }
        const filteredTickers = this.filterByArray (tickers, 'symbol', symbols);
        return filteredTickers;
    }

    // async fetchCurrencies (params = {}) {
    //     // const resp = [];
    //     const result = [];
    //     // for (let i = 0; i < resp.length; i++) {
    //     //     result[code] = {
    //     //         'id': id,
    //     //         'code': code,
    //     //         'info': currency,
    //     //         'type': undefined,
    //     //         'name': this.safeString (currency, 'assetName'),
    //     //         'active': active,
    //     //         'fee': fee,
    //     //         'precision': precision,
    //     //         'limits': {
    //     //             'amount': {
    //     //                 'min': MathDD.pow (10, -precision),
    //     //                 'max': undefined,
    //     //             },
    //     //             'price': {
    //     //                 'min': MathDD.pow (10, -precision),
    //     //                 'max': undefined,
    //     //             },
    //     //             'cost': {
    //     //                 'min': undefined,
    //     //                 'max': undefined,
    //     //             },
    //     //             'withdraw': {
    //     //                 'min': this.safeFloat (currency, 'minWithdrawalAmt'),
    //     //                 'max': undefined,
    //     //             },
    //     //         },
    //     //     };
    //     // }
    //     return result;
    // }

    // Fetches a list of all available markets from an exchange and returns an array of
    // markets(objects with properties such as symbol, base, quote etc.).Some exchanges
    // do not have means for obtaining a list of markets via their online API.For those,
    // the list of markets is hardcoded.
    async fetchMarkets (params = {}) {
        // await this.loadMarkets ();
        let resp = [];
        try {
            resp = await this.publicGetMarkets ();
        } catch (e) {
            console.log (e);
        }
        const cnbMarkets = this.safeValue (resp, 'result');
        const val = [];
        for (let i = 0; i < cnbMarkets.length; i++) {
            const cnbPair = cnbMarkets[i];
            // feePrec: "4"
            // minAmount: "0.001"
            // money: "BTC"
            // moneyPrec: "8"
            // name: "ETH_BTC"
            // stock: "ETH"
            // stockPrec: "8"
            const pairName = this.safeValue (cnbPair, 'name');
            const pairNameSlash = this.underscoreToSlash (pairName);
            const minAmount = this.safeValue (cnbPair, 'minAmount');
            const precision = this.safeValue (cnbPair, 'moneyPrec');
            const base = this.safeValue (cnbPair, 'stock');
            const quote = this.safeValue (cnbPair, 'money');
            const baseId = this.safeValue (cnbPair, 'stock');
            const quoteId = this.safeValue (cnbPair, 'money');
            val.push ({
                'id': pairName,  // string literal for referencing within an exchange
                'symbol': pairNameSlash, // uppercase string literal of a pair of currencies
                'base': base,     // uppercase string, unified base currency code, 3 or more letters
                'quote': quote,     // uppercase string, unified quote currency code, 3 or more letters
                'baseId': baseId,     // any string, exchange-specific base currency id
                'quoteId': quoteId,     // any string, exchange-specific quote currency id
                'active': true,       // boolean, market status // TODO: implement
                'precision': {        // number of decimal digits "after the dot"
                    'price': precision,       // integer or float for tick_size roundingMode, might be missing if not supplied by the exchange
                    'amount': precision,      // integer, might be missing if not supplied by the exchange
                    'cost': precision,        // integer, very few exchanges actually have it
                },
                'limits': {           // value limits when placing orders on this market
                    'amount': {
                        'min': parseFloat (minAmount),  // order amount should be > min
                        'max': 999999,  // order amount should be < max // TODO: implement
                    },
                    'price': {
                        'min': undefined, // TODO: implement
                        'max': undefined, // TODO: implement
                    }, // same min/max limits for the price of the order
                    'cost': {
                        'min': undefined, // TODO: implement
                        'max': undefined, // TODO: implement
                    }, // same limits for order cost = price * amount
                },
                'info': cnbMarkets.result, // the original unparsed market info from the exchange
            });
        }
        console.log ('val::', val);
        return val;
    }

    underscoreToSlash (pair) {
        const arr = pair.split ('_');
        const left = this.safeCurrencyCode (arr[0]);
        const right = this.safeCurrencyCode (arr[1]);
        let result = '';
        result += left;
        if (right) {
            result += '/' + right;
        }
        return result;
    }
};
