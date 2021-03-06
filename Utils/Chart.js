/**
 * Created by coskudemirhan on 09/07/2017.
 */
var _	= require("underscore");



// Util: encoding
var simpleEncoding = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

// This function scales the submitted values so that
// maxVal becomes the highest value.
function simpleEncode(valueArray,maxValue) {
    var chartData = ['s:'];
    for (var i = 0; i < valueArray.length; i++) {
        var currentValue = valueArray[i];
        if (!isNaN(currentValue) && currentValue >= 0) {
            chartData.push(simpleEncoding.charAt(Math.round((simpleEncoding.length-1) *
                currentValue / maxValue)));
        }
        else {
            chartData.push('_');
        }
    }
    return chartData.join('');
}

// Same as simple encoding, but for extended encoding.
var EXTENDED_MAP= 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-.';
var EXTENDED_MAP_LENGTH = EXTENDED_MAP.length;

function extendedEncode(arrVals, maxVal) {
    var chartData = 'e:';

    for(i = 0, len = arrVals.length; i < len; i++) {
        // In case the array vals were translated to strings.
        var numericVal = new Number(arrVals[i]);
        // Scale the value to maxVal.
        var scaledVal = Math.floor(EXTENDED_MAP_LENGTH *
            EXTENDED_MAP_LENGTH * numericVal / maxVal);

        if(scaledVal > (EXTENDED_MAP_LENGTH * EXTENDED_MAP_LENGTH) - 1) {
            chartData += "..";
        } else if (scaledVal < 0) {
            chartData += '__';
        } else {
            // Calculate first and second digits and add them to the output.
            var quotient = Math.floor(scaledVal / EXTENDED_MAP_LENGTH);
            var remainder = scaledVal - EXTENDED_MAP_LENGTH * quotient;
            chartData += EXTENDED_MAP.charAt(quotient) + EXTENDED_MAP.charAt(remainder);
        }
    }

    return chartData;
}















var google_image_chart = {
    url:		"https://chart.googleapis.com/chart",
    build:		function(params) {
        var i;
        var paramsArray = [];
        for (i in params) {
            paramsArray.push(i+"="+params[i]);
        }
        return google_image_chart.url+"?"+paramsArray.join("&");
    }
};


/* Candlestick */
google_image_chart.candlestick = function(options) {
    this.options = _.extend({
        width:		800,
        height:		200,
        volume:		true,
        spacing:	2,
        autoscale:	true
    },options);
}
google_image_chart.candlestick.prototype.fromYahoo = function(data) {
    var scope 	= this;

    this.data 	= data;
    this.n		= data.length;

    var prices = {
        l:	[],
        o:	[],
        c:	[],
        h:	[]
    };
    this.chd 	= [];

    /*
     L
     O
     C
     H
     */

    _.each(data, function(point) {
        prices.l.push(point.low);
        prices.o.push(point.open);
        prices.c.push(point.close);
        prices.h.push(point.high);
    });
    this.min 	= _.min(prices.l);
    this.max 	= _.max(prices.h);


    // Prepend and append -1 values, to have the chart with full candles, not crossing the Y axis

    prices.l.splice(0,0,-1);
    prices.o.splice(0,0,-1);
    prices.c.splice(0,0,-1);
    prices.h.splice(0,0,-1);

    prices.l.push(-1);
    prices.o.push(-1);
    prices.c.push(-1);
    prices.h.push(-1);


    this.chd.push(prices.l.join(","));
    this.chd.push(prices.o.join(","));
    this.chd.push(prices.c.join(","));
    this.chd.push(prices.h.join(","));

}
google_image_chart.candlestick.prototype.render = function() {
    var params = {};

    params['cht'] = "lc";
    params['chd'] = "t0:"+this.chd.join('|');

    params['chs'] 	= this.options.width+"x"+this.options.height;

    params['chm'] = "F,,0,-1,"+(Math.floor(this.options.width/this.n)*0.8);

    if (this.options.autoscale) {
        params['chds'] 	= this.min+","+this.max;
        //params['chxt'] 	= "y";
        //params['chxr'] 	= "0,"+this.min+","+this.max+",10";
    }

    return google_image_chart.build(params);
}




