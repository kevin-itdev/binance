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



const instrument = inp.baseAsset.concat(inp.quoteAsset);
const buyStop = parseFloat(inp.buyStop);
const buyLimit = parseFloat(inp.buyLimit);
const sellStop = parseFloat(inp.sellStop);
const sellLimit = parseFloat(inp.sellLimit);
const percentage = parseFloat(inp.percentage);
var accInfo = [];
var usdt, quantity;
var placeCancel, placeDeal, orderStatus, orderSide;
  


async function OnInit(){

    price = JSON.stringify(await binance2.prices({ symbol: instrument }));
    price = parseFloat( price.substring(price.indexOf(`":"`)+`":"`.length,price.indexOf(`"}`)) );


    //Close any previous open orders, if any
    binance.openOrders(instrument, async (error, openOrders, symbol) => {
        
        if(error != undefined) {
            console.log(error.body);
            return;
        }

        if(openOrders.length > 0) {

            await orderCancel();

            if(placeCancel != undefined) {

                if(placeCancel[0].side == "BUY") {
                    quantity = await buyQty();
                    await orderBuy(); 
                }
                if(placeCancel[0].side == "SELL") {
                    quantity =  await sellQty();
                    await orderSell(); 
                }
            }
        }

        if(openOrders.length == 0) { //No opened orders, like when we start the bot for the first time.
            quantity = await buyQty();
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
                    quantity = await sellQty();  
                    orderSell();
                }
    
                if(orderSide == "SELL") {
                    quantity = await buyQty();
                    orderBuy();
                }
            }
        });
    });
}



async function orderCancel() {
    try { placeCancel = await binance.cancelAll(instrument); }
    catch(error) { console.log(error.body); } 
    console.log("CANCEL PREVIOUS ORDER: ",placeCancel);
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









async function buyQty(){

    let entryPrice;
    if(buyLimit >= buyStop)
        entryPrice = buyStop;
    if(buyLimit <= buyStop)
        entryPrice = buyLimit;

    accInfo = await binance2.accountInfo();//Get the most recent account info for our base currency (asset, free, locked)    

    for (let i = 0; i <= accInfo.balances.length - 1; i++) {

        if (accInfo.balances[i].asset == inp.quoteAsset) {

            usdt =  accInfo.balances[i].free * percentage / 100;
            quantity = parseFloat( ( usdt / entryPrice ).toFixed(5) );
            break;
        }
    }
    return quantity;
}  



async function sellQty(){

    accInfo = await binance2.accountInfo();//Get the most recent account info for our base currency (asset, free, locked)    

    for (let i = 0; i <= accInfo.balances.length - 1; i++) {

        if (accInfo.balances[i].asset == inp.baseAsset) {
            quantity = parseFloat( ( 0.98 * accInfo.balances[i].free ).toFixed(5) );
            break;
        }
    }
    return quantity;
}  








OnInit();