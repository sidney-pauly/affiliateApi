var {searchAffilinet} = require('./affiliateHandlers/affilinet');

module.exports = function(app){

  app.get('/searchProducts', function(req, res){

    var time = Date.now();
    

    try{


      helper();

      async function helper(){
        var products = await searchAffilinet(req.query.query, 20, function(p){
          
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

  try{

     //async product search thru websocket
    return function(s){
      s.on('getProducts', function (data) {
        searchAffilinet(data.query, data.maxResults, function(p){
          s.emit('product', p);
        });

      })
    }
   
  }catch(er){
    console.log(er)
  }

  
};
