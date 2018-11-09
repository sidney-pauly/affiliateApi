var Category = require('../../models/Category')
  
  //Returns the apropriate Category based on the given product key
  //Missing categories in the given tree get created
  var getCategoryFromTree = async function(categoryTree, affiliateProgram){

    var sonstiges = await Category.findOne({Title: 'Sonstiges'});
  
    async function verifyLevel(level, parent, top){
  
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
  
  
      if(!c && level == 0 && top){
        c = sonstiges;
        level -= 1;
      }
  
      //if Category doesn't exist create one
      if(!c){
  
        //If category is new put it in Sonstiges
        if(!parent){
          console.log('created cat with ')
          parent = sonstiges._id;
        }
  
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
      c = await verifyLevel(0, undefined, true);
      c = await getLinkedCategory(c)
      return c
    } else {
        return
    }
  
  
  }

  //Finds the referenced category
  async function getLinkedCategory(cat){
    var c = await Category.findById(cat.Link)
    if(c){
      return getLinkedCategory(c);
    } else {
      return cat
    }
  }
  

  module.exports.getCategoryFromTree = getCategoryFromTree;