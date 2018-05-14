'use strict';

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const app = express();

app.set('port', (process.env.PORT || 8000));
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());

// Home
app.get('/', function (req, res) {
	res.send('Hello world!');
});

// for Facebook verification
app.get('/webhook/', function (req, res) {
	if (req.query['hub.verify_token'] === 'somethingsomethingtokenstuff') {
		res.send(req.query['hub.challenge']);
	}
	res.send('Error, wrong token');
});

app.post('/webhook/', function (req, res) {
    var messaging_events = req.body.entry[0].messaging;
    for (var i = 0; i < messaging_events.length; i++) {
      var event = req.body.entry[0].messaging[i];
      var sender = event.sender.id;
      if (event.message && event.message.text) {
  	    var text = event.message.text;
  	    if (text === 'Generic') {
  		    sendGenericMessage(sender);
  		    continue;
  	    }
  	    sendTextMessage(sender, "Text received, echo: " + text.substring(0, 200) + ", from: " + sender);
      }
      if (event.postback) {
  	    var text = JSON.stringify(event.postback);
  	    sendTextMessage(sender, "Postback received: "+text.substring(0, 200));
  	    continue;
      }
    }
    res.sendStatus(200);
  });

const token = process.env.FB_ACCESS_TOKEN;

function sendTextMessage(sender, text) {
    var messageData = {text: text};
    request({
	    url: 'https://graph.facebook.com/v2.6/me/messages',
	    qs: {access_token: token},
	    method: 'POST',
		json: {
		    recipient: {id: sender},
			message: messageData,
		}
	}, function(error, response, body) {
		if (error) {
		    console.log('Error:', error);
		} else if (response.body.error) {
		    console.log('Error: ', response.body.error);
	    }
    });
}

function sendGenericMessage(sender) {
    var messageData = {
	    "attachment": {
		    "type": "template",
		    "payload": {
				"template_type": "generic",
			    "elements": [{
					"title": "First card",
				    "subtitle": "Element #1 of an hscroll",
				    "image_url": "http://messengerdemo.parseapp.com/img/rift.png",
				    "buttons": [{
					    "type": "web_url",
					    "url": "https://www.messenger.com",
					    "title": "web url"
				    }, {
					    "type": "postback",
					    "title": "Postback",
					    "payload": "Payload for first element in a generic bubble",
				    }],
			    }, {
				    "title": "Second card",
				    "subtitle": "Element #2 of an hscroll",
				    "image_url": "http://messengerdemo.parseapp.com/img/gearvr.png",
				    "buttons": [{
					    "type": "postback",
					    "title": "Postback",
					    "payload": "Payload for second element in a generic bubble",
				    }],
			    }]
		    }
	    }
    };
    request({
	    url: 'https://graph.facebook.com/v2.6/me/messages',
	    qs: {access_token:token},
	    method: 'POST',
	    json: {
		    recipient: {id:sender},
		    message: messageData,
	    }
    }, function(error, response, body) {
	    if (error) {
		    console.log('Error sending messages: ', error)
	    } else if (response.body.error) {
		    console.log('Error: ', response.body.error)
	    }
    });
}

// Start server
app.listen(app.get('port'), function() {
	console.log('running on port', app.get('port'));
});