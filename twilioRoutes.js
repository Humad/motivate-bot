const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const models = require('./models');
const PhoneRecipient = models.PhoneRecipient;

const getQuote = require('./getQuote');

mongoose.connection.on("connected", function() {
    console.log("Connected to mlab");
});

mongoose.connect(process.env.LOCAL ? process.env.TEST_MLAB_URI : process.env.MLAB_URI);

// Twilio constants
const accountSid = process.env.TWILIO_SID; 
const authToken = process.env.TWILIO_AUTH_TOKEN; 
const fromNumber = process.env.MY_TWILIO_NUMBER;
const twilio = require('twilio');
const client = new twilio(accountSid, authToken);

setInterval(sendSMS, 1000 * 60);

router.get('/', function(req, res) {
    sendSMS();
    res.send("Hello world!");
});

router.get('/add', function(req, res) {
    res.render('addNumber');
});

router.post('/add', function(req, res) {
    addNewRecipient(req.body.name, req.body.phoneNumber, req.body.interval);
    res.render('addNumber');
});

router.post('/message/receive', function(req, res) {

});

function addNewRecipient(name, phoneNumber, interval) {
    var newRecipient = new PhoneRecipient();
    newRecipient.name = name;
    newRecipient.phoneNumber = phoneNumber;
    newRecipient.interval = interval * 60 * 60 * 1000;
    newRecipient.subscribed = true;
    newRecipient.save(function(err) {
        if (err) {
            console.log("Error adding recipient: ", err);
        }
    });
}

function sendSMS() {
    getQuote(function(quote) {
        PhoneRecipient.find({subscribed: true}, function(err, results) {
            if (err) {
                console.log("Error finding phone recipients: ", err);
            } else {
                // Current time in millis
                var currentTime = (new Date()).getTime();

                for (var i = 0; i < results.length; i++) {
                    var result = results[i];

                    if (currentTime - result.lastSent > result.interval) {
                        var data = {
                            body: quote,
                            to: '+1' + result.phoneNumber,
                            from: fromNumber
                        }
    
                        client.messages.create(data, function(err, msg) {
                            if (err) {
                                console.log("Could not send message: ", err);
                            } else {
                                console.log("Sent message to user: ", result.name);
                            }
                        });

                        result.lastSent = currentTime;
                        result.save(function(err) {
                            if (err) {
                                console.log("Error updating last sent for ", result.name);
                            } else {
                                console.log("Updated last sent time for user: ", result.name);
                            }
                        });
                    }
                }
            }
        });
    });
}


module.exports = router;