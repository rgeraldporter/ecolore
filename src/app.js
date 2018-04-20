'use strict';

require('dotenv').config();

const express = require('express');
const path = require('path');
const logger = require('morgan');
const cookieParser = require('cookie-parser');
const expressSession = require('express-session');
const bodyParser = require('body-parser');
const Sequelize = require('sequelize');
const passwordless = require('passwordless');
const MySQLStore = require('passwordless-mysql');
const mailgunMod = require('mailgun-js');
const db = require('./models/index');
const fs = require('fs');
const R = require('ramda');
const routes = require('./routes/index');
const moment = require('moment');
const app = express();
const passport = require('passport');
const md = require('markdown-it')({
    linkify: true
});

app.locals.moment = moment; // share with EJS
app.locals.md = md;
app.locals.R = R;

app.use( passport.initialize());

const SequelizeSessionStore = require('connect-session-sequelize')(
    expressSession.Store
);

const mailgun = mailgunMod({
    domain: process.env.MAILGUN_DOMAIN,
    apiKey: process.env.MAILGUN_APIKEY || null
});

// TODO: Path to be send via email
const host = process.env.HOST || 'http://ecolore-local.org:' + process.env.PORT + '/';
const mySqlConnection =
    process.env.MYSQL_CONNECTION || 'mysql://root@127.0.0.1/ecolore';

const myStore = new SequelizeSessionStore({
    db: db.sequelize,
    expiration: 7 * 24 * 60 * 60 * 1000
});

const findUserByEmail = email => db.User.findOne({ where: { email } });

// Setup of Passwordless
passwordless.init(
    new MySQLStore(mySqlConnection, {
        server: {
            auto_reconnect: true
        }
    })
);

passwordless.addDelivery(function(tokenToSend, uidToSend, recipient, callback) {
    const message = {
        from: 'Do Not Reply <donotreply@example.com>',
        to: recipient,
        subject: 'Login link'
    };

    const send = notice => {
        const emailMessage = Object.assign(message, { text: notice });
        notice &&
            mailgun.messages().send(emailMessage, (error, body) => {
                console.info('Emailed: ', body);
            });
    };

    send(
        host + '?token=' + tokenToSend + '&uid=' + encodeURIComponent(uidToSend)
    );
    callback();
});

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// Standard express setup
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(
    expressSession({
        secret: process.env.EXPRESS_SESSION_SECRET,
        store: myStore,
        resave: false, // we support the touch method so per the express-session docs this should be set to false
        proxy: true, // if you do SSL outside of node.
        saveUninitialized: true
    })
);

myStore.sync();

app.use(express.static(path.join(__dirname, 'public')));
app.use(passwordless.sessionSupport());
app.use(passwordless.acceptToken({ successRedirect: '/profile' }));
app.use(function(req, res, next) {
    return findUserByEmail(req.user)
        .then(user => res.locals.user = user)
        .catch(err => res.locals.unauthenticated = true)
        .then(() => next());
});

function recursiveRoutes(folderName) {
    fs.readdirSync(folderName).forEach(function(file) {
        const fullName = path.join(folderName, file);
        const stat = fs.lstatSync(fullName);

        if (stat.isDirectory()) {
            recursiveRoutes(fullName);
        } else if (file.toLowerCase().indexOf('.js')) {
            require(fullName)(app);
        }
    });
}

recursiveRoutes(__dirname + '/routes'); // Initialize it

/// catch 404 and forward to error handler
app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// development error handler
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: err
    });
});

app.set('port', process.env.PORT || 3000);

const server = app.listen(app.get('port'), function() {
    console.log('Express server listening on port ' + server.address().port);
});
