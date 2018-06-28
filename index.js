"use strict";

// Modules
const express = require("express");
const bodyParser = require("body-parser");
const path = require('path');
const app = express();
const mongoose = require('mongoose');
const models = require('./models');
const User = models.User;
const passport = require('passport');
const LocalStrategy = require('passport-local').Strategy;
const authChecker = require('./authChecker');

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
    http.get("http://motivate-bot.herokuapp.com/");
}, 300000); // 5 Minutes 

// Mongoose
if (! process.env.MLAB_URI) {
    throw new Error("MONGODB_URI is not in the environmental variables. Try running 'source env.sh'");
}
  
mongoose.connection.on('connected', function() {
    console.log('Success: connected to MongoDb!');
});
mongoose.connection.on('error', function(err) {
    console.log('Error connecting to MongoDb: ' + err);
    process.exit(1);
});

mongoose.connection.on("connected", function() {
    console.log("Connected to mlab");
});

mongoose.connect(process.env.LOCAL ? process.env.TEST_MLAB_URI : process.env.MLAB_URI);

// Session
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
app.use(session({
	secret: process.env.SECRET_STRING,
	store: new MongoStore({mongooseConnection: mongoose.connection})
}));

// Password hashing
var crypto = require('crypto');
function hashPassword(password) {
	var hash = crypto.createHash('sha256');
	hash.update(password);
	return hash.digest('hex');
}

// Passport Local Strategy
passport.use(new LocalStrategy(
	function(username, password, done) {
		User.findOne({username: username}, function(err, user) {
			if (user && user.password === hashPassword(password)) {
				done(null, user);
			} else {
				done(null, false);
			}
		});
	}
));

passport.serializeUser(function(user, done) {
	done(null, user._id);
});

passport.deserializeUser(function(id, done) {
	User.findById(id, function(err, result) {
		if (err || !result) {
			done(null, false);
		} else {
			done(null, result);
		}
	})
});

app.use(passport.initialize());
app.use(passport.session());

// ---- //

// Assign authChecker
app.use('/webhook', authChecker);
app.use('/signup', authChecker);

const facebookRoutes = require('./facebookRoutes');
const twilioRoutes = require('./twilioRoutes');
app.use('/twilio', twilioRoutes);
app.use('/webhook', facebookRoutes);

// Home
app.get("/", function (req, res) {
	res.render("homepage");
});

app.get('/login', function(req, res) {
	res.render('login');
});

app.get('/logout', function(req, res) {
	req.logout();
	res.redirect('/');
});

app.post('/login', passport.authenticate('local', {
	successRedirect: '/',
	failureRedirect: '/login'
}));

app.get('/signup', function(req, res) {
    res.render('signup');
});

app.post('/signup', function(req, res) {
    if (req.body.username && req.body.password) {
        var newUser = new User();
        newUser.username = req.body.username;
        newUser.password = hashPassword(req.body.password);

        newUser.save({}, function(error, result) {
            if (error) {
                res.json({"Error" : error});
            } else {
                res.redirect('/login');
            }
        });
    }
});