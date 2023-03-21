const inp = require('./inp.json');
const apikey = inp.apiKey;
const apisecret = inp.secretKey;

const Binance = require('node-binance-api');
const binance = new Binance().options({
  APIKEY: apikey,
  APISECRET: apisecret,
  reconnect: false
});
const Binance2 = require('binance-api-node').default;
const binance2 = Binance2({
  apiKey: apikey,
  apiSecret: apisecret,
});

const instrument = inp.instrument;
const buyStop = parseFloat(inp.buyStop);
const buyLimit = parseFloat(inp.buyLimit);
const sellStop = parseFloat(inp.sellStop);
const sellLimit = parseFloat(inp.sellLimit);
const percentage = parseFloat(inp.percentage);
var accInfo = [];
var usdt, busd, quantity;
var placeCancel, placeDeal, orderStatus, orderSide;
  


async function OnInit(){

    let ticker = await binance.prices();
    price = parseFloat(ticker.BTCUSDT);//or ticker.BTCBUSD

    //Close any previous open orders, if any
    binance.openOrders(instrument, async (error, openOrders, symbol) => {

        if(openOrders.length > 0) {

            await orderCancel();

            if(placeCancel != undefined) {

                quantity = placeCancel[0].origQty;
                if(placeCancel[0].side == "BUY")
                    await orderBuy(); 
                if(placeCancel[0].side == "SELL")
                    await orderSell(); 
            }
        }

        if(openOrders.length == 0) { //No opened orders, like when we start the bot for the first time.
            quantity = await calculateQty(buyLimit);
            await orderBuy();  
        }    
    });


    webSocket();
}












async function webSocket() {

    binance.websockets.candlesticks(instrument, "1m", async (candlesticks) => {

        let { e: eventType, E: eventTime, s: symbol, k: ticks } = candlesticks;
        let { o: open, h: high, l: low, c: close, v: volume, n: trades, i: interval, x: isFinal, q: quoteVolume, V: buyVolume, Q: quoteBuyVolume } = ticks;

        //Check for the last order. It can be NEW, FILLED or CLOSED. NEW = Pending order!
        binance.allOrders(instrument, async (error, orders, symbol) => {

           try { 
            orderStatus = orders[orders.length - 1].status;
            orderSide = orders[orders.length - 1].side;
            }
            catch(error) { console.log("Couldn't fetch order info!"); }   
            
            if(orderStatus == "FILLED")
            {
                if(orderSide == "BUY") { 
                    quantity = orders[orders.length - 1].executedQty;  
                    orderSell();
                }
    
                if(orderSide == "SELL") {
                    quantity = await calculateQty(buyLimit);
                    orderBuy();
                }
            }
        });
    });
}



async function orderCancel() {
    try { placeCancel = await binance.cancelAll(instrument); }
    catch(error) { console.log(error.body); } 
    console.log("PREVIOUS ORDER CANCELLED: ",placeCancel);
    }



async function orderBuy() {

    let type = "STOP_LOSS_LIMIT";
    let stopPrice = buyStop;
    let limitPrice = buyLimit;
    try { placeDeal = await binance.buy(instrument, quantity, limitPrice, {stopPrice: stopPrice, type: type}); }
    catch(error) { console.log(error.body); }
    console.log("BUY: ",placeDeal);
}


async function orderSell() {

    let type = "STOP_LOSS_LIMIT";
    let stopPrice = sellStop;
    let limitPrice = sellLimit;
    try { placeDeal = await binance.sell(instrument, quantity, limitPrice, {stopPrice: stopPrice, type: type}); }
    catch(error) { console.log(error.body); }
    console.log("SELL: ",placeDeal);
}


async function calculateQty(entryPrice){

    accInfo = await binance2.accountInfo();//Get the most recent account info for our base currency (asset, free, locked)    

    for (let i = 0; i <= accInfo.balances.length - 1; i++) {

        if (instrument.indexOf(`USDT`) != -1)
            if (accInfo.balances[i].asset == "USDT") {
                usdt = parseFloat((accInfo.balances[i].free)).toFixed(8) * percentage / 100;
                quantity = parseFloat((usdt / entryPrice).toFixed(5));
                break;
            }
        if (instrument.indexOf(`BUSD`) != -1)
            if (accInfo.balances[i].asset == "BUSD") {
                busd = parseFloat((accInfo.balances[i].free)).toFixed(8) * percentage / 100;
                quantity = parseFloat((busd / entryPrice).toFixed(5));
                break;
            }
    }
    return quantity;
    }    







OnInit();


























