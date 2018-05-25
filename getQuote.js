const request = require('request');

function getQuote(callback) {
	request({
	    url: "https://getquote.herokuapp.com/getmotivational",
	    method: "GET"
	}, function(error, response, body) {
		if (error) {
		    console.log("Error:", error);
		} else if (response.body.error) {
		    console.log("Error: ", response.body.error);
		}

		var parsedBody = JSON.parse(body);
		
		var quote = "\"" + decodeURIComponent(parsedBody.data.text);
		// TODO: Find a better way to check for author existence
		if (parsedBody.data.author.length > 2) {
			quote = quote + "\" - " + decodeURIComponent(parsedBody.data.author);
		}
		callback(quote);
    });
}

module.exports = getQuote;