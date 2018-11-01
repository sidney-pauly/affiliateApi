var { makeid } = require('./libary')
var User = require('../models/User')
var Session = require('../models/Session')

module.exports = function (app) {

  app.post('/login', async function (req, res) {

    try {
      
      var user = await User.findOne({ Username: req.body.username })
      console.log(req.body.username)
      if (user) {
        if (user.Password === req.body.password) {
          let session = await Session.create({ SessionKey: makeid(25), Level: user.Level, User: user._id})
          res.send(session);
        }
        else {
          res.status(401)
          res.send('Password or Username incorrect')
        }
      }
      else {
        res.status(401)
        res.send('Password or Username incorrect')
      }

    }
    catch (er) {
      console.log(er)
      res.status(404)
      res.send('Password or Username incorrect')
    }

  });

}