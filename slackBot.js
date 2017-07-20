var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var axios = require('axios');
var moment = require('moment-timezone');

var { User } = require('./models');
var { Reminder } = require('./models')


// var User = require('./models').User    same as above.

// var {RtmClient, WebClient, CLIENT_EVENTS, RTM_EVENTS } = require('@slack/client');

// =========================== express ===========================

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// var pendingExist = false; //link to mongoDB with slackID and pending Varaible.

app.post ('/messageReceive', function(req, res) {
  console.log("@@@@@@@@@@@@PAYLOAD @@@@ ", req);
  var payload = JSON.parse(req.body.payload);
  console.log('SLACK PAYLOAD', payload, payload.callback_id)

  if (payload.actions[0].value === 'true'){ // when user press confirm.



    User.findOne({ slackId: payload.user.id})
    .then(function(user){
      console.log('TO BE SCHEDULED', user.pending)
      if (!user.pending.invitees) {
        event = {
          'summary': user.pending.subject,
          'description': user.pending.subject,
          'start': {
            'date': user.pending.date
          },
          'end': {
            'date': user.pending.date// next day from user.pending.date
          }
        }
        var newReminder = new Reminder({
          user: payload.user.id,
          subject: user.pending.subject,
          date: user.pending.date
        }).save()
      } else {
        var dat = moment.tz(user.pending.date + ' ' + user.pending.time, 'America/Los_Angeles'); // moment.utc(user.pending.date).format('YYYY-MM-DDTHH:mm:ss-07:00')
        event = {
          'summary': '#####',
          'description': user.pending.subject,
          'attendees' : [{email: "younsa@bc.edu"}, {email: "rhong24@gmail.com"}],
          'start': {
            dateTime: dat.format()
          },
          'end': {
            'dateTime': dat.add(30, 'minutes').format() // moment.utc(user.pending.date).add(1, 'hours').format('YYYY-MM-DDTHH:mm:ss-07:00')
          }
        }
      }

      var calendar = google.calendar('v3');
      let oauth2Client = new OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.DOMAIN+'/connect/callback'
      )

      let rtoken={}
      rtoken.access_token=user.google.access_token;
      rtoken.id_token=user.google.id_token;
      rtoken.token_type=user.google.token_type;
      rtoken.expiry_date=user.google.expiry_date;

      oauth2Client.setCredentials(rtoken)
      calendar.events.insert({
        auth: oauth2Client,
        calendarId: 'primary',
        resource: event
      }, function(err,event){
        if(err){
          console.log('errrrrr',err)
        } else {
          user.pending = {};
          // console.log('WORKING!!!');
          user.save();
          res.send('Created! :white_check_mark:');
        }
      })
    })
  } else if (payload.actions[0].value === 'false'){ //when user press cancel.

    User.findOne({ slackId: payload.user.id})
    .then(function(user){
      user.pending = {};
      // console.log('WORKING!!!');
      user.save();
    })
    res.send('Canceled :x:');
  }
})

var google = require('googleapis');
var OAuth2 = google.auth.OAuth2;

function getGoogleAuth() {
    return new OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        process.env.DOMAIN+'/connect/callback'
    )
}

const GOOGLE_SCOPE = [
    'https://www.googleapis.com/auth/userinfo.profile',
    'https://www.googleapis.com/auth/calendar',
    'https://www.googleapis.com/auth/userinfo.email'
];

app.get('/connect', function(req, res){
    var userId = req.query.user;
    if (!userId) {
        res.status(400).send('Missing user id');
    }
    else{ // if userID exists (logged in)
        User.findById(userId)
        .then(function(user){
            if (!user){
                res.status(404).send('Cannot find user');
            }
            else { //connect to Google
                var googleAuth = getGoogleAuth();
                var url = googleAuth.generateAuthUrl({
                    access_type: 'offline',
                    prompt: 'consent',
                    scope: GOOGLE_SCOPE,
                    state: userId
                });
                res.redirect(url);
            }
    });
  }
});
//
app.get('/connect/callback', function(req, res){
    var googleAuth = getGoogleAuth();
    googleAuth.getToken(req.query.code, function (err, tokens) {
        if (err){
            res.status(500).json({error: err});
        }
        else {
            googleAuth.setCredentials(tokens);
            var plus = google.plus('v1');
            plus.people.get({auth: googleAuth, userId: 'me'}, function(err, googleUser){
                if (err) {
                    res.status(500).json({error: err});
                }
                else {
                    User.findById(req.query.state)
                    .then(function(mongoUser) {
                        mongoUser.google = tokens;
                        mongoUser.google.profile_id = googleUser.id;
                        mongoUser.google.profile_name = googleUser.displayName;
                        mongoUser.google.email = googleUser.emails[0].value;
                        return mongoUser.save();
                    })
                    .then(function(mongoUser) {
                        res.send('You are connected to Google Calendar.')
                        rtm.sendMessage('You are connected to Google Calendar', mongoUser.slackDMId)
                    });
                }
            });
        }
    })
});

var port = process.env.PORT || '3000';
app.listen(port, function() {
    console.log('Server is up!');
});
