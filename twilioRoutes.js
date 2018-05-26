const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');
const models = require('./models');
const PhoneRecipient = models.PhoneRecipient;
const ReceivedMessage = models.ReceivedMessage;

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
const twilioClient = new twilio(accountSid, authToken);

setInterval(sendDailyMessage, 1000 * 60);

router.get('/', function(req, res) {
    PhoneRecipient.findOne({name: "Humad"}, function(err, result) {
        if (err) {
            console.log("Error finding Humad", err);
        } else if (!result) {
            console.log("Humad doesn't exist in database");
        } else {
            sendMessage("GET received", result.phoneNumber);
        }
    });
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
    handleReceivedMessage(req.body.Body, req.body.From);
});

function handleReceivedMessage(message, from) {
    PhoneRecipient.findOne({phoneNumber: from}, function(err, result) {
        if (err) {
            console.log("Could not find recipient");
        } else if (!result) {
            console.log("No stored recipient with number", from);
        } else {
            var newMessage = new ReceivedMessage();
            newMessage.recipient = result._id;
            newMessage.message = message;
            newMessage.save(function(err) {
                if (err) {
                    console.log("Couldn't save received message from", result.name);
                }
            }); 

            message = message.toLowerCase();

            switch (message) {
                case "unsubscribe" || "stop":
                    result.subscribed = false;
                    sendMessage("Alright, I'll stop sending you messages 😔", result.phoneNumber);
                    break;
                case "subscribe" || "start":
                    result.subscribed = true;
                    sendMessage("Yay, I'll send you motivational messages 😊", result.phoneNumber);
                    break;
                case '' + parseInt(message):
                    result.interval = parseInt(message);
                    sendMessage("Got it! I'll send you a motivational message every " + parseInt(message) + " hour(s) 🙂", result.phoneNumber);
                    break;
                default: 
                    sendMessage("I'm sorry, I don't understand your message 😕 \n For a list of commands, say 'help'", result.phoneNumber);
            }

            result.save(function(err) {
                if (err) {
                    console.log("Could not update recipient with name", result.name);
                }
            });
        }
    });
}

function addNewRecipient(name, phoneNumber, interval) {
    var newRecipient = new PhoneRecipient();
    newRecipient.name = name;
    newRecipient.phoneNumber = '+1' + phoneNumber;
    newRecipient.interval = interval * 60 * 60 * 1000;
    newRecipient.subscribed = true;
    newRecipient.save(function(err) {
        if (err) {
            console.log("Error adding recipient:", err);
        }
    });
}

function sendDailyMessage() {
    PhoneRecipient.find({subscribed: true}, function(err, results) {
        if (err) {
            console.log("Error finding phone recipients:", err);
        } else if (results.length == 0) {
            console.log("No subscribed users");
        } else {
            // Current time in millis
            var currentTime = (new Date()).getTime();

            for (var i = 0; i < results.length; i++) {
                var result = results[i];

                if (currentTime - result.lastSent > result.interval) {

                    getQuote(function(quote) {
                        sendMessage(quote, result.phoneNumber);
                    });

                    result.lastSent = currentTime;
                    result.save(function(err) {
                        if (err) {
                            console.log("Error updating last sent for", result.name);
                        } else {
                            console.log("Updated last sent time for user:", result.name);
                        }
                    });
                }
            }
        }
    });
}

function sendMessage(message, to) {
    var data = {
        body: message, 
        to: to,
        from: fromNumber
    };

    twilioClient.messages.create(data, function(err, msg) {
        if (err) {
            console.log("Could not send message:", err);
        } else {
            console.log("Sent message to:", to);
        }
    });
}

module.exports = router;