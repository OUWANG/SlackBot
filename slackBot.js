
var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var WebClient = require('@slack/client').WebClient;
var axios = require('axios');

// var {RtmClient, WebClient, CLIENT_EVENTS, RTM_EVENTS } = require('@slack/client');

// =========================== express ===========================

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

var pendingExist = false; //link to mongoDB with slackID and pending Varaible.

app.post ('/messageReceive', function(req, res) {
  console.log("@@@@@@@@@@@@PAYLOAD @@@@ ", req);
  var payload = JSON.parse(req.body.payload);

  if (payload.actions[0].value === 'true'){
    res.send({
      text: 'Created! :white_check_mark:',
    })
    pendingExist = false
  } else if (payload.actions[0].value === 'false'){
    res.send('Canceled :x:');
    pendingExist = false
  }
})

var port = '3000'
app.listen(port);

// =========================== bot ===========================

var RtmClient = require('@slack/client').RtmClient;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;
var CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS; //


var token = process.env.SLACK_API_TOKEN || '';
var web = new WebClient(token);

var rtm = new RtmClient(token);
rtm.start();

// when I receive message from SlackBot
rtm.on(RTM_EVENTS.MESSAGE, function handleRtmMessage(message) {
  var dm = rtm.dataStore.getDMByUserId(message.user);

  // if it is NOT a direct message between bot and a user
  if (!dm || dm.id !== message.channel || message.type!== 'message'){
    console.log("Message not sent to DM, ignoring");
    console.log("dm" , dm);
    console.log('NOT Direct Message: ', message);
    return;
  }
  //if it is DM.
  console.log('Direct Message: ', message);

  cancelBtn = {}
  // if pending is true, alert user to finish the pending task.
  if (pendingExist) {
    rtm.sendMessage("I think you're trying to create a new reminder. If so, please press `cancel` first to about the current reminder", message.channel)
    // web.chat.postMessage(message.channel, `Scheduling a meeting with ${data.result.parameters.invitees} on ${data.result.parameters.date} at ${data.result.parameters.time} `, jsonBtn)
    return;
  }

  // curl 'https://api.api.ai/api/query?v=20150910&query=remind%20me&lang=en&sessionId=13756478-6ee1-48f8-9953-7f53da5e2206&timezone=2017-07-17T16:55:51-0700' -H 'Authorization:Bearer e637efb67d9e44abbb260b09b472af21'
  axios.get('https://api.api.ai/api/query', {
    params: {
      v: 20150910,
      lang: 'en',
      timezone: '2017-07-17T16:55:51-0700',
      query: message.text,
      sessionId: message.user
    },
    headers : {
      Authorization: `Bearer ${process.env.API_AI_TOKEN}`
    }
  })
  .then(function({data}) {

    console.log("DATA: " , data);

    // if some input is missing,
    if (data.result.actionIncomplete) {
      rtm.sendMessage(data.result.fulfillment.speech, message.channel);
    }
    else { //When I have everything what I need. ex. date & todo.

      console.log('Action is complete!!!', data.result.parameters);
      pendingExist = true; //set it to true for future use.

      // ACTION IS COMPLETE {date: '2017-07-26', description: 'do laundry', ...}

      // if invitees exist
      if (data.result.parameters.invitees) {
        console.log("@@@@@INVITEES@@@@@",  data.result.parameters.invitees);
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
                                "value": data.result.parameters.invitees[0],
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
        var jsonBtn = {
          // "text": "Would you like to play a game?",
          "attachments": [
              {
                  // "title": "Is this reminder correct?",
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
        web.chat.postMessage(message.channel,'', jsonBtn)
      }
    }
  })
  .catch(function(err){
    console.log("ERROR", err);
  })

  // if (message.subtype === 'bot_message') {
  //   return;
  // }

  // rtm.sendMessage("this is response "+ message.text, message.channel)

  // web.chat.postMessage(message.channel, 'Hello there', jsonBtn, function(err, res) {
  //   if (err) {
  //     console.log('Error:', err);
  //   } else {
  //     console.log('Message sent: ', res);
  //   }
  // });
});

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
