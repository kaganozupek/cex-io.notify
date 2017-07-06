/**
 * Created by coskudemirhan on 04/07/2017.
 */

var colors = require('colors/safe');

colors.setTheme({
    silly: 'rainbow',
    buy: 'cyan',
    sell: 'green',
    forecast: 'yellow',
    debug: 'blue',
    red: 'red'
});


var db = require('./Db.js');
var timeseries = require("timeseries-analysis");
var fs = require('fs');

var config = require('../config.js');


var intervalSecond = 5;
var debug = config.debug;//TODO: Take this to the config file
var bot = {};

var forecast = function () {
    db.query('SELECT * FROM resources', function (err, resources) {

        db.query('SELECT * FROM prices ORDER BY id DESC LIMIT 1500', function (err, rowsSalt) {

            console.log(colors.silly('*******************************************************************'));
            console.log(colors.buy('Buy Price: $' + rowsSalt[0].ask));
            console.log(colors.sell('Sell Price: $' + rowsSalt[0].bid));
            console.log(colors.debug('------------------------------------------------'));


            for (r in resources) {

                var resource = resources[r];

                var lastAskPrices = [], lastBidPrices = [];

                rows  = rowsSalt.slice(0,resources.mean_count);
                for (i in rows) {
                    lastAskPrices.push([new Date(rows[i].timestamp * 1000), parseFloat(rows[i].ask)]);
                    lastBidPrices.push([new Date(rows[i].timestamp * 1000), parseFloat(rows[i].bid)]);
                }


                var tAsk = new timeseries.main(lastAskPrices.reverse());

                var smoothedAsk = tAsk.smoother({period: resource.smooth_period}).dsp_itrend({
                    alpha: 0.9
                }).save('smoothed');


                var tBid = new timeseries.main(lastBidPrices.reverse());

                var smoothedBid = tBid.smoother({period: resource.smooth_period}).dsp_itrend({
                    alpha: 0.9
                }).save('smoothed');


                var Askcoeffs = smoothedAsk.ARMaxEntropy({
                    data: tAsk.data.slice(tAsk.data.length - resource.forecast_count),
                    degree: 10,
                    sample: resource.forecast_count
                });

                var Bidcoeffs = smoothedBid.ARMaxEntropy({
                    data: tBid.data.slice(tBid.data.length - resource.forecast_count),
                    degree: 10,
                    sample: resource.forecast_count
                });


                var askForecast = 0;
                for (var i = 0; i < Askcoeffs.length; i++) {
                    askForecast -= tAsk.data[tAsk.data.length - 1 - i][1] * Askcoeffs[i];
                }

                var bidForecast = 0;
                for (var k = 0; k < Bidcoeffs.length; k++) {
                    bidForecast -= tBid.data[tBid.data.length - 1 - k][1] * Bidcoeffs[k];
                }



                var suitableForAsk = false;
                if (resource.ask === null) {

                    if (debug) {
                        console.log(colors.buy(resource.owner + ' Forecasted Buy Price: ') + colors.forecast('$'+askForecast));
                        console.log(colors.buy(resource.owner + ' Buy Price Mean: ') + colors.red('$'+tAsk.mean()));
                    }


                    if (parseFloat(lastAskPrices[lastAskPrices.length - 1][1]) < tAsk.mean()) {
                        if (parseFloat(askForecast) > parseFloat(lastAskPrices[lastAskPrices.length - 1][1])) {

                            if ((parseFloat(resource.bid) - parseFloat(resource.buy_margin)) > (parseFloat(lastAskPrices[lastAskPrices.length - 1][1]))) {

                                suitableForAsk = true;
                                buyNow(resource, lastAskPrices[lastAskPrices.length - 1][1], tAsk);
                            }

                        }

                    }

                    if (debug) {
                        console.log(colors.buy('For ' + resource.owner + ' Selled at ') + colors.red('$'+ + resource.bid) + colors.buy('. Expected Purchase Value: ') + colors.red('$'+(parseFloat(resource.bid) - parseFloat(resource.buy_margin))));
                        console.log(colors.buy('Is suitable: ' + suitableForAsk));
                    }

                    if (!suitableForAsk) {
                        idle(resource);
                    }

                }




                var suitableForBid = false;
                if (resource.bid === null) {

                    if (debug) {
                        console.log(colors.sell(resource.owner + ' Forecasted Sell Price: ') + colors.forecast('$'+bidForecast));
                        console.log(colors.sell(resource.owner + ' Sell Price Mean: ') + colors.red('$'+ tBid.mean()));
                    }

                    if (lastBidPrices[lastBidPrices.length - 1][1] > tBid.mean()) {

                        if (bidForecast < lastBidPrices[lastBidPrices.length - 1][1]) {


                            if ((parseFloat(resource.ask) + parseFloat(resource.sell_margin) ) < parseFloat(lastBidPrices[lastBidPrices.length - 1][1])) {

                                suitableForBid = true;
                                sellNow(resource, lastBidPrices[lastBidPrices.length - 1][1], tBid);
                            }
                        }

                    }

                    if (debug) {
                        console.log(colors.sell('For ' + resource.owner + ' Purchased at ') + colors.red('$'+ + resource.ask) + colors.sell(' Expected Sell Value: ') + colors.red('$'+ ( parseFloat(resource.ask) + parseFloat(resource.sell_margin))));
                        console.log(colors.sell('Is suitable: ' + suitableForBid));

                    }

                    if (!suitableForBid) {
                        idle(resource);
                    }
                }


                if(debug)
                    console.log(colors.debug('------------------------------------------------'));



            }
            console.log(colors.silly('*******************************************************************'));
            console.log('\n');
            console.log('\n');
        });
    });
}


