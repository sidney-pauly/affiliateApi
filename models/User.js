var mongoose = require('mongoose');
var Schema = mongoose.Schema;

//Create shemas

var UserSchema = Schema({
  Username: String,
  Password: String,
  Level: {type: Number, default: 1000}
});


module.exports = mongoose.model('User', UserSchema);

