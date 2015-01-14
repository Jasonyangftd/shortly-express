var express = require('express');
var util = require('./lib/utility');
var partials = require('express-partials');
var bodyParser = require('body-parser');
var session = require('express-session');
var passport = require('passport');
var GitHubStrategy = require('passport-github').Strategy;
var cookieParser = require('cookie-parser');

var db = require('./app/config');
var Users = require('./app/collections/users');
var User = require('./app/models/user');
var Links = require('./app/collections/links');
var Link = require('./app/models/link');
var Click = require('./app/models/click');

var app = express();

// app.use(express.cookieParser());
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.use(partials());
// Parse JSON (uniform resource locators)
app.use(bodyParser.json());
// Parse forms (signup/login)
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static(__dirname + '/public'));

app.use(cookieParser());
app.use(session({
  secret: 'fghfg'
}));
app.use(passport.initialize());
app.use(passport.session());


passport.serializeUser(function(user, done) {
  done(null, user);
});

passport.deserializeUser(function(obj, done) {
  done(null, obj);
});

passport.use(new GitHubStrategy({
    clientID: 'f4e0be50891085ee4375',
    clientSecret: 'c23a8f2cba717eb55cfa749eb46b9d6c393978ff',
    callbackURL: "http://127.0.0.1:4568/auth/github/callback"
  },
  function(accessToken, refreshToken, profile, done) {

    var user = new User({
      username: profile.id
    });

    user.fetch().then(function(data){
      if(data){
        console.log(data.attributes);
        return done(null, data.attributes);
      } else {
        user.save().then(function(saved){
          console.log('user saved', saved);
          return done(null, saved.attributes);
        });
      }
    });

    // var user = new User({
    //   username:
    //   password:
    // });
    // done(null)
  }
));

app.get('/auth/github',
  passport.authenticate('github'),
  function(req, res){
    // The request will be redirected to GitHub for authentication, so this
    // function will not be called.
  });

app.get('/auth/github/callback',
  passport.authenticate('github', { failureRedirect: '/login' }),
  function(req, res) {
    res.redirect('/');
  });



app.get('/', checkUser, function(req, res) {
  res.render('index');
});

app.get('/create', checkUser, function(req, res) {
  res.render('index');
});

app.get('/links', checkUser, function(req, res) {
  Links.reset().fetch().then(function(links) {
    res.send(200, links.models);
  });
});

app.post('/links', checkUser, function(req, res) {
  var uri = req.body.url;

  if (!util.isValidUrl(uri)) {
    console.log('Not a valid url: ', uri);
    return res.send(404);
  }

  new Link({ url: uri }).fetch().then(function(found) {
    if (found) {
      res.send(200, found.attributes);
    } else {
      util.getUrlTitle(uri, function(err, title) {
        if (err) {
          console.log('Error reading URL heading: ', err);
          return res.send(404);
        }

        var link = new Link({
          url: uri,
          title: title,
          base_url: req.headers.origin
        });

        link.save().then(function(newLink) {
          Links.add(newLink);
          res.send(200, newLink);
        });
      });
    }
  });
});

/************************************************************/
// Write your authentication routes here
/************************************************************/

function checkUser(req, res, next){
  if(req.isAuthenticated()){
    next();
  } else {
    res.redirect('/login');
  }
}

app.get('/login', function(req, res){
  res.render('login');
});

app.post('/login', function(req, res){
  // log user in
  var username = req.body.username;
  var password = req.body.password

  User.login(username, password, function(err, pass){
    if(pass){
      // console.log('pass exists: ', pass);
      req.session.regenerate(function(){
        req.session.userIsAuthenticated = true;
        res.redirect('/');
      });
    } else {
      console.log('not in database');
    }
  });

});

app.post('/signup', function(req, res){
  // create a new user

  var user = new User({
    username: req.body.username,
    password: req.body.password
  });

  user.encryptPassword(user, function(err, hash) {
    // Store hash in your password DB.
    user.set('password', hash);
    user.save().then(function(user){
      console.log('user created', user);
    });
  })


});

app.get('/signup', function(req, res){
  res.render('signup.ejs');
});

app.get('/logout', function(req, res){
  // req.session.destroy(function(err) {
  //   res.redirect('/login');
  // });
  req.logout();
  res.redirect('/');
});

/************************************************************/
// Handle the wildcard route last - if all other routes fail
// assume the route is a short code and try and handle it here.
// If the short-code doesn't exist, send the user to '/'
/************************************************************/

app.get('/*', function(req, res) {
  new Link({ code: req.params[0] }).fetch().then(function(link) {
    if (!link) {
      res.redirect('/');
    } else {
      var click = new Click({
        link_id: link.get('id')
      });

      click.save().then(function() {
        db.knex('urls')
          .where('code', '=', link.get('code'))
          .update({
            visits: link.get('visits') + 1,
          }).then(function() {
            return res.redirect(link.get('url'));
          });
      });
    }
  });
});

console.log('Shortly is listening on 4568');
app.listen(4568);
