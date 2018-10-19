var mongoose = require('mongoose');
var Schema = mongoose.Schema;

//Create shemas
var AliasSchema = Schema({
  AffiliateProgram: String,
  Id: Number,
  Title: String
});

var CategorySchema = Schema({
  Title: String,
  Aliases: [AliasSchema],
  Parent: {type: Schema.Types.ObjectId, ref: 'Category'},
  Link: {type: Schema.Types.ObjectId, ref: 'Category'}
});


var Category = mongoose.model('Category', CategorySchema);

module.exports = Category;
