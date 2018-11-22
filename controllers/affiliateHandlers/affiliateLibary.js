var Category = require('../../models/Category')
var Product = require('../../models/Product')
var affilinet = require('./affilinet')
var s24 = require('./s24')
var config = require('../../config.js')
var {
    flatten,
    appendCategory
} = require('../libary')

//Returns the apropriate Category based on the given product key
//Missing categories in the given tree get created
var verifyCategory = async function (category, parent, top) {

    var sonstiges = await Category.findOne({
        Title: 'Sonstiges'
    });


    //Find existing Category based
    //Check if there is an exactly same category from the same retailer
    //If not do a regex compareson of the title
    var regExp = new RegExp('^' + category.title.trim() + '$', 'i')
    var c = await Category.findOne({
        Parent: parent,
        Aliases: {
            $elemMatch: {
                $or: [{
                        Id: category.id,
                        AffiliateProgram: category.affiliateProgram
                    },
                    {
                        Title: {
                            $regex: regExp
                        }
                    }
                ]
            }
        }
    })


    //if Category doesn't exist create one
    if (!c) {

        
        c = await Category.create({
            Title: category.title,
            Aliases: [{
                Title: category.title,
                Id: category.id,
                AffiliateProgram: category.affiliateProgram
            }],
            Parent: parent
        });

        //If category is new and on top level put it in Sonstiges
        if(top){
            c = await appendCategory(sonstiges, c)
        }


    }

    return c;
}

//Finds the referenced category
async function getLinkedCategory(cat) {
    var c = await Category.findById(cat.Link)
    if (c) {
        return getLinkedCategory(c);
    } else {
        return cat
    }
}

async function buildCategoryLevel(pros, level) {


    //Get categories of level
    unfilteredCategories = pros.map(p => {
        return p.CategoryTree[level]
    })


    //remove duplicate categories
    let categories = [];
    unfilteredCategories.forEach((c, i) => {

        //Check for categories with same id or same title
        let existingCatI = categories.findIndex(cat => {
            return (cat.affiliateProgram === c.affiliateProgram && cat.id === c.id) || cat.title === c.title
        })

        if (existingCatI >= 0) {
            categories[existingCatI].productsIndexes.push(i)
        } else {
            c.productsIndexes = [i]
            categories.push(c)
        }
    })




    let allProducts = await Promise.all(categories.map(async c => {

        let categoriesedProducts = []

        //Finds or creates relevant Category in database
        let id
        if (pros[0].Category) {
            id = pros[0].Category._id
        } else {
            id = undefined;
        }
        let top = level == 0;
        let category = await verifyCategory(c, id, top) //pros[0].Category returns provisoral Category from level above

        //Get all products of category
        let produs = c.productsIndexes.map(i => {
            let p = pros[i];
            p.Category = category._id;
            return p;
        })

        //Get all products with another category layer
        let unreadyProducts = produs.filter(p => (p.CategoryTree[level + 1]))
        let readyProducts = produs.filter(p => !(p.CategoryTree[level + 1]))


        //Add products
        categoriesedProducts = categoriesedProducts.concat(readyProducts)
        categoriesedProducts = categoriesedProducts.concat(await buildCategoryLevel(unreadyProducts, level + 1));



        return categoriesedProducts

    }));


    return allProducts = flatten(allProducts);

}


//Searches all affiliate programms
async function search(query, maxResults, page, callback) {

    console.log()
    let time = Date.now()


    let affilinetProductsPromise = affilinet.search(query, maxResults, page);
    let s24ProductsPromise = s24.search(query, maxResults, page)
    let affilinetProducts = await affilinetProductsPromise;
    let s24Products = await s24ProductsPromise;


    let products = affilinetProducts.concat(s24Products);

    let EANs = []

    //Remove products with same EAN
    products.filter(p => {
        if (!EANs.find(EAN => EAN == p.EAN)) {
            EANs.push(p.EAN);
            return true;
        }
    })

    console.log('Search: ' + (Date.now() - time))
    time = Date.now()

    //Get Categories
    let categoriesedProducts = await buildCategoryLevel(products, 0)

    console.log('Category matching: ' + (Date.now() - time))
    time = Date.now()

    let i = 0

    //Find similar products and save to database
    categoriesedProducts = Promise.all(categoriesedProducts.map(async p => {

        //Find existing product in database
        let existingProduct = {}

        //Only query EAN if it exists
        if (!p.EAN) {
            existingProduct = await Product.findOne({
                $or: [{
                    Listings: {
                        $elemMatch: {
                            AffiliateProgram: p.Listings[0].AffiliateProgram,
                            AffiliateProgramProductId: p.Listings[0].AffiliateProgramProductId
                        }
                    }
                }]
            })
        } else {
            existingProduct = await Product.findOne({
                $or: [{
                    EAN: p.EAN
                }, {
                    Listings: {
                        $elemMatch: {
                            AffiliateProgram: p.Listings[0].AffiliateProgram,
                            AffiliateProgramProductId: p.Listings[0].AffiliateProgramProductId
                        }
                    }
                }]
            })
        }

        //return the existing product if it is still up to date
        if (existingProduct && Date.now() - existingProduct.LastUpdated < config.updateCicle) {
            
            
                console.log((Date.now() - existingProduct.LastUpdated)/1000 + 'sec update:')
                callback(existingProduct)
                return existingProduct;
            
        } else {
            //Find similar products in the different affiliate apis
            let similarAffilinetProductsPromise = affilinet.findSimilarProducts(p)
            let similarS24ProductsPromise = s24.findSimilarProducts(p)
            let similarAffilinetProducts = await similarAffilinetProductsPromise;
            let similarS24Products = await similarS24ProductsPromise;

            let similarProducts = similarAffilinetProducts.concat(similarS24Products)

            let listings = []

            if (similarProducts) {
                similarProducts = similarProducts.map(sp => {
                    return sp.Listings
                })

                listings = flatten(similarProducts)
            } else {
                listings = p.Listings;
            }

            p.Listings = listings

            //Ensure a minimum of one listing


            if(listings.length > 0){
                if (existingProduct) {

                    existingProduct.set('Listings', p.Listings)
                    existingProduct.set('LastUpdated', Date.now())
    
                    try {
                        await existingProduct.save();
                    } catch (er) {
                        console.log(er)
                    }
    
                    callback(existingProduct)
    
                    return existingProduct;
    
                } else {
    
                    try{
                        p =  await Product.create(p);
                    }catch(er){
                        console.log(er)
                    }
                    
                    callback(p)
                    return p
                }
            }
            //Update existing product or make new one
           
        }


    }));

    await categoriesedProducts;

    console.log('Finding similar: ' + (Date.now() - time))
    time = Date.now()

    return categoriesedProducts

}

module.exports.search = search;