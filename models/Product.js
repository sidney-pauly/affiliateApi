var mongoose = require('mongoose');
var Schema = mongoose.Schema;

//Create shemas
var ListingSchema = Schema({
  AffiliateProgram: String,
  AffiliateProgramProductId: Number,
  Title: String,
  Description: String,
  DescriptionShort: String,
  Deeplink: String,
  Images: [String],
  DisplayPrice: String,
  DisplayShipping: String,
  Price: Number,
  Shipping: Number,
  Brand: String,
  ShopTitle: String,
  Logos: [String],
  Category: {type: Schema.Types.ObjectId, ref: 'Category'}
});

var ProductSchema = Schema({
  EAN: String,
  Listings: [ListingSchema],
  Title: String
});

var Product = mongoose.model('Product', ProductSchema);

//var iron = new DefaultCommoditie({Name: 'Iron', Type: 'Ore', BuyPrice: 5, SellPrice: 3}).save();

module.exports = Product;
