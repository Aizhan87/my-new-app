const express = require('express');
const session = require('express-session');
const MongoStore = require('connect-mongo')(session);
const flash = require('connect-flash')
const app = express();
const router = require('./router')
const markdown = require('marked')
const satitizeHTML = require('sanitize-html')


let sessionOptions = session({
    secret: 'Javascript is great',
    store: new MongoStore({ client: require('./db') }),
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24, httpOnly: true }
})


app.use(express.urlencoded({ extended: false }))
app.use(express.json())
app.use(sessionOptions)
app.use(flash())


app.use(function (req, res, next) {
    //make markdown available from within ejs template
    res.locals.filterUserHTML = function (content) {
        return satitizeHTML(markdown(content), { allowedTags: ['p', 'br', 'ul', 'li', 'lo', 'strong', 'bold', 'i', 'em', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6'], allowedAttributes: [] })
    }

    //make all error and success flash messages available from all templates
    res.locals.errors = req.flash('errors')
    res.locals.success = req.flash('success')
    //make current user id available on the req object
    if (req.session.userSession) {
        req.visitorId = req.session.userSession._id
    } else {
        req.visitorId = 0
    }

    //make user session data available from within view templates
    res.locals.user = req.session.userSession
    next()
})



app.use(express.static('public'));
app.set('views', 'views');
app.set('view engine', 'ejs');

app.use('/', router)

module.exports = app