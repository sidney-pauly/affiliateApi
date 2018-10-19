var rp = require('request-promise-native');
var Product = require('../../models/Product');
var Category = require('../../models/Category');
var {asyncForEach, getCategoryFromTree} = require('../libary.js');

var AffilinetPublisherId = '821350';
var AffilinetPassword = '9j3msjLqmyVvXns5tKZ7';

function getCategoryTreeAffilinet(product){

  //Get Categorie Title
  var CategoryTree = [];
  product.ShopCategoryPath.replace(/[\u00C0-\u017FA-Za-z &]+/g, function(match, g1, g2) {
    CategoryTree.push({Title: match.trim()});
  });

  //Get Categorie id
  var i = 0;
  product.ShopCategoryIdPath.replace(/\d+/g, function(match, g1, g2) {
    if( CategoryTree[i]){
      CategoryTree[i].Id = match;
    i++;
    }
  });

  return CategoryTree;
}


async function AddAffilinetListing(product, listing){

  function getImages(){
    var Images = [];
    listing.Images.forEach(function(i){
      i.forEach(function(ri){
        Images.push({URL: ri.URL, Width: ri.Width, Height: ri.Height});
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

  if(!product.EAN){
    return
  }

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

  if(!p || !affilinetProduct.EAN){

    //Get the category async
    var Category = getCategory();

    async function getCategory(){
      const CategoryTree = await getCategoryTreeAffilinet(affilinetProduct);
      return await getCategoryFromTree(CategoryTree, 'Affilinet');
    }

    p = await Product.create({EAN: affilinetProduct.EAN, Title: affilinetProduct.ProductName, Listings: []});
    
    var c = await Promise.resolve(Category);
    p.Categorie = c;
    delete p.CategoryTree;
    if(!c){
      return
    }
  }

  AddAffilinetListing(p, affilinetProduct);

  //Find similar products in the Affilinet database
  await addSimilarAffilinetProducts(p);
  
  //Save product
  return await p.save();

}

module.exports = {
  searchAffilinet: async function(query, maxResults, callback){

    var options = {
      uri: 'https://product-api.affili.net/V3/productservice.svc/JSON/SearchProducts',
      qs: {
          PublisherId: AffilinetPublisherId,
          Password: AffilinetPassword,
          ImageScales: 'OriginalImage',
          LogoScales: 'Logo468',
          Query: query,
          PageSize: maxResults
      }
    };
  
    
    var body = await rp(options);
  
    body = JSON.parse(body.trim());
  
    var Products = []
    var EANs = [];
  
    await asyncForEach(body.Products, async affilinetProduct => {

      if(!EANs.find(e => e === affilinetProduct.EAN)){

        var p =  await addProduct(affilinetProduct);
        EANs.push(affilinetProduct.EAN);

        if(p){
          p = await Product.findById(p._id).populate('Category').exec(function(err, pe){
            Products.push(pe);
          
            callback(pe);
          })
        }
   
      }
    })
  
    return Products;
  
  }
}

