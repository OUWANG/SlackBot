
"use strict";

var { User } = require('./models');
var { Reminder } = require('./models')
var { Web } = require('./slackBot')


Reminder.find({date: {$gt: '2017-07-19' , $lt: '2017-07-20' }})
User.findOne()
  .then(function(user) {
    web.chat.postMessage(user.slackDmId,
      `Reminder: You have the following reminder: ${user.pending.subject} upcoming on ${user.pending.date}`,
      function() {
        process.exit(0);
      }
    )
  })


//Date.toISOString().substring(0, 10)  , $lt: Date.toISOString().substring(0, 10
