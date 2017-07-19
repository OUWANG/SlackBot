
"use strict";
console.log('Hello I am runnning');

var { User } = require('./models')
var { web } = require('./slackBot')
User.find()
.then(function(user) {
    web.chat.postMessage(user.slackDMId,
    'Current time is ' + new Date(),
    function(){
        process.exit(0);
    }
)
})

//heroku run npm run cron
