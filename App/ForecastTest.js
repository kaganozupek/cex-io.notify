/**
 * Created by coskudemirhan on 05/07/2017.
 */
var ChartjsNode = require('chartjs-node');


var db = require('./Db.js');
var timeseries = require("timeseries-analysis");

var colors = require('colors/safe');

colors.setTheme({
    silly: 'rainbow',
    buy: 'cyan',
    sell: 'green',
    forecast: 'yellow',
    debug: 'blue',
    red: 'red'
});

var util = require('../Utils/TradeUtil.js');


var datasets = [
    {start: 1499446380, end: 1499449740, forecast:[]},
    {start: 1499435400, end: 1499436900, forecast:[]},
    {start: 1499439960, end: 1499446320, forecast:[]},
    {start: 1499387820, end: 1499410800, forecast:[]},
    {start: 1499411760, end: 1499426700, forecast:[]}
];

var currentDataset = 0;
var startPriceIndex = 0;

var windowDivider = function (rowsSalt) {
    var startPrice = rowsSalt[startPriceIndex];

    db.query('SELECT * FROM prices WHERE timestamp < ' + startPrice.timestamp + ' ORDER BY id LIMIT 1000', function (err, rowsS) {
        db.query('SELECT * FROM resources WHERE id > 3', function (err, resources) {


            for (r in resources) {

                var resource = resources[0];

                if(datasets[currentDataset].forecast[resource.id] === undefined){
                    datasets[currentDataset].forecast[resource.id] = {
                        'sell' : [],
                        'buy' : []
                    }
                }


                var rows = rowsS.slice(0, resources.mean_count);

                var lastAskPrices = [], lastBidPrices = [];

                for (i in rows) {
                    lastAskPrices.push([new Date(rows[i].timestamp * 1000), parseFloat(rows[i].ask)]);
                    lastBidPrices.push([new Date(rows[i].timestamp * 1000), parseFloat(rows[i].bid)]);
                }


                var tAsk = new timeseries.main(lastAskPrices.reverse());

                var tBid = new timeseries.main(lastBidPrices.reverse());

                /*
                 Smoothed
                 */

                var smoothedAsk = tAsk.smoother({period: resource.smooth_period}).dsp_itrend({
                    alpha: resource.trend_alpha
                }).save('smoothed');


                var smoothedBid = tBid.smoother({period: resource.smooth_period}).dsp_itrend({
                    alpha: resource.trend_alpha
                }).save('smoothed');


                /*
                 Forecasted
                 */
                var Askcoeffs = smoothedAsk.ARMaxEntropy({
                    data: tAsk.data.slice(tAsk.data.length - resource.forecast_count),
                    degree: 30,
                    sample: resource.forecast_count
                });

                var Bidcoeffs = smoothedBid.ARMaxEntropy({
                    data: tBid.data.slice(tBid.data.length - resource.forecast_count),
                    degree: 30,
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


                /*
                 BUY AND SELL START
                 */
                //var peaks = util.peakPromise();


                var lastAskPrice = parseFloat(lastAskPrices[lastAskPrices.length - 1][1]);

                var suitableForAsk = false;
                if (resource.ask === null) {


                    var lastForecastAsk = smoothedAsk.data[smoothedAsk.data.length - 1][1];


                    if (lastAskPrice < tAsk.mean()) {
                        if (askForecast > lastForecastAsk) {


                            if ((parseFloat(resource.bid) - parseFloat(resource.buy_margin)) > (lastAskPrice)) {
                                console.log('buy');

                                suitableForAsk = true;
                                buyNow(resource, lastAskPrices[lastAskPrices.length - 1][1], tAsk);

                                var rawDate = new Date(lastAskPrices[lastAskPrices.length - 1][0]);
                                var xDate = rawDate.getHours() + ':' + rawDate.getMinutes();

                                datasets[currentDataset].forecast[resource.id].buy.push({
                                    r:5,
                                    y: lastAskPrices[lastAskPrices.length - 1][1],
                                    x: xDate
                                });
                            }


                        }

                    }

                }

                var suitableForBid = false;
                if (resource.bid === null) {

                    var lastForecastBid = smoothedBid.data[smoothedBid.data.length - 1][1];


                    if (lastBidPrices[lastBidPrices.length - 1][1] > tBid.mean()) {

                        if (parseFloat(bidForecast) < lastForecastBid) {


                            if ((parseFloat(resource.ask) + parseFloat(resource.sell_margin) ) < parseFloat(lastBidPrices[lastBidPrices.length - 1][1])) {
                                console.log('sell');
                                suitableForBid = true;
                                sellNow(resource, lastBidPrices[lastBidPrices.length - 1][1], tBid);

                                var rawDate = new Date(lastBidPrices[lastBidPrices.length - 1][0]);
                                var xDate = rawDate.getHours() + ':' + rawDate.getMinutes();

                                datasets[currentDataset].forecast[resource.id].sell.push({
                                    r:5,
                                    y: lastBidPrices[lastBidPrices.length - 1][1],
                                    x: xDate
                                });

                            }

                        }

                    }


                }


                /*
                 BUY AND SELL END
                 */

            }


            if (rowsSalt.length - 1 > startPriceIndex) {
                startPriceIndex = ++startPriceIndex;
                windowDivider(rowsSalt);
            } else {
                /* Grafik */

                for (l in resources) {
                    var res = resources[l];

                    var fask = [],fbid = [];


                    if(datasets[currentDataset] !== undefined && datasets[currentDataset].forecast[res.id] !== undefined && datasets[currentDataset].forecast[res.id].buy!== undefined ){
                        fask = datasets[currentDataset].forecast[res.id].buy;
                    }


                    if(datasets[currentDataset] !== undefined && datasets[currentDataset].forecast[res.id] !== undefined &&  datasets[currentDataset].forecast[res.id].sell!== undefined ){
                        fbid = datasets[currentDataset].forecast[res.id].sell;
                    }

                    create_chart(res,tBid.data,tAsk.data,fask,fbid,currentDataset);
                }



                startPriceIndex = 0;
                if (datasets.length - 1 > currentDataset) {
                    currentDataset = ++currentDataset;
                    lookUp(currentDataset);
                } else {
                    console.log(datasets);
                }
            }


        });
    });
}

var lookUp = function (current) {

    var dataset = datasets[current];

    console.log(colors.silly('Bakılan Data Set'));
    console.log(colors.blue(JSON.stringify(dataset)));

    db.query('SELECT * FROM prices WHERE timestamp BETWEEN ' + dataset.start + ' AND ' + dataset.end + ' ORDER BY id', function (err, rowsSalt) {

        console.log(colors.red('Kontrol Edilen Data Miktarı: ' + rowsSalt.length));
        windowDivider(rowsSalt);

    });


}


var create_chart = function (resource,bid, ask, fAsk, fBid,datasetIndex) {

    console.log('Tahmin Alış');
    console.log(fAsk);
    console.log('Tahmin Satış');
    console.log(fBid);


    var chartNode = new ChartjsNode(2600, 800);

    var defaultOptions = {
        plugins: {},
        title: {
            display: true,
            text: resource.owner+' Algoritma Tahmin Grafiği'
        }
    }

    var chartJsOptions = {
        type: 'line',
        data: {
            datasets: [
                {
                    label: 'Satış Değerleri',
                    data: getYAxisForChart(bid),
                    type: 'line',
                    backgroundColor: "#36a2eb",
                    lineTension:0.1,
                    fill:false
                },
                {
                    label: 'Alış Değerleri',
                    data: getYAxisForChart(ask),
                    type: 'line',
                    backgroundColor: "#61f661",
                    lineTension:0.1,
                    fill:false
                },
                {
                    label: 'Alış Tahminleri',
                    data:  fAsk,
                    type:  'bubble',
                    backgroundColor: "#cc65fe"
                },
                {
                    label: 'Satış Tahminleri',
                    data:  fBid,
                    type:  'bubble',
                    backgroundColor: "#ffce56"
                }
            ],
            labels: getXAxisForChart(bid)
        },
        options: defaultOptions
    }

    return chartNode.drawChart(chartJsOptions)
        .then(function () {
            // chart is created

            // get image as png buffer
            return chartNode.getImageBuffer('image/png');
        }).then(function (buffer) {
            Array.isArray(buffer); // => true
            // as a stream
            return chartNode.getImageStream('image/png');
        }).then(function (streamResult) {
            console.log('Test Result Chat Created');
            return chartNode.writeImageToFile('image/png', './test-results/test-resource-'+resource.id+'-dataset-'+datasetIndex+'.png');
        });
}


var getXAxisForChart = function (data) {
    var container = [];

    for (i in data) {
        var rawDate = new Date(data[i][0]);
        var date = rawDate.getHours() + ':' + rawDate.getMinutes();
        container.push(date);
    }

    return container;
}

var getYAxisForChart = function (data) {
    var container = [];

    for (i in data) {
        container.push(data[i][1]);
    }

    return container;
}



var buyNow = function (resource, ask, t) {
    db.query("UPDATE resources SET ? WHERE ?", [
        {
            ask: ask,
            bid: null,
            timestamp: +new Date(),
            idle_count: 0

        },
        {
            id: resource.id
        }
    ], function () {});


}


var sellNow = function (resource, bid, t) {
    db.query("UPDATE resources SET ?  WHERE ?", [
        {
            ask: null,
            bid: bid,
            timestamp: +new Date(),
            idle_count: 0

        },
        {
            id: resource.id
        }
    ], function () { });


}

module.exports = {
    init: function () {
        lookUp(currentDataset);
    }
}