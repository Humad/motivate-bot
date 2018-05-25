"use strict";

// Modules
const express = require("express");
const bodyParser = require("body-parser");
const app = express();

// App setup
app.set("port", (process.env.PORT || 8000));
app.use(bodyParser.urlencoded({extended: false}));
app.use(bodyParser.json());
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');

// Start server
app.listen(app.get("port"), function() {
	console.log("running on port", app.get("port"));
});

// Keep Heroku app alive
const http = require("http");
setInterval(function() {
    http.get("http://sheltered-cliffs-61712.herokuapp.com/");
}, 300000); // 5 Minutes 

const facebookRoutes = require('./facebookRoutes');
const twilioRoutes = require('./twilioRoutes');
app.use('/webhook', facebookRoutes);
app.use('/twilio', twilioRoutes);

// Home
app.get("/", function (req, res) {
	res.send("Hello world!");
});