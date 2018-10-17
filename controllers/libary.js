var Category = require('../models/Category.js');

module.exports= {
    asyncForEach: async function(array, callback) {
        for (let index = 0; index < array.length; index++) {
            await callback(array[index], index, array)
        }
    },
      
      //Returns the apropriate Category based on the given product key
      //Missing categories in the given tree get created
    getCategoryFromTree: function(categoryTree, affiliateProgram){
      
        async function verifyLevel(level, parent){
      
          //Find existing Category based
          //Check if there is an exactly same category from the same retailer
          //If not do a regex compareson of the title
          var regExp = new RegExp('^' + categoryTree[level].Title.trim() + '$', 'i')
          var c = await Category.findOne(
              {
                Level: level,
                Aliases: {$elemMatch: {$or: [
                    {Id: categoryTree[level].Id, AffiliateProgram: affiliateProgram},
                    {Title: { $regex: regExp }}
                ]}}})
      
          //if Category doesn't exist create one
          if(!c){
            c = await Category.create({
              Title: categoryTree[level].Title,
              Level: level,
              Aliases: [{Title: categoryTree[level].Title, Id: categoryTree[level].Id, AffiliateProgram: affiliateProgram}],
              Parent: parent
            });
          }
      
          //if there is another category in the tree match it
          if(categoryTree[level+1]){
            return verifyLevel(level+1, c._id);
          } else {
            return c;
          }
      
        }
      
        return verifyLevel(0, undefined);
      
      }
}
