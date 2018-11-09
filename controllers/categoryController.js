var Category = require('../models/Category.js');
var Product = require('../models/Product.js');

var { findAllChildren, appendCategory, isParentOf, validateSession, mergeCategories } = require('./libary.js');

module.exports = function (app) {

  app.get('/categories', function (req, res) {

    Category.find().then(function (c) {
      res.send(c);
    }).catch(function (er) {
      console.log(er);
      res.code(404);
      res.send('internal server error');
    });


  });

  try {

    //async product search thru websocket
    return function (s) {
      s.on('getCategories', function (data) {

        Category.find().then(function (c) {
          s.emit('categories', c);
        })

      })

      s.on('renameCategory', async function (data) {

        if (await validateSession(data.session, 0)) {

          var cat = await Category.findById(data._id);

          if (cat && data.Title) {

            cat.Title = data.Title
            cat = await cat.save()
            s.broadcast.emit('categoryChanged', cat, true); //Send to everybody exept requester
            s.emit('categoryChanged', cat, true); //Send to requester

          } else {
            s.emit('errorMsg', 'Unable to change category ' + data._id + ', check if the Title was entered correctly');
          }
        } else
          s.emit('errorMsg', { msg: 'unautherised', code: 403 });
      })

      s.on('createCategory', async function (data) {

        if (await validateSession(data.session, 0)) {
          if (data.Title) {

            var parentCat = await Category.findById(data._id);

            var cat = await Category.create({
              Title: data.Title,
              Parent: data._id
            });

            s.broadcast.emit('newCategory', cat, true); //Send to everybody exept requester
            s.emit('newCategory', cat, true); //Send to requester

          } else {
            s.emit('errorMsg', 'Unable to create category ' + data.Title + ', check if the Title was entered correctly');
          }
        } else
          s.emit('errorMsg', { msg: 'unautherised', code: 403 });

      })

      s.on('deleteCategory', async function (data) {

        if (await validateSession(data.session, 0)) {
          var cat = await Category.findById(data._id);

          if (cat) {

            //Delete all links to this category
            var linkingCategories = await Category.find({ Link: data._id });
            linkingCategories.forEach(function (c) {
              c.Link = undefined;
              c.save();
            })

            var children = await findAllChildren(cat);
            children.push(cat); //add parent category to also deleted it
            s.emit('deletedCategory', cat, false); //Send to requester

            children.forEach(function (c, i) {
              c.remove(); //Delete the category
              if (i < children.length - 1) {
                s.broadcast.emit('deletedCategory', c, false); //Send to everybody exept requester
                s.emit('deletedCategory', c, false); //Send to requester
              } else {
                s.broadcast.emit('deletedCategory', c, true); //Send to everybody exept requester
                s.emit('deletedCategory', c, true); //Send to requester
              }

            })

          } else {
            s.emit('errorMsg', 'Unable to delete category ' + data._id + ', the category was not found');
          }

        } else
          s.emit('errorMsg', { msg: 'unautherised', code: 403 });

      })

      s.on('appendCategory', async function (data) {

        if (await validateSession(data.session, 0)) {
          var cat1 = await Category.findById(data.Category1._id);
          var cat2 = await Category.findById(data.Category2._id);

          if (cat1 && cat2) {

            if (await isParentOf(cat2, cat1)) {
              s.emit('errorMsg', { msg: 'cannot append parent to child', code: 10000 });
              return
            }

            cat2 = await appendCategory(cat1, cat2);

            s.broadcast.emit('categoryChanged', cat2, true); //Send to everybody exept requester
            s.emit('categoryChanged', cat2, true); //Send to requester

          } else {
            s.emit('errorMsg', { msg: 'Category not found', code: 404, item: 'Kategorie' });
          }
        } else
          s.emit('errorMsg', { msg: 'unautherised', code: 403 });

      })

      //Merge Categories
      s.on('mergeCategories', async function (data) {

        if (await validateSession(data.session, 0)) {

          var cat1 = await Category.findById(data.Category1._id);
          var cat2 = await Category.findById(data.Category2._id);

         

          if (cat1 && cat2) {

            if (await isParentOf(cat2, cat1)) {
              s.emit('errorMsg', { msg: 'Parent cannot be merged with child', code: 10000 });
              return
            }

            //Send deleted to update hud
            s.broadcast.emit('deletedCategory', cat2, false); //Send to everybody exept requester
            s.emit('deletedCategory', cat2, false); //Send to requester

            let c = await mergeCategories(cat1, cat2)
            
            s.broadcast.emit('categoryChanged', c, true); //Send to everybody exept requester
            s.emit('categoryChanged', c, true); //Send to requester
            

          } else {
            s.emit('errorMsg', { msg: 'Check input data', code: 10000 });
          }
        } else
          s.emit('errorMsg', { msg: 'unautherised', code: 403 });

      })

    }

  } catch (er) {
    console.log(er)
  }


};
