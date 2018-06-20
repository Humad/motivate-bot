const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const PhoneRecipient = new Schema({
    phoneNumber: {
        type: String,
        required: true
    },
    subscribed: {
        type: Boolean,
        required: true
    },
    name: {
        type: String,
        required: true
    },
    lastSent: {
        type: Number,
        required: true,
        default: 0
    },
    messageHistory: {
        type: [String],
        required: false
    },
    interval: {
        type: Number,
        required: true
    }
});

const ReceivedMessage = new Schema({
    recipient: {
        type: mongoose.Schema.ObjectId,
        ref: 'phonerecipients',
        required: true
    }, 
    message: {
        type: String,
        required: true
    }
});

const User = new Schema({
    username: {
        type: String, 
        required: true
    },
    password: {
        type: String, 
        required: true
    }
});

module.exports = {
    PhoneRecipient: mongoose.model('PhoneRecipient', PhoneRecipient),
    ReceivedMessage: mongoose.model('ReceivedMessage', ReceivedMessage),
    User: mongoose.model('User', User)
}