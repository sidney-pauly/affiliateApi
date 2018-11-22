var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var TextSchema = Schema({

  Content: {type: String, default: ' '},
  Color: String,
  Alignment: String,
  Style: Number,
  Size: Number,
  Spacing: Number
  
});

//Create shemas
var BlogSchema = Schema({
  Title: TextSchema,
  Text: {type: TextSchema, required: true},
  Images: [String],
  ImageStyle: String,
  ImageHeight: Number,
  BackgroundColor: String,
  Category: {type: Schema.Types.ObjectId, ref: 'Category'},
  Rank: {type: Number, default: 0}
});

var WebsiteSchema = Schema({
  Title: String,
  Namespace: String,
  Blogs: [BlogSchema],
  navColor: String,
  LandingImage: String
});


module.exports = mongoose.model('Website', WebsiteSchema);

