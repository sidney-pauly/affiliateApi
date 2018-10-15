var request = require('request');
var rp = require('request-promise-native');
var Product = require('../models/Product.js');
var Category = require('../models/Category.js');

var AffilinetPublisherId = '821350';
var AffilinetPassword = '9j3msjLqmyVvXns5tKZ7';

//Returns the apropriate Category based on the given product key
//Missing categories in the given tree get created
function getCategoryfromTree(categoryTree, affiliateProgram){

  return verifyLevel(0, undefined)

  function verifyLevel(level, parent){

    var promiseChain = Promise.resolve();

    //Find missing Category
    promiseChain = promiseChain.then(function(){
      return Category.findOne({Level: level, Aliases: {$elemMatch: {Id: categoryTree[level].Id, AffiliateProgram: affiliateProgram}}})
    });

    promiseChain = promiseChain.then(function(c){
      //if Category doesn't exist create one
      if(!c){
        return Category.create({
          Title: categoryTree[level].Title,
          Level: level,
          Aliases: [{Title: categoryTree[level].Title, Id: categoryTree[level].Id, AffiliateProgram: affiliateProgram}],
          Parent: parent
        });
      } else {
        return c;
      }
    });

    //if there is another category in the tree check it
    promiseChain = promiseChain.then(function(c){
        if(categoryTree[level+1]){
          return verifyLevel(level+1, c._id);
        } else {
          return c;
        }
    })

    return promiseChain;
  }

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


function AddAffilinetListing(product, listing){

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
    var existingListingId = product.Listings.findIndex(function(l){
      return l.AffiliateProgram === 'Affilinet' && l.AffiliateProgramProductId === listing.ProductId;
    });

    if(existingListingId > -1){
      product.Listings[existingListingId].set(data);
    } else {
      product.Listings.push(data).isNew;
      //Mark listing as news
    }

}

function addSimilarAffilinetProducts(product){

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

  return rp(options).then(function(body){

    body = JSON.parse(body.trim());

    body.Products.forEach(function(p){
      AddAffilinetListing(product, p);
    });

    return(product);
  });
}

function searchAffilinet(query){

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

  return rp(options).then(function(body){

    body = JSON.parse(body.trim());
    var EANs = [];

    return Promise.all(body.Products.map((product) => {

      //Check if this EAN is already handeled in this search
      if(EANs.find( EAN => {return EAN === product.EAN}) === undefined){

        var promiseChain = Promise.resolve();

        promiseChain = promiseChain.then(function(){
      

          EANs.push(product.EAN);
          return Product.findOne({EAN: product.EAN})
  
        })
        
        //Create product if no similar ones exsist
        promiseChain = promiseChain.then(function(p){
          if(!p){
            return Product.create({EAN: product.EAN, Title: product.ProductName, Listings: []});
          } else {
            return p;
          }
        })

        //Find similar products in the Affilinet database
        promiseChain = promiseChain.then(function(p){
          
            AddAffilinetListing(p, product);
            return addSimilarAffilinetProducts(p);
    
        })

        return promiseChain;
      }

    }));

  });

}

module.exports = function(app){

  app.get('/affilinet', function(req, res){

    var time = Date.now();

    searchAffilinet(req.query.query).then(function(products){


      
      //Filter out all undefined elements and then send array
      products =  products.filter( p => {return p != undefined});
      console.log(Date.now() - time + 'ms');

      var pr = [];
      var promiseChain = Promise.resolve(pr);

      //Loop thru the products and perform operations sychronos
      products.forEach(p => {

        promiseChain = promiseChain.then(pr => {

          //Get prodcut category
          return getCategoryfromTree(getCategoryTreeAffilinet(p), 'Affilinet').then(function(c){
            p.Category = c._id;
            return p;
          }).then(function(p){
            return p.save();
          }).then(function(p){
            pr.push(p);
            return pr;
          })
        })

      });

      

    }).then(function(products){

      res.send(products)

    }).catch(function(er){

      console.log(er);
      res.code(404);
      res.send('Internal server error');
    });

  });

};
