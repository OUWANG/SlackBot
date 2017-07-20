var RtmClient = require('@slack/client').RtmClient;
var RTM_EVENTS = require('@slack/client').RTM_EVENTS;
var CLIENT_EVENTS = require('@slack/client').CLIENT_EVENTS;

var token = process.env.SLACK_API_TOKEN || '';
var WebClient = require('@slack/client').WebClient;
var web = new WebClient(token);

var { User } = require('./models')

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

    User.findOne({ slackId: message.user})
    .then(function(user){
        if (!user) {
            return new User({
                slackId: message.user,
                slackDMId: message.channel,
                pending: {}
            }).save();
        }

        if (Object.keys(user.pending).length !== 0) {
            rtm.sendMessage("I think you're trying to create a new reminder. If so, please press `cancel` first on the current reminder", message.channel)
            return;
        }

        // if (user.pending.date) {
        //     rtm.sendMessage("I think you're trying to create a new reminder. If so, please press `cancel` first on the the current reminder", message.channel)
        //     return;
        // }

        return user;
    })
    .then(function(user) {
        // console.log(user); //printing out from MongoDB.

        console.log("USER: ", user);
        if (!user.google || user.google.expiry_date < Date.now() ) {
            rtm.sendMessage( `Hello,
                This is Schedule Bot created by David Youn. In order to connect Schedule Bot to Google Calendar,
                please visit ${process.env.DOMAIN}/connect?user=${user._id} `, message.channel);
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

module.exports = {
  Web: web,
  rtm: rtm
}