var init = function (client, chatBot) {
    bot = chatBot;


    db.query('SELECT * FROM market_logs', function (err, rows) {
        var total = 0;

        for (i in rows) {

            if (rows[i].type === 'buy') {
                total -= rows[i].value * rows[i].amount;
            } else {
                total += rows[i].value * rows[i].amount;
            }

        }

        console.log('Total İşlem Karı: ' + total + '$');

        forecast();
        setInterval(forecast, intervalSecond*1000);
    });


}

var buyNow = function (resource, ask, t) {
    bot.sendMessage(22353916, ask + '$ değerinde ' + resource.amount + ' ETH Satın Aldım');

    var chart_url = t.chart();
    bot.sendPhoto(22353916, chart_url);


    db.query("UPDATE resources SET ? WHERE ?", [
        {
            ask: ask,
            bid: null,
            timestamp: +new Date(),
            idle_count:0

        },
        {
            id: resource.id
        }
    ], function () {
        db.query("INSERT INTO market_logs SET ?", {
            type: 'buy',
            value: ask,
            amount: resource.amount,
            timestamp: +new Date()
        });
    });


}


var sellNow = function (resource, bid, t) {
    bot.sendMessage(22353916, bid + '$ değerinde ' + resource.amount + ' ETH Sattım');

    var chart_url = t.chart();
    bot.sendPhoto(22353916, chart_url);


    db.query("UPDATE resources SET ?  WHERE ?", [
        {
            ask: null,
            bid: bid,
            timestamp: +new Date(),
            idle_count:0

        },
        {
            id: resource.id
        }
    ], function () {
        db.query("INSERT INTO market_logs SET ?", {
            type: 'sell',
            value: bid,
            amount: resource.amount,
            timestamp: +new Date()
        });
    });


}

var idle = function (resource) {

    db.query("UPDATE resources SET ?  WHERE ?", [
        {
            idle_count: resource.idle_count + 1,
            timestamp: +new Date()
        },
        {
            id: resource.id
        }
    ],function () {

        if(resource.idle_count + 1 === 720*2 || resource.idle_count + 1 === 720*4 || resource.idle_count + 1 === 720*8){
            bot.sendMessage(22353916, resource.owner + ' parası '+ parseInt(((resource.idle_count + 1) * intervalSecond) / 60 /60) +' saattir işlem göremiyor.');
        }
    });
}

module.exports = {
    init: init
}