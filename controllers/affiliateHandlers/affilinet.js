var rp = require('request-promise-native');

var AffilinetPublisherId = '821350';
var AffilinetPassword = '9j3msjLqmyVvXns5tKZ7';

//Transformes affilinet data to database data schema
function mapProduct(product) {


  function getCategoryTree() {

    //Get Categorie Title
    var CategoryTree = [];
    product.ShopCategoryPath.replace(/[\u00C0-\u017FA-Za-z &]+/g, function (match, g1, g2) {
      CategoryTree.push({
        title: match.trim()
      });
    });
  
    //Get Categorie id and affiliateProgramm
    var i = 0;
    product.ShopCategoryIdPath.replace(/\d+/g, function (match, g1, g2) {
      if (CategoryTree[i]) {
        CategoryTree[i].id = match;
        CategoryTree[i].affiliateProgram = 'affilinet'
        i++;
      }
    });
  
    return CategoryTree;
  }

  function getImages() {
    var Images = [];
    product.Images.forEach(function (i) {
      i.forEach(function (ri) {
        Images.push({
          URL: ri.URL,
          Width: ri.Width,
          Height: ri.Height
        });
      });
    });
    return Images;
  }

  function getLogos() {
    var Logos = [];
    product.Logos.forEach(function (l) {
      Logos.push(l.URL);
    });
    return Logos;
  }

  var pricePatt = /\d*[.]\d{2}/;

  return {
    EAN: product.EAN,
    Title: product.ProductName,
    CategoryTree: getCategoryTree(),
    Listings: [{
      AffiliateProgram: 'Affilinet',
      AffiliateProgramProductId: product.ProductId,
      Title: product.ProductName,
      Description: product.Description,
      DescriptionShort: product.DescriptionShort,
      Deeplink: product.Deeplink1,
      Images: getImages(),
      DisplayPrice: product.PriceInformation.DisplayPrice,
      DisplayShipping: product.PriceInformation.DisplayShipping,
      Price: Number(pricePatt.exec(product.PriceInformation.DisplayPrice)),
      Shipping: Number(pricePatt.exec(product.PriceInformation.DisplayShipping)),
      Brand: product.Brand,
      Logos: getLogos()
    }]

  }
}


//Returns similar products
async function findSimilarProducts(product) {

  if (!product.EAN) {
    return []
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


  let mapedProducts =  await Promise.all( body.Products.map(async p => {
    return await mapProduct(p)
  }));

  if(mapedProducts){
    return mapedProducts
  } else {
    return  []
  }

}


async function search(query, maxResults, page) {

  if(maxResults > 500){
    maxResults = 499
  }


  var options = {
    uri: 'https://product-api.affili.net/V3/productservice.svc/JSON/SearchProducts',
    qs: {
      PublisherId: AffilinetPublisherId,
      Password: AffilinetPassword,
      ImageScales: 'OriginalImage',
      LogoScales: 'Logo468',
      Query: query,
      PageSize: maxResults,
      CurrentPage: page
    }
  };


  var body = await rp(options);

  body = JSON.parse(body.trim());

  products = await Promise.all(body.Products.map(async p => {
    return mapProduct(p);
  }));

  if(products){
    return products;
  } else {
    return  []
  }
  

}

module.exports.search = search;
module.exports.findSimilarProducts = findSimilarProducts;