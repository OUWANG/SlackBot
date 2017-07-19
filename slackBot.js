
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var WebClient = require('@slack/client').WebClient;
var axios = require('axios');

var { User } = require('./models');


// var User = require('./models').User    same as above.

// var {RtmClient, WebClient, CLIENT_EVENTS, RTM_EVENTS } = require('@slack/client');

// =========================== express ===========================

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

// var pendingExist = false; //link to mongoDB with slackID and pending Varaible.

app.post ('/messageReceive', function(req, res) {
    // console.log("@@@@@@@@@@@@PAYLOAD @@@@ ", req);
    var payload = JSON.parse(req.body.payload);

    if (payload.actions[0].value === 'true'){ // when user press confirm.

        //by Moose ==================
        //what we need to do
        // which user
        // google credentials
        // subject calendar event
        //calendar event date
        User.findOne({ slackId: payload.user.id})
        .then(function(user){
            var googleAuth = getGoogleAuth();
            var credentials = Object.assign({}, user.google);
            delete credentials.profile_id;
            delete credentials.profile_name;
            googleAuth.setCredentials(credentials);
            var calendar = google.calender('v3');
            calendar.events.insert({
                auth: googleAuth,
                calendarId: 'primary',
                resource: {
                    summary: user.subject, //user.description
                    start: {
                        date: user.date,
                        timeZone: 'America/Los_Angeles'  // change if you want NY. New_York
                    },
                    end: {
                        // date: moment(user.date).add(1, 'days').format('YYYY-MM-DD'),
                        date: user.date,
                        timeZone: 'America/Los_Angeles'
                    }
                }
            }, function(err, result){
                if (err){
                    res.send('There was an error :x:');
                }
                else {
                    res.send('Created reminder :white_check_mark:')
                }
            })
        })

  if (payload.actions[0].value === 'true'){ // when user press confirm.
    // which user
    // google credentials
    // subject calendar event
    // calendar event date

    User.findOne({ slackId: payload.user.id})
    .then(function(user){
      console.log('TO BE SCHEDULED', user.pending)
      if (!user.pending.invitees) {
        event = {
          'summary': user.pending.subject,
          'description': user.pending.subject,
          'start': {
            'date': user.pending.date,
          },
          'end': {
            'date': user.pending.date,// next day from user.pending.date
          //  moment(user.date).add(1, 'days').format('YYYY-MM-DD')
          }
        }
      } else {
        event = {
          'summary': 'Test Scheduled Meeting',
          'description': user.pending.subject || 'Meeting',
          'attendees' : [
            {
              displayName: user.pending.invitees[0],
              email: 'rhong24@gmail.com'

            }
          ],
          'start': {
            'dateTime': user.pending.date + 'T' + user.pending.time + 'Z',
            'timeZone': 'America/Los_Angeles'
          },
          'end': {
            'dateTime': user.pending.date + 'T' + user.pending.time + 'Z',
            'timeZone': 'America/Los_Angeles'
          }
        }
      }

      var calendar = google.calendar('v3');
      let oauth2Client = new OAuth2(
        process.env.GOOGLE_CLIENT_ID,
        process.env.GOOGLE_CLIENT_SECRET,
        'http://localhost:3000/connect/callback'
      )

      let rtoken={}
      rtoken.access_token=user.google.access_token;
      rtoken.id_token=user.google.id_token;
      rtoken.token_type=user.google.token_type;
      rtoken.expiry_date=user.google.expiry_date;
      rtoken.refresh_token=user.google.refresh_token;

      oauth2Client.setCredentials(rtoken)
      calendar.events.insert({
        auth: oauth2Client,
        calendarId: 'primary',
        resource: event
      }, function(err,event){
        console.log('EVENT EVENT EVENT###', event)
        if(err){
          console.log('errrrrr',err)
        } else {
          user.pending = {};
          user.save();
          res.send('Created! :white_check_mark:');
        }
      })
    })
  } else if (payload.actions[0].value === 'false'){ //when user press cancel.

    User.findOne({ slackId: payload.user.id})
    .then(function(user){
      user.pending = {};
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
        'http://localhost:3000/connect/callback'
    )
}

const GOOGLE_SCOPE = ['https://www.googleapis.com/auth/userinfo.profile',
'https://www.googleapis.com/auth/calendar'];

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

var port = '3000'
app.listen(port, function() {
    console.log('Server is up!');
});

// =========================================================================================
// ========================================== bot ==========================================
// =========================================================================================

var RtmClient = require('@slack/client').RtmClient;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;
var CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;

var token = process.env.SLACK_API_TOKEN || '';
var web = new WebClient(token);

var rtm = new RtmClient(token);
rtm.start();

function getQueryFromAI(message, session) {
    return axios.get('https://api.api.ai/api/query', {
        params: {
            v: 20150910,
            lang: 'en',
            timezone: '2017-07-17T16:55:51-0700',
            query: message,
            sessionId: session
        },
        headers : {
            Authorization: `Bearer ${process.env.API_AI_TOKEN}`
        }
    })
}

// when I receive message from SlackBot
rtm.on(RTM_EVENTS.MESSAGE, function handleRtmMessage(message) {
    var dm = rtm.dataStore.getDMByUserId(message.user);

    // if it is NOT a direct message between bot and a user
    if (!dm || dm.id !== message.channel || message.type!== 'message'){
        // console.log("Message not sent to DM, ignoring");
        // console.log("dm" , dm);
        // console.log('NOT Direct Message: ', message);
        return;
    }
    //if it is DM.
    console.log('Direct Message: ', message);

    // if pending is true, alert user to finish the pending task.
    // if (pendingExist) {
    //   rtm.sendMessage("I think you're trying to create a new reminder. If so, please press `cancel` first to about the current reminder", message.channel)
    //   // web.chat.postMessage(message.channel, `Scheduling a meeting with ${data.result.parameters.invitees} on ${data.result.parameters.date} at ${data.result.parameters.time} `, jsonBtn)
    //   return;
    // }

    User.findOne({ slackId: message.user})
    .then(function(user){
        if (!user) {
            return new User({
                slackId: message.user,
                slackDMId: message.channel,
                pending: {}
            }).save();
        }

        if (user.pending && Object.keys(user.pending).length !== 0) {
            rtm.sendMessage("I think you're trying to create a new reminder. If so, please press `cancel` first to about the current reminder", message.channel)
            return;
        }

        return user;
    })
    .then(function(user) {
        // console.log(user); //printing out from MongoDB.

        console.log("USER: ", user);
        if (!user.google || user.google.expiry_date < Date.now() ) {
            rtm.sendMessage( `Hello,
                This is Schedule Bot created by David Youn. In order to connect Schedule Bot to Google Calendar,
                please visit http://localhost:3000/connect?user=${user._id} `, message.channel);
                return;
        }
        // rtm.sendMessage('Your id is' + user._id, message.channel)

        getQueryFromAI(message.text, message.user)
        .then(function({data}) {
            console.log("DATA: ", data);

            // if some input is missing,
            if (data.result.actionIncomplete) {
                rtm.sendMessage(data.result.fulfillment.speech, message.channel);
            } else { //When I have everything what I need. ex. date & todo.
                console.log('Action is complete!!!', data.result.parameters);

                // ACTION IS COMPLETE {date: '2017-07-26', description: 'do laundry', ...}
                // if invitees exist
                if (data.result.parameters.invitees) {
                    user.pending = {
                        subject: 'meeting',
                        invitees: data.result.parameters.invitees,
                        date: data.result.parameters.date,
                        time: data.result.parameters.time,
                        duration: {
                            amount: data.result.parameters.duration.amount,
                            unit: data.result.parameters.duration.unit
                        }
                    }
                    user.save()
                    // console.log("@@@@@INVITEES@@@@@",  data.result.parameters.invitees);
                    var jsonBtn = {
                        // "text": "Would you like to play a game?",
                        "attachments": [
                            {
                                // "title": "Is this reminder correct?",
                                "fallback": "A meeting is created",
                                "attachment_type": "default",
                                "fields": [
                                    {
                                        "title": "Subject",
                                        "value": "Meeting",
                                        "short": true
                                    },
                                    {
                                        "title": "Invitees",
                                        // "value": data.result.parameters.invitees.map(function(x){return x}),
                                        "value": data.result.parameters.invitees.join(', '),
                                        "short": true
                                    },
                                    {
                                        "title": "Date",
                                        "value": data.result.parameters.date,
                                        "short": true
                                    },
                                    {
                                        "title": "Time",
                                        "value": data.result.parameters.time,
                                        "short": true
                                    }
                                ]
                            },
                            {
                                // "title": "Is this reminder correct?",
                                "fallback": "You are unable to create a schedule",
                                "callback_id": "confirm_or_not",
                                "color": "#3AA3E3",
                                "attachment_type": "default",

                                "title": "Is this reminder correct?",
                                "actions": [
                                    {
                                        "name": "confirm",
                                        "text": "Yes",
                                        "type": "button",
                                        "value": "true"
                                    },
                                    {
                                        "name": "cancel",
                                        "text": "Cancel",
                                        "type": "button",
                                        "style": "danger",
                                        "value": "false"
                                    }
                                ]
                            }
                        ]
                    }
                    web.chat.postMessage(message.channel, ``, jsonBtn)
                } else {
                    user.pending = {
                        subject: data.result.parameters.subject,
                        date: data.result.parameters.date
                    }
                    user.save()
                    var jsonBtn = {
                        "attachments": [
                            {
                                "fallback": "A reminder is created",
                                "attachment_type": "default",
                                "fields": [
                                    {
                                        "title": "Subject",
                                        "value": data.result.parameters.subject,
                                        "short": true
                                    },
                                    {
                                        "title": "Date",
                                        "value": data.result.parameters.date,
                                        "short": true
                                    }
                                ]
                            },
                            {
                                "fallback": "A reminder is created",
                                "callback_id": "confirm_or_not",
                                "color": "#3AA3E3",
                                "attachment_type": "default",

                                "title": "Is this reminder correct?",
                                "actions": [
                                    {
                                        "name": "confirm",
                                        "text": "Yes",
                                        "type": "button",
                                        "value": "true"
                                    },
                                    {
                                        "name": "cancel",
                                        "text": "Cancel",
                                        "type": "button",
                                        "style": "danger",
                                        "value": "false"
                                    }
                                ]
                            }
                        ]
                    }
                    web.chat.postMessage(message.channel,'', jsonBtn)
                }
            }
        })
        .catch(function(err){
            console.log("ERROR", err);
        })
    })
})

rtm.on(RTM_EVENTS.REACTION_ADDED, function handleRtmReactionAdded(reaction) {
    console.log('Reaction added:', reaction);
});

rtm.on(RTM_EVENTS.REACTION_REMOVED, function handleRtmReactionRemoved(reaction) {
    console.log('Reaction removed:', reaction);
});

rtm.on(CLIENT_EVENTS.RTM.RTM_CONNECTION_OPENED, function () {
    // rtm.sendMessage("Hello!", channel);
    console.log("Bot is online!");
});
  
// module.export() = {
//     web
// }