/* Bar (volume) */
google_image_chart.bar = function(options) {
    this.options = _.extend({
        width:		800,
        height:		200,
        volume:		true,
        spacing:	2,
        autoscale:	true
    },options);
}
google_image_chart.bar.prototype.fromYahoo = function(data, key) {
    var scope 	= this;

    this.data 	= data;
    this.n		= data.length;
    var points	= [];

    _.each(data, function(point) {
        points.push(point[key]);
    });

    this.min 	= _.min(points);
    this.max 	= _.max(points);

    /*
     // Prepend and append -1 values, to have the chart with full candles, not crossing the Y axis
     points.splice(0,0,-1);
     points.push(-1);
     */

    this.chd = simpleEncode(points, this.max);

}
google_image_chart.bar.prototype.render = function() {
    var params = {};

    params['cht'] 	= "bvs";
    params['chco'] 	= "76A4FB";
    params['chd'] 	= this.chd;

    params['chs'] 	= this.options.width+"x"+this.options.height;

    params['chbh'] = "a";


    /*
     if (this.options.autoscale) {
     params['chds'] 	= this.min+","+this.max;
     params['chxt'] 	= "y";
     params['chxr'] 	= "0,"+this.min+","+this.max+",10";
     }
     */
    return google_image_chart.build(params);
}




