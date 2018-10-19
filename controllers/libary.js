var Category = require('../models/Category.js');

async function getLinkedCategory(cat){
  var c = await Category.findById(cat.Link)
  if(c){
    return getLinkedCategory(c);
  } else {
    return cat
  }
}

module.exports= {
    asyncForEach: async function(array, callback) {
        for (let index = 0; index < array.length; index++) {
            await callback(array[index], index, array)
        }
    },
      
      //Returns the apropriate Category based on the given product key
      //Missing categories in the given tree get created
    getCategoryFromTree: async function(categoryTree, affiliateProgram){

  
    async function verifyLevel(level, parent){
  
      //Find existing Category based
      //Check if there is an exactly same category from the same retailer
      //If not do a regex compareson of the title
      var regExp = new RegExp('^' + categoryTree[level].Title.trim() + '$', 'i')
      var c = await Category.findOne(
          {
            Parent: parent,
            Aliases: {$elemMatch: {$or: [
                {Id: categoryTree[level].Id, AffiliateProgram: affiliateProgram},
                {Title: { $regex: regExp }}
            ]}}})
  
      //if Category doesn't exist create one
      if(!c){
        c = await Category.create({
          Title: categoryTree[level].Title,
          Aliases: [{Title: categoryTree[level].Title, Id: categoryTree[level].Id, AffiliateProgram: affiliateProgram}],
          Parent: parent
        });
      }
  
      //if there is another category in the tree match it
      if(categoryTree[level+1]){
        return await verifyLevel(level+1, c._id);
      } else {
        return c;
      }
  
    }
  
    if(categoryTree[0]){
      c = await verifyLevel(0, undefined);
      c = await getLinkedCategory(c)
      return c
    } else {
        return
    }
    
  
  },
  findAllChildren: async function(Id){

    var children = [];

    findChildren(Id);
    
    async function findChildren(id){
      cs = await Category.find({Parent: id});
      children = children.concat(cs);
      cs.forEach(function(c){
        findChildren(c._id);
      })
    }

    return children;
    
  },
  //makes cat2 a child of cat1
  appendCategory: async function(cat1, cat2){
    var cat2Data = JSON.parse(JSON.stringify(cat2));
    delete cat2Data._id;
    var dummyCat2 = await Category.create(cat2Data);

    //change the parent of cat2 to cat1
    cat2.Parent = cat1._id;
    await cat2.save();

    //Link the dummyCat2 to the cat2 to divert new products
    dummyCat2.Link = cat2._id;
    dummyCat2.save();

    return cat2;
  }
}
