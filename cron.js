"use strict";

var { User } = require('./models');
var { Reminder } = require('./models')
var { Web } = require('./slackBot')

var date = new Date();
var utcDate = new Date(date.toUTCString());
var msDate = utcDate.setHours(utcDate.getHours()-7);
var usDate = new Date(utcDate);

var tomorrow = new Date(msDate + 172800000).toISOString().substring(0, 10);
var yesterday = new Date(msDate - 86400000).toISOString().substring(0, 10);
//date: d.toISOString()
console.log('hello')

Reminder.find({date: {$gt : yesterday, $lt : tomorrow}})
// Reminder.find({date: new Date().toISOString().substring(0, 10)}) // 2017-07-20
  .then(function(reminders) { // return array of reminders
    console.log('LIST OF REMINDERS', reminders)
    console.log('DAYS', yesterday, tomorrow)
    if (reminders.length === 0) {
      process.exit(0);
    } else {
    var count = reminders.length;
    reminders.forEach(function(reminder) {
      User.findOne({slackId: reminder.user})
        .then(function(user) {
          Web.chat.postMessage(user.slackDMId,
            `:bell: You have the following reminder upcoming on ${reminder.date} : ${reminder.subject}.`
          )
          count--;
          if (count === 0 || !reminders) {
            process.exit(0);
          }
        })
    })
  }
})


// function postMessage(channelId, message) {
//   return new Promise(function(resolve, reject) {
//     web.chat.postMessage(user.slackDMId, 'The current time is ' + new Date(), function (err) {
//       if (err) {
//         reject(err);
//       } else {
//         resolve();
//       }
//     })
//   })
// }
//
//  var postMessage2 = bluebird.promisify(web.chat.postMessage.bind(web.chat));
//
// User.find()
// .then(function(users) {
//   var promises = users.map(function(user) {
//     return postMessage2(user.slackDMId, 'The current itme is ' + new Date());
//   })
//   return Promise.all(promises);
// })
// .then(function() {
//   console.log('DONE')
//   process.exit(0);
// })
// .catch(function(err)) {
//   console.log('ERROR', err)
//   process.exit(0);
// }



//Date.toISOString().substring(0, 10)  , $lt: Date.toISOString().substring(0, 10
