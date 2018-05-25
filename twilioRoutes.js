const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const models = require('./models');
const PhoneRecipient = models.PhoneRecipient;

const getQuote = require('./getQuote');

mongoose.connection.on("connected", function() {
    console.log("Connected to mlab");
});

mongoose.connect(process.env.MLAB_URI);

// Twilio constants
const accountSid = process.env.TWILIO_SID; 
const authToken = process.env.TWILIO_AUTH_TOKEN; 
const fromNumber = process.env.MY_TWILIO_NUMBER;
const twilio = require('twilio');
const client = new twilio(accountSid, authToken);

setInterval(sendSMS, 43200000);

router.get('/', function(req, res) {
    sendSMS();
    res.send("Hello world!");
});

function addNewRecipient(name, phoneNumber) {
    var newRecipient = new PhoneRecipient();
    newRecipient.name = name;
    newRecipient.phoneNumber = phoneNumber;
    newRecipient.subscribed = true;
    newRecipient.save(function(err) {
        if (err) {
            console.log("Error adding recipient: ", err);
        }
    });
}

function sendSMS() {
    getQuote(function(quote) {
        PhoneRecipient.find({}, function(err, results) {
            if (err) {
                console.log("Error finding phone recipients: ", err);
            } else {
                for (var i = 0; i < results.length; i++) {
                    var result = results[i];

                    if (result.subscribed) {
                        var data = {
                            body: quote,
                            to: '+1' + result.phoneNumber,
                            from: fromNumber
                        }
    
                        client.messages.create(data, function(err, msg) {
                            if (err) {
                                console.log("Could not send message");
                            } else {
                                console.log("Sent message");
                            }
                        });
                    }
                }
            }
        });
    });
}


module.exports = router;