"use strict";

var { User } = require('./models');
var { Reminder } = require('./models')
var { Web } = require('./bot')

var d = new Date()

// Reminder.find({Date: {$gt: d.toISOString().substring(0, 10) , $lt: new Date((d.getTime() + 86400000)).toISOString().substring(0, 10) }})
Reminder.find({date: d.toISOString().substring(0, 10)})
  .then(function(reminders) { // return array of reminders
    console.log('LIST OF REMINDERS', reminders)
    reminders.forEach(function(reminder) {
      User.findOne({slackId: reminder.user})
        .then(function(user) {
          Web.chat.postMessage(user.slackDMId,
            `Reminder: You have the following reminder: ${reminder.subject} upcoming on ${reminder.date}`
          )
        })
    }),
    function() {
      process.exit(0);
    }
  })



//Date.toISOString().substring(0, 10)  , $lt: Date.toISOString().substring(0, 10