/* Line (Indicators) */
google_image_chart.line = function(options) {
    this.options = _.extend({
        width:		800,
        height:		200,
        bands:		false,
        autoscale:	true,
        hlines:		false	// Horizontal lines are a new serie, since Google Image doesn't support it...
    },options);


    this.datasets	= {};
    this.chd 		= [];
    this.chco		= [];

    this.min 		= 10000000000;
    this.max 		= -10000000000;



    this.rainbow 	= new Rainbow();
    this.rainbow.setSpectrum("76A4FB","E15393");
}
google_image_chart.line.prototype.fromYahoo = function(data) {
    var scope 	= this;

    this.data 	= data;
    this.n		= data.length;

    this.datasets	= {};
    this.chd 		= [];
    this.chco		= [];

    var prices		= {
        high:	"B61717",
        low:	"3283E4",
        //open:	"A5E036",
        close:	"222222"
    };

    for (price in prices) {
        scope.datasets[price] = {
            data:	[],
            min:	0,
            max:	0
        };
        _.each(data, function(datapoint) {
            scope.datasets[price].data.push(datapoint[price]);
        });

        scope.datasets[price].min 		= _.min(scope.datasets[price].data);
        scope.datasets[price].max 		= _.max(scope.datasets[price].data);



        if (scope.datasets[price].min < scope.min) {
            scope.min = scope.datasets[price].min;
        }
        if (scope.datasets[price].max > scope.max) {
            scope.max = scope.datasets[price].max;
        }
    }
    for (price in prices) {

        scope.chd.push(scope.datasets[price].data);

        scope.chco.push(prices[price]);
    }

}
google_image_chart.line.prototype.fromTradeStudio = function(data) {
    var scope 		= this;

    this.data 		= data;
    this.n			= data.length;

    _.each(data, function(dataset) {
        scope.datasets[dataset.name] = {
            data:	[],
            min:	0,
            max:	0
        };
        _.each(dataset.data, function(datapoint) {
            scope.datasets[dataset.name].data.push(datapoint[1]);
        });

        scope.datasets[dataset.name].min 		= _.min(scope.datasets[dataset.name].data);
        scope.datasets[dataset.name].max 		= _.max(scope.datasets[dataset.name].data);

        if (scope.datasets[dataset.name].min < scope.min) {
            scope.min = scope.datasets[dataset.name].min;
        }
        if (scope.datasets[dataset.name].max > scope.max) {
            scope.max = scope.datasets[dataset.name].max;
        }
    });

    _.each(data, function(dataset) {

        scope.chd.push(scope.datasets[dataset.name].data);
        if (dataset.color) {
            scope.chco.push(dataset.color);
        } else {
            scope.chco.push("AUTO");
        }
    });

}
google_image_chart.line.prototype.fromTimeseries = function(data) {
    var scope 		= this;

    this.data 		= data;
    this.n			= data.length;

    var name 		= _.uniqueId('chart_');

    scope.datasets[name] = {
        data:	[],
        min:	0,
        max:	0
    };
    _.each(data, function(datapoint) {
        scope.datasets[name].data.push(datapoint[1]);
    });

    scope.datasets[name].min 		= _.min(scope.datasets[name].data);
    scope.datasets[name].max 		= _.max(scope.datasets[name].data);

    if (scope.datasets[name].min < scope.min) {
        scope.min = scope.datasets[name].min;
    }
    if (scope.datasets[name].max > scope.max) {
        scope.max = scope.datasets[name].max;
    }
    scope.chd.push(scope.datasets[name].data);

    scope.chco.push("AUTO");

}
google_image_chart.line.prototype.fromArray = function(data) {
    var scope 		= this;

    this.data 		= data;
    this.n			= data.length;
    this.datasets	= {};
    this.chd 		= [];
    this.chco		= [];

    this.min 		= 10000000000;
    this.max 		= -10000000000;

    var c = 0;

    _.each(data, function(dataset, name) {
        c++;
        scope.datasets[name] = {
            data:	[],
            min:	0,
            max:	0
        };
        _.each(dataset, function(datapoint) {
            scope.datasets[name].data.push(datapoint);
        });

        scope.datasets[name].min 		= _.min(scope.datasets[name].data);
        scope.datasets[name].max 		= _.max(scope.datasets[name].data);

        if (scope.datasets[name].min < scope.min) {
            scope.min = scope.datasets[name].min;
        }
        if (scope.datasets[name].max > scope.max) {
            scope.max = scope.datasets[name].max;
        }
    });

    //console.log("Min", scope.min);
    //console.log("Max", scope.max);

    c = 0;
    _.each(data, function(dataset, name) {
        c++
        scope.chd.push(scope.datasets[name].data);

        if (dataset.color) {
            scope.chco.push(dataset.color);
        } else {
            scope.chco.push("AUTO");
            //var color = scope.rainbow.colorAt(c);
            //scope.chco.push(color);
        }
    });


}
google_image_chart.line.prototype.render = function() {
    var scope = this;

    var i;

    var params = {};

    params['cht'] 	= "lc";

    params['chs'] 	= this.options.width+"x"+this.options.height;

    params['chxt'] 	= "y";




    if (this.options.hlines) {
        // Add a new serie
        _.each(this.options.hlines, function(v) {
            var i;
            scope.chd.push([v,v]);
            scope.chco.push("ABABAB");
        });
    }

    // Encode the CHDs

    for (i=0;i<this.chd.length;i++) {
        if (scope.options.autoscale) {
            this.chd[i]	= _.map(this.chd[i], function(datapoint) {
                return datapoint-scope.min;
            });
            this.chd[i] = simpleEncode(this.chd[i], scope.max-scope.min);
        } else {
            this.chd[i] = simpleEncode(this.chd[i], scope.max);
        }
    }


    if (this.chd.length > 1) {
        // Remove the extra "s:" from the encoded data
        for (i=1;i<this.chd.length;i++) {
            this.chd[i] = this.chd[i].substr(2);
        }
    }

    params['chd'] 	= this.chd.join(",");


    // Process the colors;
    this.rainbow.setNumberRange(0, Math.max(this.chco.length, 1));
    for (i=0;i<this.chco.length;i++) {
        if (this.chco[i] == "AUTO") {
            this.chco[i] = this.rainbow.colorAt(i);
            //console.log("color "+i,this.chco[i]);
        }
    }
    params['chco'] 	= this.chco.join(","); //"76A4FB";



    if (this.options.bands) {
        var bands = [];
        _.each(this.options.bands, function(band) {
            bands.push("r,"+band.color+",0,"+band.from+","+band.to);
        });
        params['chm'] = bands.join("|");
    }


    if (this.options.autoscale) {
        params['chds'] 	= this.min+","+this.max;
        params['chxt'] 	= "y";
        params['chxr'] 	= "0,"+this.min+","+this.max+",10";
    }

    return google_image_chart.build(params);
}


exports.charts = google_image_chart;



















/*
 RainbowVis-JS
 Released under MIT License
 */

