var mongoose = require('mongoose');
var Schema = mongoose.Schema;

//Create shemas
var BlogSchema = Schema({
  Title: String,
  Text: String,
  TextShort: String,
  Category: {type: Schema.Types.ObjectId, ref: 'Category'},
  Rank: {type: Number, default: 0}
});

var WebsiteSchema = Schema({
  Title: String,
  Blogs: [BlogSchema]
});


module.exports = mongoose.model('Website', WebsiteSchema);

