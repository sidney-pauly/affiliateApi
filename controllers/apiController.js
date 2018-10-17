var {searchAffilinet} = require('../controllers/affiliateHandlers/affilinet');

module.exports = function(app, socket){

  app.get('/affilinet', function(req, res){

    var time = Date.now();
    

    try{


      helper();

      async function helper(){
        var products = await searchAffilinet(req.query.query, function(p){
          
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

//async product search thru websocket
Promise.resolve(socket).then(function(s){
  s.on('getProducts', function (data) {

    searchAffilinet(data.query, function(p){
      s.emit('product', p);
    });

  })
})
  
};
