var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Category = require('./Category')

//Create shemas
var ListingSchema = Schema({
  AffiliateProgram: { type: String, required: true },
  AffiliateProgramProductId: { type: Number, required: true },
  Title: { type: String, required: true },
  Description: String,
  DescriptionShort: String,
  Deeplink: { type: String, required: true },
  Images: [Schema({URL: String, Width: Number, Height: Number})],
  DisplayPrice: String,
  DisplayShipping: String,
  Price: { type: Number, required: true },
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
  DescriptionCustom: String,
  LastUpdated: {type: Date, default: Date.now}
});

var Product = mongoose.model('Product', ProductSchema);

//var iron = new DefaultCommoditie({Name: 'Iron', Type: 'Ore', BuyPrice: 5, SellPrice: 3}).save();

module.exports = Product;
