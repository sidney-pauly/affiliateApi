var { searchAffilinet } = require('./affiliateHandlers/affilinet');
var { populateProduct } = require('./libary')
var Product = require('../models/Product')

module.exports = function (app) {

  app.post('/searchProducts', function (req, res) {

    var time = Date.now();


    try {

      helper();

      async function helper() {
        if (req.body.categories && req.body.categories.length > 0) {

          var pro = await Promise.all(req.body.categories.map(c => {
            return Product.find({ Category: c }).then(function (products) {

              //RegEx to compare the title to the query
              //Case insesitive
              var regex = new RegExp(req.body.query, "i");

              if (req.body.qeury) {
                products.filter(p => regex.test(p))
              }

              return products;

            });

          }));

          var resProducts = [];

          pro.forEach(p => {
            resProducts = resProducts.concat(p);
          })

          res.send(resProducts)

        } else if (req.body.query) {



          var products = await searchAffilinet(req.body.query, 20, function (p) {

          });
          products = products.filter(p => { return p != undefined });
          products = await Promise.all(products.map(async p => {
            return p = await populateProduct(p);
          }))
          console.log(Date.now() - time + 'ms');
          res.send(products)

        }
      }
    } catch (er) {

      console.log(er);
      res.status(404);
      res.send('Internal server error');

    }

  });

  try {

    //async product search thru websocket
    return function (s) {
      s.on('getProducts', async function (data) {

        //Determines how the database should be searched

        if (data.categories && data.categories.length > 0) {

          data.categories.forEach(c => {
            Product.find({ Category: c }).then(function (products) {

              //RegEx to compare the title to the query
              //Case insesitive
              var regex = new RegExp(data.query, "i");

              products.forEach(function (pro) {
                if (data.query) {
                  if (regex.test(pro.Title)) {
                    s.emit('product', pro);
                  }
                } else {
                  s.emit('product', pro);
                }

              })


            })
          });

        } else if (data.query) {

          searchAffilinet(data.query, data.maxResults, async function (p) {
            p = await populateProduct(p);
            s.emit('product', p);
          });

        }




      })
    }

  } catch (er) {
    console.log(er)
  }


};
