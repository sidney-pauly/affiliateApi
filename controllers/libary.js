var Category = require('../models/Category.js');
var Product = require('../models/Category');
var Session = require('../models/Session')

async function getLinkedCategory(cat){
  var c = await Category.findById(cat.Link)
  if(c){
    return getLinkedCategory(c);
  } else {
    return cat
  }
}

var asyncForEach = async function(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array)
    }
}

async function validateSession(session, level){
  s = await Session.findById(session._id);
  if(s){
    return (s.SessionKey == session.SessionKey && s.Level <= level)
  } else {
    return false;
  }
  
}

function makeid(length) {
  var text = "";
  var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

  for (var i = 0; i < length; i++)
    text += possible.charAt(Math.floor(Math.random() * possible.length));

  return text;
}
  
  //Returns the apropriate Category based on the given product key
  //Missing categories in the given tree get created
var getCategoryFromTree = async function(categoryTree, affiliateProgram){


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


}

var findAllChildren = async function(category){

  return await findChildren(category);

    async function findChildren(c){

      var children = await Category.find({Parent: c._id})
      await asyncForEach(children, async function(cc){

        children = children.concat(await findChildren(cc));
        
      })
      return children;

    }

}

async function isParentOf(parent, child){

  var children = await findAllChildren(parent);
  return children.some(c => c._id.toString() == child._id.toString());

}

//makes cat2 a child of cat1
var appendCategory = async function(cat1, cat2){
  var cat2Data = JSON.parse(JSON.stringify(cat2));
  delete cat2Data._id;
  var dummyCat2 = await Category.create(cat2Data);

  //change the parent of cat2 to cat1
  cat2.Parent = cat1._id;
  cat2 = await cat2.save();


  //Link the dummyCat2 to the cat2 to divert new products
  dummyCat2.Link = cat2._id;
  dummyCat2.save();

  return cat2;
}
async function populateProduct(product){

  return await product.populate('Category').execPopulate();
}

module.exports.asyncForEach = asyncForEach;
module.exports.getCategoryFromTree = getCategoryFromTree;
module.exports.findAllChildren = findAllChildren;
module.exports.appendCategory = appendCategory;
module.exports.isParentOf = isParentOf;
module.exports.populateProduct = populateProduct;
module.exports.makeid = makeid;
module.exports.validateSession = validateSession;


