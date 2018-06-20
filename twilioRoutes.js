const express = require('express');
const router = express.Router();
const models = require('./models');
const PhoneRecipient = models.PhoneRecipient;
const ReceivedMessage = models.ReceivedMessage;

const getQuote = require('./getQuote');

// Twilio constants
const accountSid = process.env.TWILIO_SID;
const authToken = process.env.TWILIO_AUTH_TOKEN;
const fromNumber = process.env.MY_TWILIO_NUMBER;
const twilio = require('twilio');
const twilioClient = new twilio(accountSid, authToken);

setInterval(sendDailyMessage, 1000 * 60);

/////////
// GET //
/////////

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

    PhoneRecipient.find({subscribed: true}, function(err, results) {
        if (err) {
            console.log('Error finding subscribed recipients');
            res.json("Hello world!");
        }  else if (results.length === 0) {
            res.json("No subscribed users");
        } else {
            res.send("Number of subscribed users: " + results.length);
        }
    });
});

router.get('/add', function(req, res) {
    res.render('addNumber');
});

router.get('/allUsers', function(req, res) {
    PhoneRecipient.find({}, function(err, results) {
        if (err) {
            console.log("Error finding phone recipients");
            res.json({"Error": err});
        } else {
            res.json({"results": results});
        }
    });
});

router.get('/subscribers', function(req, res) {
    getSubscribers(function(jsonData) {
        res.json(jsonData);
    })
});

router.get('/message/send', function(req, res) {
    res.render('sendMessage');
});

//////////
// POST //
//////////

router.post('/add', function(req, res) {
    addNewRecipient(req.body.name, req.body.phoneNumber, req.body.interval);
    res.redirect('/twilio/add');
});

router.post('/message/receive', function(req, res) {
    handleReceivedMessage(req.body.Body, req.body.From);
});

router.post('/message/send', function(req, res) {
    getSubscribers(function(jsonData) {
        jsonData.results.forEach(function(subscriber) {
            sendMessage(req.body.message, subscriber.phoneNumber);
        });
    });
    res.render('sendMessage');
});

//////////////////////
// Helper Functions //
//////////////////////

function getSubscribers(callback) {
    PhoneRecipient.find({subscribed: true}, function(err, results) {
        if (err) {
            console.log("Error finding phone recipients");
            callback({"error": err});
        } else {
            callback({"results": results});
        }
    });
}

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
                case "hi" || "hello":
                    sendIntroMessage(result.phoneNumber, result.interval);
                    break;
                case "unsubscribe" || "stop":
                    result.subscribed = false;
                    sendMessage("Alright, I'll stop sending you messages 😔", result.phoneNumber);
                    break;
                case "subscribe" || "start":
                    result.subscribed = true;
                    result.lastSent = 0;
                    sendMessage("Yay, I'll send you motivational messages 😊", result.phoneNumber);
                    break;
                case '' + parseInt(message):
                    result.interval = parseInt(message) * 1000 * 60 * 60;
                    sendMessage("Got it! I'll send you a motivational message every " + parseInt(message) + " hour(s) 🙂", result.phoneNumber);
                    break;
                case 'help':
                    sendCommandHelp(result.phoneNumber);
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
        
        function processResult(result) {
            // Current time in millis
            var currentTime = (new Date()).getTime();

            if (currentTime - result.lastSent > result.interval) {

                if (result.lastSent === 0) {
                    sendIntroMessage(result.phoneNumber, result.interval);
                }

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
        
        if (err) {
            console.log("Error finding phone recipients:", err);
        } else if (results.length == 0) {
            console.log("No subscribed users");
        } else {
            for (var i = 0; i < results.length; i++) {
                processResult(results[i]);
            }
        }
    });
}

function sendIntroMessage(to, interval) {
    var introMessage = "Hi! I'm the motivational bot! Your number has been added to my database. \n This means that I get to send you a motivational message or quote from time to time! Currently, I am set to send you a message every " + (interval / 1000 / 60 / 60) + " hour(s)."
    sendMessage(introMessage, to);
    sendCommandHelp(to);
}

function sendCommandHelp(to) {
    var commandHelp = "- To change the frequency of messages, send me a number. \n- To unsubscribe, say UNSUBSCRIBE \n- To subscribe, say SUBSCRIBE";
    sendMessage(commandHelp, to);
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

    PhoneRecipient.findOne({phoneNumber: to}, function(err, result){
        if (err) {
            console.log("Error finding user with number:", to);
        } else if (!result) {
            console.log("No user found with number", to);
        } else {
            result.messageHistory.push(message);
            result.save(function(err) {
                if (err) {
                    console.log("Error adding message to user", result.name);
                }
            });
        }
    });
}

module.exports = router;