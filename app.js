var express = require('express');
var app = express();
var mongoose = require('mongoose');
var server = require('http').Server(app);
var io = require('socket.io')(server);
var searchController = require('./controllers/searchController.js')
var productController = require('./controllers/productController.js')
var categoryController = require('./controllers/categoryController.js')







//set up template engine
app.set('view engine', 'ejs');

//Connect to Database
ConnectToDatabase();

function ConnectToDatabase(){
  console.log('Trying to connect to Database ...')
  mongoose.connect('mongodb://localhost:27017/Affiliate', { useNewUrlParser: true }).then(function(){
    console.log('Connected to Database');
  }).catch( function(err) {
      console.log('Unable to connect to Database ... retrying every 5sec');
      setTimeout(function(){
        ConnectToDatabase();
      }, 5000);
  })
}


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
var SocketCreatedSearchCon = searchController(app);
productController(app);
var SocketCreatedCategoryCon = categoryController(app);

//Setup socket io
  io.on('connection', function (s) {
    SocketCreatedSearchCon(s)
    SocketCreatedCategoryCon(s)
 });



server.listen(3001);
console.log('Listening to port 3001 on localhost');