function Rainbow()
{
    var gradients = null;
    var minNum = 0;
    var maxNum = 100;
    var colours = ['ff0000', 'ffff00', '00ff00', '0000ff'];
    setColours(colours);

    function setColours (spectrum)
    {
        if (spectrum.length < 2) {
            throw new Error('Rainbow must have two or more colours.');
        } else {
            var increment = (maxNum - minNum)/(spectrum.length - 1);
            var firstGradient = new ColourGradient();
            firstGradient.setGradient(spectrum[0], spectrum[1]);
            firstGradient.setNumberRange(minNum, minNum + increment);
            gradients = [ firstGradient ];

            for (var i = 1; i < spectrum.length - 1; i++) {
                var colourGradient = new ColourGradient();
                colourGradient.setGradient(spectrum[i], spectrum[i + 1]);
                colourGradient.setNumberRange(minNum + increment * i, minNum + increment * (i + 1));
                gradients[i] = colourGradient;
            }

            colours = spectrum;
        }
    }
    this.setColors = this.setColours;

    this.setSpectrum = function ()
    {
        setColours(arguments);
    }

    this.setSpectrumByArray = function (array)
    {
        setColours(array);
    }

    this.colourAt = function (number)
    {
        if (isNaN(number)) {
            throw new TypeError(number + ' is not a number');
        } else if (gradients.length === 1) {
            return gradients[0].colourAt(number);
        } else {
            var segment = (maxNum - minNum)/(gradients.length);
            var index = Math.min(Math.floor((Math.max(number, minNum) - minNum)/segment), gradients.length - 1);
            return gradients[index].colourAt(number);
        }
    }
    this.colorAt = this.colourAt;

    this.setNumberRange = function (minNumber, maxNumber)
    {
        if (maxNumber > minNumber) {
            minNum = minNumber;
            maxNum = maxNumber;
            setColours(colours);
        } else {
            throw new RangeError('maxNumber (' + maxNumber + ') is not greater than minNumber (' + minNumber + ')');
        }
    }
}

function ColourGradient()
{
    var startColour = 'ff0000';
    var endColour = '0000ff';
    var minNum = 0;
    var maxNum = 100;

    this.setGradient = function (colourStart, colourEnd)
    {
        startColour = getHexColour(colourStart);
        endColour = getHexColour(colourEnd);
    }

    this.setNumberRange = function (minNumber, maxNumber)
    {
        if (maxNumber > minNumber) {
            minNum = minNumber;
            maxNum = maxNumber;
        } else {
            throw new RangeError('maxNumber (' + maxNumber + ') is not greater than minNumber (' + minNumber + ')');
        }
    }

    this.colourAt = function (number)
    {
        return calcHex(number, startColour.substring(0,2), endColour.substring(0,2))
            + calcHex(number, startColour.substring(2,4), endColour.substring(2,4))
            + calcHex(number, startColour.substring(4,6), endColour.substring(4,6));
    }

    function calcHex(number, channelStart_Base16, channelEnd_Base16)
    {
        var num = number;
        if (num < minNum) {
            num = minNum;
        }
        if (num > maxNum) {
            num = maxNum;
        }
        var numRange = maxNum - minNum;
        var cStart_Base10 = parseInt(channelStart_Base16, 16);
        var cEnd_Base10 = parseInt(channelEnd_Base16, 16);
        var cPerUnit = (cEnd_Base10 - cStart_Base10)/numRange;
        var c_Base10 = Math.round(cPerUnit * (num - minNum) + cStart_Base10);
        return formatHex(c_Base10.toString(16));
    }

    formatHex = function (hex)
    {
        if (hex.length === 1) {
            return '0' + hex;
        } else {
            return hex;
        }
    }

    function isHexColour(string)
    {
        var regex = /^#?[0-9a-fA-F]{6}$/i;
        return regex.test(string);
    }

    function getHexColour(string)
    {
        if (isHexColour(string)) {
            return string.substring(string.length - 6, string.length);
        } else {
            var colourNames =
                [
                    ['red', 'ff0000'],
                    ['lime', '00ff00'],
                    ['blue', '0000ff'],
                    ['yellow', 'ffff00'],
                    ['orange', 'ff8000'],
                    ['aqua', '00ffff'],
                    ['fuchsia', 'ff00ff'],
                    ['white', 'ffffff'],
                    ['black', '000000'],
                    ['gray', '808080'],
                    ['grey', '808080'],
                    ['silver', 'c0c0c0'],
                    ['maroon', '800000'],
                    ['olive', '808000'],
                    ['green', '008000'],
                    ['teal', '008080'],
                    ['navy', '000080'],
                    ['purple', '800080']
                ];
            for (var i = 0; i < colourNames.length; i++) {
                if (string.toLowerCase() === colourNames[i][0]) {
                    return colourNames[i][1];
                }
            }
            throw new Error(string + ' is not a valid colour.');
        }
    }
}


exports.colors = Rainbow;