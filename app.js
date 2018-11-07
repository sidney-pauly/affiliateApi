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
var userController = require('./controllers/userController.js')
var User = require('./models/User')
var config = require('./config')

const host = process.env.HOST || '127.0.0.1'
const port = process.env.PORT || 3000


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
var SocketCreatedProductCon = productController(app);
userController(app);
var SocketCreatedCategoryCon = categoryController(app);
var SocketCreatedWebsiteCon = websiteController(app);

//Setup socket io
  io.on('connection', function (s) {
    SocketCreatedSearchCon(s)
    SocketCreatedProductCon(s)
    SocketCreatedCategoryCon(s)
    SocketCreatedWebsiteCon(s)
 });


//Create admin user
User.findOne({Username: config.admin.username, Password: config.admin.password}).then(function(u){
  if(!u){
    User.create({Username: config.admin.username, Password: config.admin.password, Level: 0})
  }
})


server.listen(port, host)
  console.log(`Server listening on http://${host}:${port}`)

