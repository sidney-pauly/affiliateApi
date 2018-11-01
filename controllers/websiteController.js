var { searchAffilinet } = require('./affiliateHandlers/affilinet');
var { validateSession } = require('./libary')
var Website = require('../models/Website')

module.exports = function (app) {

  app.get('/website', async function (req, res) {


    var w = await Website.findOne({ Title: req.query.title })
    if (!w) {
      w = await Website.create({ Title: req.query.title })
    }
    res.send(w);

  });

  app.get('/blog', async function (req, res) {

    try {

      var w = await Website.findOne({ Title: req.query.website })
      var b = await w.Blogs.find(b => b._id == req.query.id)

      res.send(b);
    }
    catch (er) {
      console.log(er)
      res.status(404)
      res.send('Blog not found')
    }

  });

  try {

    //async product search thru websocket
    return function (s) {

      s.on('createBlog', async function (data) {

        if (await validateSession(data.session, 0)) {

          var w = await Website.findOne({ Title: data.website })

          if (data.blog) {

            w.Blogs.push(data.blog).isNew;

            w.save()

            s.emit('newBlog', w.Blogs[w.Blogs.length - 1]); //Send to requester

          } else {
            s.emit('errorMsg', { msg: 'Please enter something before submitting a blog', code: 10000});
          }

        } else s.emit('errorMsg', { msg: 'unautherised', code: 403 });

      })

      s.on('modifyBlog', async function (data) {

        if (await validateSession(data.session, 0)) {

          var w = await Website.findOne({ Title: data.website })

          if (data.blog) {

            var i = await w.Blogs.findIndex(b => b._id == data.blog._id)

            var blog = data.blog
            //delete blog._id
            w.Blogs.set(i, blog)
            w.save();

            s.emit('modifyBlog', data.blog); //Send to requester

          } else {
            s.emit('errorMsg', { msg: 'Blog not found', code: 404, item: 'Blog' });
          }

        } else s.emit('errorMsg', { msg: 'unautherised', code: 403 });

      })

      s.on('deleteBlog', async function (data) {

        if (await validateSession(data.session, 0)) {

          var w = await Website.findOne({ Title: data.website })

          if (data.blog) {

            await w.Blogs.id(data.blog._id).remove();
            w.save();

            s.emit('deleteBlog', data.blog); //Send to requester

          } else {
            s.emit('errorMsg', { msg: 'Blog not found', code: 404, item: 'Blog' });
          }

        } else s.emit('errorMsg', { msg: 'unautherised', code: 403 });

      })
    }

  } catch (er) {
    console.log(er)
  }


};
