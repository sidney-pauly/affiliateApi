var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Category = require('./Category')

//Create shemas
var ListingSchema = Schema({
  AffiliateProgram: String,
  AffiliateProgramProductId: Number,
  Title: String,
  Description: String,
  DescriptionShort: String,
  Deeplink: String,
  Images: [Schema({URL: String, Width: Number, Height: Number})],
  DisplayPrice: String,
  DisplayShipping: String,
  Price: Number,
  Shipping: Number,
  Brand: String,
  ShopTitle: String,
  Logos: [String]
});

var ProductSchema = Schema({
  EAN: String,
  Listings: [ListingSchema],
  Title: String,
  Category: {type: Schema.Types.ObjectId, ref: 'Category'},
  DescriptionCustom: String
});

var Product = mongoose.model('Product', ProductSchema);

//var iron = new DefaultCommoditie({Name: 'Iron', Type: 'Ore', BuyPrice: 5, SellPrice: 3}).save();

module.exports = Product;
