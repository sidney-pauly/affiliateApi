var express = require('express');
var app = express();
var bodyParser = require('body-parser');
var cors = require('cors')
var mongoose = require('mongoose');
var server = require('http').Server(app);
var io = require('socket.io')(server);
var searchController = require('./controllers/searchController.js')
var productController = require('./controllers/productController.js')
var categoryController = require('./controllers/categoryController.js')
var websiteController = require('./controllers/websiteController.js')



//set up template engine
app.set('view engine', 'ejs');

//Use body parser
app.use(bodyParser.json());

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

var whitelist = ['http://localhost:3000', 'http://localhost:3001', '127.0.0.1:3001']
var corsOptions = {
  origin: function (origin, callback) {
    //Allow all origins
    callback(null, true)
    /*
    if (whitelist.indexOf(origin) !== -1) {
      callback(null, true)
    } else {
      console.log('Unautherist acces from ' + origin)
    }
    */
  }
}

app.use(cors(corsOptions))


//fire Controllers
var SocketCreatedSearchCon = searchController(app);
productController(app);
var SocketCreatedCategoryCon = categoryController(app);
var SocketCreatedWebsiteCon = websiteController(app);

//Setup socket io
  io.on('connection', function (s) {
    SocketCreatedSearchCon(s)
    SocketCreatedCategoryCon(s)
    SocketCreatedWebsiteCon(s)
 });

server.listen(3001);
console.log('Listening to port 3001 on localhost');
