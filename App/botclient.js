var db = require('./Db.js');
var lastPrice = 0
var lastBidPrice = 0

function getAccountDetails(callback)
{
	db.query("SELECT * FROM bot",function(err,rows){

			if(rows.length > 0)
			{
				var target = rows[0];
				
				
				var result = {

					"ETH":{
						"available":target.ethereum
					},
					"USD":{
						"available":target.balance
					}

				}
	
				callback(result)
			}
			

	})



}

function buyEthereum(buyPrice,callback)
{

	
	console.log()

	db.query("SELECT * FROM bot",function(err,rows)
	{
		



		var target = rows[0]
		if(buyPrice <= target.balance)
		{
			var newBalance = target.balance - buyPrice
			var amount = Math.floor(buyPrice/lastPrice).toFixed(2) 
			var newEthereum = +target.ethereum + +amount
			
			
			db.query("UPDATE bot SET ? WHERE ?", [
                {
                    ethereum : newEthereum,
                    balance : newBalance

                },
                {
                    id: target.id
                }
            ], function () {
                callback({
                	"symbol1Amount" : amount * 1000000,
                	"id" : Math.floor(Math.random() * 999999) + 100000,
                	"time" : Math.round(new Date().getTime())
				})
            });




		}
		else
		{
			callback({"error":"Insufficent AMK"})
		}

	



	})
}

function setLastPrices(ask,bid)
{
	lastPrice = ask
	lastBidPrice = bid

}



function sellEthereum(amount,callback)
{



	db.query("SELECT * FROM bot",function(err,rows)
	{
			
			var target = rows[0]

			if(amount <= target.ethereum)
			{
				var newBalance = +target.balance + +amount * lastBidPrice
				
				var newEthereum = +target.ethereum - +amount
			
				
				db.query("UPDATE bot SET ? WHERE ?", [
	                {
	                    ethereum : newEthereum,
	                    balance : newBalance

	                },
	                {
	                    id: target.id
	                }
	            ], function () {
	                callback({
	                	"symbol1Amount" : amount * 1000000,
	                	"id" : Math.floor(Math.random() * 999999) + 100000,
	                	"time" : Math.round(new Date().getTime())
					})
	            });




			}
			else
			{
				callback({"error":"Insufficent AMK"})
			}


			
	})


}
function getLastBidPrice()
{

	return lastBidPrice
}

exports.getAccountDetails = getAccountDetails
exports.buyEthereum = buyEthereum
exports.setLastPrices = setLastPrices
exports.sellEthereum = sellEthereum
exports.getLastBidPrice = getLastBidPrice
