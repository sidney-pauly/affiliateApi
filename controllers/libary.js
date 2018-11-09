var Category = require('../models/Category.js');
var Product = require('../models/Category');
var Session = require('../models/Session')


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


async function mergeCategories(cat1, cat2){

  //Append all children of cat2 to cat1
  var children = await Category.find({ Parent: cat2._id });
  children.forEach(function (c) {
    appendCategory(cat1, c)
  })

  
  //Merge aliases of cat1 and cat2
  var aliases = cat1.Aliases.concat(cat2.Aliases);
  cat1.Aliases = aliases;
  cat1 = await cat1.save()
  

  //Link the 2nd category to the first one to divert all new found products to it
  cat2.Link = cat1._id;
  cat2.save()

  //Change the categories of products that had cat2 to cat1
  var productsToChange = await Product.find({ Category: cat2._id })
  productsToChange.forEach(function (p) {
    p.Category = cat1._id;
    p.save();
  })

  //Return cat 1 (conatnes both now)
  return cat1

}

module.exports.asyncForEach = asyncForEach;
module.exports.findAllChildren = findAllChildren;
module.exports.appendCategory = appendCategory;
module.exports.isParentOf = isParentOf;
module.exports.populateProduct = populateProduct;
module.exports.makeid = makeid;
module.exports.validateSession = validateSession;
module.exports.mergeCategories = mergeCategories;


