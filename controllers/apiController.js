var request = require('request');
var rp = require('request-promise-native');
var Product = require('../models/Product.js');
var Category = require('../models/Category.js');

var AffilinetPublisherId = '821350';
var AffilinetPassword = '9j3msjLqmyVvXns5tKZ7';

async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array)
  }
}

//Returns the apropriate Category based on the given product key
//Missing categories in the given tree get created
function getCategoryfromTree(categoryTree, affiliateProgram){

  async function verifyLevel(level, parent){

    //Find existing Category
    var c = await Category.findOne({Level: level, Aliases: {$elemMatch: {Id: categoryTree[level].Id, AffiliateProgram: affiliateProgram}}})

    //if Category doesn't exist create one
    if(!c){
      c = await Category.create({
        Title: categoryTree[level].Title,
        Level: level,
        Aliases: [{Title: categoryTree[level].Title, Id: categoryTree[level].Id, AffiliateProgram: affiliateProgram}],
        Parent: parent
      });
    }

    //if there is another category in the tree match it
    if(categoryTree[level+1]){
      return verifyLevel(level+1, c._id);
    } else {
      return c;
    }

  }

  return verifyLevel(0, undefined);

}

function getCategoryTreeAffilinet(product){

  //Get Categorie Title
  var CategoryTree = [];
  product.ShopCategoryPath.replace(/[\u00C0-\u017FA-Za-z &]+/g, function(match, g1, g2) {
    CategoryTree.push({Title: match.trim()});
  });

  //Get Categorie id
  var i = 0;
  product.ShopCategoryIdPath.replace(/\d+/g, function(match, g1, g2) {
    CategoryTree[i].Id = match;
    i++;
  });

  return CategoryTree;
}


async function AddAffilinetListing(product, listing){

  function getImages(){
    var Images = [];
    listing.Images.forEach(function(i){
      i.forEach(function(ri){
        Images.push(ri.URL);
      });
    });
    return Images;
  }

  function getLogos(){
    var Logos = [];
    listing.Logos.forEach(function(l){
        Logos.push(l.URL);
    });
    return Logos;
  }

  var pricePatt = /\d*[.]\d{2}/;

  var data = {
    AffiliateProgram: 'Affilinet',
    AffiliateProgramProductId: listing.ProductId,
    Title: listing.ProductName,
    Description: listing.Description,
    DescriptionShort: listing.DescriptionShort,
    Deeplink: listing.Deeplink1,
    Images: getImages(),
    DisplayPrice: listing.PriceInformation.DisplayPrice,
    DisplayShipping: listing.PriceInformation.DisplayShipping,
    Price: Number(pricePatt.exec(listing.PriceInformation.DisplayPrice)),
    Shipping: Number(pricePatt.exec(listing.PriceInformation.DisplayShipping)),
    Brand: listing.Brand,
    Logos: getLogos()
  }

  //Find existing Lsiting and make new one if none exists
    var existingListingId = await product.Listings.findIndex(function(l){
      return l.AffiliateProgram === 'Affilinet' && l.AffiliateProgramProductId === listing.ProductId;
    });

    if(existingListingId > -1){
      product.Listings[existingListingId].set(data);
    } else {
      //Create new listing
      product.Listings.push(data).isNew;
    }

}

async function addSimilarAffilinetProducts(product){

  var options = {
    uri: 'https://product-api.affili.net/V3/productservice.svc/JSON/SearchProducts',
    qs: {
        PublisherId: AffilinetPublisherId,
        Password: AffilinetPassword,
        ImageScales: 'OriginalImage',
        LogoScales: 'Logo468',
        fq: 'EAN:' + product.EAN,
        PageSize: 500
    }
  };

  var body = await rp(options);
  body = JSON.parse(body.trim());
  body.Products.forEach(function(p){
    AddAffilinetListing(product, p);
  });

}

async function addProduct(affilinetProduct){
  //Check if this EAN is already handeled in this search

  var p = await Product.findOne({EAN: affilinetProduct.EAN});

  if(!p){

    //Get the category async
    var Category = getCategory();

    async function getCategory(){
      const CategoryTree = await getCategoryTreeAffilinet(affilinetProduct);
      return await getCategoryfromTree(CategoryTree, 'Affilinet');
    }

    p = await Product.create({EAN: affilinetProduct.EAN, Title: affilinetProduct.ProductName, Listings: []});
    
    var c = await Promise.resolve(Category);
    delete p.CategoryTree;
    p.Category = c._id;
  
  }

  AddAffilinetListing(p, affilinetProduct);

  //Find similar products in the Affilinet database
  await addSimilarAffilinetProducts(p);
  
  //Save product
  p = await p.save();
  return p

}

 async function searchAffilinet(query, callback){

  var options = {
    uri: 'https://product-api.affili.net/V3/productservice.svc/JSON/SearchProducts',
    qs: {
        PublisherId: AffilinetPublisherId,
        Password: AffilinetPassword,
        ImageScales: 'OriginalImage',
        LogoScales: 'Logo468',
        Query: query,
        PageSize: 20
    }
  };

  
  var body = await rp(options);

  body = JSON.parse(body.trim());

  var Products = []

  await asyncForEach(body.Products, async affilinetProduct => {
    var p =  await addProduct(affilinetProduct);
    Products.push(p);
    if(p){
      callback(p);
    }
  })

  return Products;

}

module.exports = function(app){

  app.get('/affilinet', function(req, res){

    var time = Date.now();
    

    try{


      helper();

      async function helper(){
        var products = await searchAffilinet(req.query.query, function(p){
          
        });
        products =  products.filter( p => {return p != undefined});
        console.log(Date.now() - time + 'ms');
        res.send(products)
      }
      

      

    } catch(er){

      console.log(er);
      res.status(404);
      res.send('Internal server error');

    }

  });

};
