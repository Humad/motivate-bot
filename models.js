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
    }
});

module.exports = {
    PhoneRecipient: mongoose.model('PhoneRecipient', PhoneRecipient)
}