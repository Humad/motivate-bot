"use strict";

// Modules
const express = require("express");
const bodyParser = require("body-parser");
const request = require("request");
const app = express();
const mongo = require('mongodb').MongoClient;

// App setup
app.set("port", (process.env.PORT || 8000));
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

// Global variables
const token = process.env.FB_ACCESS_TOKEN;
const mLabUri = "mongodb://" + process.env.writerId +
":" + process.env.writerPass + "@ds157641.mlab.com:57641/motivate-bot";

// Start server
app.listen(app.get("port"), function() {
	console.log("running on port", app.get("port"));
});

// Keep Heroku app alive
const http = require("http");
setInterval(function() {
    http.get("https://sheltered-cliffs-61712.herokuapp.com/");
}, 86400000); // 5 Minutes 

// Send data every x milliseconds
setInterval(sendDailyMessage, 60000);

// Home
app.get("/", function (req, res) {
	res.send("Hello world!");
});

// Facebook verification
app.get("/webhook/", function (req, res) {
	if (req.query["hub.verify_token"] === "somethingsomethingtokenstuff") {
		res.send(req.query["hub.challenge"]);
	}
	res.send("Error, wrong token");
});

// Message receiver
app.post("/webhook/", function(req, res) {
    var messaging_events = req.body.entry[0].messaging;
    for (var i = 0; i < messaging_events.length; i++) {
        var event = req.body.entry[0].messaging[i];
        var sender = event.sender.id;
        if (event.message && event.message.text) {
            var text = event.message.text.toLowerCase();
            if (text === "start" || text === "add" || text === "subscribe") {
                addUserToDB(sender);
            } else if (text === "stop" || text === "remove" || text === "unsubscribe") {
				removeUserFromDB(sender);
			} else {
				var introMessage = "Hi! I'm Botivate - a motivational bot. I can send you a motivational quote every day.\nTo subscribe to my services, say SUBSCRIBE. To unsubscribe at anytime, say UNSUBSCRIBE. Have a nice day!";
				sendTextMessage(sender, introMessage);
			}
        }
    }
    res.sendStatus(200);
});

// -- Helper functions --

function sendTextMessage(sender, text) {
    var messageData = {text: text};
    request({
	    url: "https://graph.facebook.com/v2.6/me/messages",
	    qs: {access_token: token},
	    method: "POST",
		json: {
		    recipient: {id: sender},
			message: messageData,
			tag: "NON_PROMOTIONAL_SUBSCRIPTION"
		}
	}, function(error, response, body) {
		if (error) {
		    console.log("Error:", error);
		} else if (response.body.error) {
		    console.log("Error: ", response.body.error);
	    }
    });
}

function addUserToDB(sender) {
	mongo.connect(mLabUri, function(err, client){
        if (err){
            throw err;
            res.end(err);
        } else {
			var db = client.db("motivate-bot");
            db.collection("recipients").findOne({"sender" : sender}, function(err, result){
				if (result === null) {
					// User not find; adding now
					var data = {"sender": sender};
					db.collection("recipients").insertOne(data, function(err, res) {
						if (err) {
							console.log(err);
						}
						if (res) {
							console.log("Added user");
						}
						client.close();
					});
				} else {
					// Found user
					client.close();
				}
			});
		}
	});

	sendTextMessage(sender, "Alright, I'll send you motivational quotes once a day :)");
}

function removeUserFromDB(sender) {
	mongo.connect(mLabUri, function(err, client){
        if (err){
            throw err;
            res.end(err);
        } else {
			var db = client.db("motivate-bot");
            db.collection("recipients").remove({"sender" : sender}, function(err){
				if (err) {
					console.log(err);
				} else {
					console.log("Removed user");
				}
			});
		}
	});

	sendTextMessage(sender, "Aw, I'm sad to see you go :(");
}

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
		
		var quote = "\"" + decodeURIComponent(parsedBody.data.text) + "\" - " + decodeURIComponent(parsedBody.data.author);
		callback(quote);
    });
}

function sendDailyMessage() {
	getQuote(function(quote) {
		mongo.connect(mLabUri, function(err, client){
			if (err){
				throw err;
				res.end(err);
			} else {
				var db = client.db("motivate-bot");
				db.collection("recipients").find().toArray(function(err, docs){
					for (var i = 0; i < docs.length; i++) {
						sendTextMessage(docs[i].sender, quote)
					}
					client.close();
				});
			}
		});
	});
}