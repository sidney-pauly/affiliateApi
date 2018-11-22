var rp = require('request-promise-native');

var Id = 'efcb625b';
var Password = 'kunygvpjr4xqnpclmf97nbuzjigky0ek';

//Transformes affilinet data to database data schema
async function mapProduct(product) {
  try {
    //Get Category path
    function getCategoryTree() {

      if (product.parentcategories) {
        //Get category path
        let CategoryTree = product.parentcategories.map(c => {
          return {
            id: c.id,
            title: c.name,
            affiliateProgram: 's24'
          }
        })

        CategoryTree.push({
          id: product.category.id,
          title: product.category.name,
          affiliateProgram: 's24'
        })

        //Remove first category as it is not essential
        CategoryTree.splice(0, 1)


        return CategoryTree;
      } else {
        return [{id: undefined,
          title: 'Sonstiges',
          affiliateProgram: 's24'}]
      }

    }

    //Get product images
    let images = product.productImage.map(i => {
      let link = i.links.find(l => l.rel == 'image-original').href
      return {
        URL: link,
        Width: 500,
        Height: 500
      }
    })

    //Get all listings
    async function getListings() {
      return await Promise.all(product.shops.shopitems.map(async function (s) {

        //Get deeplink
        let deeplink = s.links.find(l => l.rel == 'clickout').href

        return {
          AffiliateProgram: 's24',
          AffiliateProgramProductId: product.id,
          Title: product.title,
          Description: product.description,
          DescriptionShort: product.description,
          Deeplink: deeplink,
          Images: images,
          DisplayPrice: s.costs.price.price,
          DisplayShipping: s.costs.shipping.price,
          Price: s.costs.price.priceInCents / 100,
          Shipping: s.costs.shipping.priceInCents / 100,
          Brand: product.Brand,
          Logos: [s.imageResource.links[0].href]
        }
      }));
    }

    return {
      EAN: product.ean,
      Title: product.title,
      CategoryTree: getCategoryTree(),
      Listings: await getListings()
    }
  } catch (er) {
    console.log(er)
    return undefined
  }
}


//Returns similar products
async function findSimilarProducts(product) {

  if (!product.EAN) {
    return [];
  }

  var options = {
    uri: 'https://api.s24.com/v3/' + Id + '/ean/' + product.EAN,
    headers: {
      authorization: 'Basic ' + Buffer.from(Id + ':' + Password).toString('base64'),
      Accept: 'application/json'
    }
  };

  var body = JSON.parse(await rp(options));


  return await Promise.all(body.products.map(async p => {
    return await mapProduct(p)
  }));

}


async function search(query, maxResults, page) {


  var options = {
    uri: 'https://api.s24.com/v3/' + Id + '/search',
    headers: {
      authorization: 'Basic ' + Buffer.from(Id + ':' + Password).toString('base64'),
      Accept: 'application/json'
    },
    qs: {
      q: query,
      pageElements: maxResults,
      page: page
    }
  };

  try {
    var body = JSON.parse(await rp(options))
    var products = body.products;
  } catch (err) {
    console.log(err)
  }

  products = await Promise.all(body.products.map(async p => {
    return mapProduct(p);
  }));

  return products;

}

module.exports.search = search;
module.exports.findSimilarProducts = findSimilarProducts;