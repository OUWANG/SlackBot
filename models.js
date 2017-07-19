var mongoose = require('mongoose');
mongoose.Promise = global.Promise;
console.log(process.env.MONGODB_URI);
mongoose.connect(process.env.MONGODB_URI);

var User = mongoose.model('User', {
  slackId: {
    type: String,
    required: true
  },
  slackDMId: {
    type: String,
    required: true
  },
  pending: {},

  google: {}
});

module.exports = {
  User
};
