var {searchAffilinet} = require('./affiliateHandlers/affilinet');
var {populateProduct} = require('./libary')
var Website = require('../models/Website')

module.exports = function(app){

  app.get('/website', async function(req, res){


    var w = await Website.findOne({Title: req.query.title})
    if(!w){
      w = await Website.create({Title: req.query.title})
    }
    res.send(w);

  });

  try{

     //async product search thru websocket
    return function(s){
      s.on('createBlog', async function (data) {

        var w = await Website.findOne({Title: data.website})

        if(data.blog){
          
          w.Blogs.push(data.blog).isNew;

          w.save()
    
          s.emit('newBlog', w.Blogs[w.Blogs.length-1]); //Send to requester
  
        } else {
          s.emit('errorMsg', 'Unable to create category ' + data.blog + ', check if the Title was entered correctly');
        }
        
      })

      s.on('modifyBlog', async function (data) {

        var w = await Website.findOne({Title: data.website})

        if(data.blog){
          
          var i = await w.Blogs.findIndex(b => b._id == data.blog._id)

          var blog = data.blog
          //delete blog._id
          w.Blogs.set(i, blog)
          w.save();
    
          s.emit('modifyBlog', data.blog); //Send to requester
  
        } else {
          s.emit('errorMsg', 'Unable to create category ' + data.blog.Title + ', check if the Title was entered correctly');
        }
        
      })

      s.on('deleteBlog', async function (data) {

        var w = await Website.findOne({Title: data.website})

        if(data.blog){
          
          await w.Blogs.id(data.blog._id).remove();
          w.save();

          s.emit('deleteBlog', data.blog); //Send to requester
  
        } else {
          s.emit('errorMsg', 'Internal server error');
        }
        
      })
    }
   
  }catch(er){
    console.log(er)
  }

  
};
