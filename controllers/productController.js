var Product = require('../models/Product.js');
var Category = require('../models/Category.js');
var { asyncForEach, findAllChildren, validateSession } = require('./libary.js');

module.exports = function (app) {

  app.get('/product', function (req, res) {

    Product.findById(req.query.id).then(function (p) {
      res.send(p);
    }).catch(function (er) {
      console.log(er);
      res.status(404);
      res.send('internal server error');
    });


  });

  app.get('/allProducts', function (req, res) {

    Product.find().then(function (p) {
      res.send(p);
    }).catch(function (er) {
      console.log(er);
      res.status(404);
      res.send('internal server error');
    });


  });

  app.get('/productsOfCategory', async function (req, res) {

    try {

      var category = await Category.findById(req.query.category);

      //Get all child categories
      var categories = await findAllChildren(category)

      //Get products of categories
      var categories = await Promise.all(categories.map(c => {
        return Product.find({ Category: c._id });
      }))

      var products = [];

      categories.forEach(c => {
        products = products.concat(c)
      })

      res.send(products)
    } catch (er) {
      console.log(er);
      res.status(404);
      res.send('internal server error');
    }

  });

  try {

    //Modify Products
    return function (s) {

      s.on('modifyProduct', async function (data) {

        if (await validateSession(data.session, 0)) {

          if (data.products) {

            data.products.forEach(async p => {

              pro = await Product.findOne({_id: p._id});
              
              if(pro){

                //Set new product data
                pro.Title = p.Title;
                pro.DescriptionCustom = p.DescriptionCustom;
                pro.Category = p.Category;

                pro.save();

                s.emit('modifyProduct', pro); //Send to requester
              } else {
                s.emit('errorMsg', { msg: 'Product not found', code: 404, item: 'Product' });
              }

            })

            

          } else {
            s.emit('errorMsg', { msg: 'No products found', code: 10000});
          }

        } else s.emit('errorMsg', { msg: 'unautherised', code: 403 });

      })

    }

  } catch (er) {
    console.log(er)
  }


};
