
var { populateProduct } = require('./libary')
var Product = require('../models/Product')
var s24 = require('./affiliateHandlers/s24')
var affilinet = require('./affiliateHandlers/affilinet');
var affiliate = require('./affiliateHandlers/affiliateLibary')

module.exports = function (app) {

  app.post('/searchProducts', async function (req, res) {

    var time = Date.now();

    try {

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

          //If no category is listed
        } else if (req.body.query) {

          helper();

         async function helper(){
           let products = await affiliate.search(req.body.query, 20, function(p){
             
           })

           products = products.filter(p => { 
             return p != null;
           })
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

         
          affiliate.search(data.query, data.maxResults, async function (p) {
            //p = await populateProduct(p);
            s.emit('product', p);
          });

        }

      })
    }

  } catch (er) {
    console.log(er)
  }


};
