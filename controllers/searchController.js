var {searchAffilinet} = require('./affiliateHandlers/affilinet');
var {populateProduct} = require('./libary')
var Product = require('../models/Product')

module.exports = function(app){

  app.get('/searchProducts', function(req, res){

    var time = Date.now();
    

    try{


      helper();

      async function helper(){
        var products = await searchAffilinet(req.query.query, 20, function(p){
          
        });
        products =  products.filter( p => {return p != undefined});
        products = await Promise.all(products.map(async p => {
          return p = await populateProduct(p);
        }))
        console.log(Date.now() - time + 'ms');
        res.send(products)
      }
      
    } catch(er){

      console.log(er);
      res.status(404);
      res.send('Internal server error');

    }

  });

  try{

     //async product search thru websocket
    return function(s){
      s.on('getProducts',async function (data) {
        
        //Determines how the database should be searched
        if(!data.query && data.categories){
          
          data.categories.forEach(c => {
            var date = Date.now();
            Product.find({Category: c}).then(function(products){
              console.log((Date.now() - date) + 'ms')

                products.forEach(function(pro){
                  s.emit('product', pro);
                })
                
              
              
            })
          });

          
        } else if(data.query){

          searchAffilinet(data.query, data.maxResults,async function(p){
            p = await populateProduct(p);
            s.emit('product', p);
          });

        }
          

        
        
      })
    }
   
  }catch(er){
    console.log(er)
  }

  
};
