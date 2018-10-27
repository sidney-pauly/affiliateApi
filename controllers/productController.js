var Product = require('../models/Product.js');
var {findAllChildren} = require('../libary.js');

module.exports = function(app){

  app.get('/product', function(req, res){

      Product.findById(req.query.id).then(function(p){
        res.send(p);
      }).catch(function(er){
        console.log(er);
        res.code(404);
        res.send('internal server error');
      });


  });

  app.get('/productsOfCategory', function(req, res){

    var categories = findAllChildren(req.query.category)

    categories.forEach

    Product.find({Category: req.query.category}).then(function(p){
      res.send(p);
    }).catch(function(er){
      console.log(er);
      res.code(404);
      res.send('internal server error');
    });


});


};
