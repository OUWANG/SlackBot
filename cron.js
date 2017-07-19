
"use strict";

var { User } = require('./models');
var { Web } = require('./slackBot')


Reminder.find({date: {$gt: , $lt: }})
User.findOne()
  .then(function(user) {
    web.chat.postMessage(user.slackDmId,
      'Current time is ' + new Date(),
      function() {
        process.exit(0);
      }
    )
  })

