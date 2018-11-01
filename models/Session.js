var mongoose = require('mongoose');
var Schema = mongoose.Schema;

//Create shemas

var SessionSchema = Schema({
  SessionKey: String,
  Time: {type: Date, default: Date.now},
  Level: {type: Number, default: 1000},
  User: {type: Schema.Types.ObjectId, ref: 'User'}
});


module.exports = mongoose.model('Session', SessionSchema);

