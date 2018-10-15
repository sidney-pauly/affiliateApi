var express = require('express');
var mongoose = require('mongoose');
var apiController = require('./controllers/apiController.js')
var productController = require('./controllers/productController.js')


//Setup express
var app = express();


//set up template engine
app.set('view engine', 'ejs');

//Connect to Database
mongoose.connect('mongodb://localhost:27017/Affiliate');

//static files
app.use(express.static('./public'));

//Set default Headers
app.use(function (req, res, next) {

  res.setHeader('Access-Control-Allow-Origin', 'http://localhost:3000');

  // Request methods you wish to allow
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE');

  // Request headers you wish to allow
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type');

  next();
});

//fire Controllers
apiController(app);
productController(app);


app.listen(3001);
console.log('Listening to port 3001 on localhost');
