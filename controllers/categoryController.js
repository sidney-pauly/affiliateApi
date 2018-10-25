var Category = require('../models/Category.js');
var Product = require('../models/Product.js');
var {findAllChildren, appendCategory, isParentOf} = require('./libary.js');

module.exports = function(app){

  app.get('/categories', function(req, res){

      Category.find().then(function(c){
        res.send(c);
      }).catch(function(er){
        console.log(er);
        res.code(404);
        res.send('internal server error');
      });


  });

  try{

    //async product search thru websocket
   return function(s){
      s.on('getCategories', function (data) {

        Category.find().then(function(c){
          s.emit('categories', c);
        })

      })

      s.on('renameCategory', async function (data) {

        var cat = await Category.findById(data._id);
        
        if(cat && data.Title){
          
        cat.Title = data.Title
        cat = await cat.save()
        s.broadcast.emit('categoryChanged', cat, true); //Send to everybody exept requester
        s.emit('categoryChanged', cat, true); //Send to requester

        } else {
          s.emit('errorMsg', 'Unable to change category ' + data._id + ', check if the Title was entered correctly');
        }
        
      })

      s.on('createCategory', async function (data) {

        if(data.Title){
          
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
        
      })

      s.on('deleteCategory', async function (data) {

        var cat = await Category.findById(data._id); 

        if(cat){

          //Delete all links to this category
          var linkingCategories = await Category.find({Link: data._id});
          linkingCategories.forEach(function(c){
            c.Link = undefined;
            c.save();
          })
        
          var children = await findAllChildren(cat);
          children.push(cat); //add parent category to also deleted it
          s.emit('deletedCategory', cat, false); //Send to requester

          children.forEach(function(c, i){
            c.remove(); //Delete the category
            if(i < children.length-1){
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
        
      })

      s.on('appendCategory', async function (data) {

        var cat1 = await Category.findById(data.Category1._id);
        var cat2 = await Category.findById(data.Category2._id);

        if(await isParentOf(cat2, cat1)){
          s.emit('cannot append parent to child');
          return 
        }
        
        if(cat1 && cat2){
          
          cat2 = await appendCategory(cat1, cat2);
 
          s.broadcast.emit('categoryChanged', cat2, true); //Send to everybody exept requester
          s.emit('categoryChanged', cat2, true); //Send to requester

        } else {
          s.emit('errorMsg', 'Unable to append category ' + data._id + ', the category was not found');
        }
        
      })

      //Merge Categories
      s.on('mergeCategories', async function (data) {

        var cat1 = await Category.findById(data.Category1._id);
        var cat2 = await Category.findById(data.Category2._id);

        if(await isParentOf(cat2, cat1)){
          s.emit('cannot merge parent and child with result of parent becoming child.');
          return 
        }

        if(cat1 && cat2){
          
          //Append all children of cat2 to cat1
          var children = await Category.find({Parent: cat2._id});
          children.forEach(function(c){
            appendCategory(cat1, c)
          })

          //Send deleted to update hud
          s.broadcast.emit('deletedCategory', cat2, false); //Send to everybody exept requester
          s.emit('deletedCategory', cat2, false); //Send to requester

          //Merge cat1 and cat2
          var aliases = cat1.Aliases.concat(cat2.Aliases);
          cat1.Aliases = aliases;
          cat1 = await cat1.save()
          s.broadcast.emit('categoryChanged', cat1, true); //Send to everybody exept requester
          s.emit('categoryChanged', cat1, true); //Send to requester

          

          //Link the 2nd category to the first one to divert all new found products to it
          cat2.Link = cat1._id;
          cat2.save()

          //Change the categories of products that had cat2 to cat1
          var productsToChange = await Product.find({Category: cat2._id})
          productsToChange.forEach(function(p){
            p.Category = cat1._id;
            p.save();
          })

        } else {
          s.emit('errorMsg', 'Unable to change category ' + data._id + ', check if the Title was entered correctly');
        }
        
      })

   }
  
 }catch(er){
   console.log(er)
 }


};
