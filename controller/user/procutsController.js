const mongoose = require("mongoose");
const Product = require("../../model/productSchema"); 
const Category = require("../../model/categorySchema"); 
const Brand = require("../../model/brandSchema"); 
const {determineStatus ,getSpecialOffer , calculateBestOffer} = require("../../utils/helper");
const Wishlist = require("../../model/wishlistSchema");
const { ObjectId } = require('mongoose').Types;


const loadHome = async (req , res) => {
    try {

        const { isLoggedIn, userData, isUserBlocked } = res.locals;
    
        let products  = await Product.find({
            isDeleted:false ,
            isListed : true ,
            status : "Available"
        })
        .populate({ path:"category", match:{isListed:true}, select:"name" })
        .populate({ path:"brand", match:{isListed:true}, select:"brandName"})
        .populate("rating", "rating")
        .limit(11);

        let wishlist = null;
        if (isLoggedIn) {
            wishlist = await Wishlist.findOne({ userId: userData._id });
        }

        let offers  = await Product.find({
            isDeleted : false ,
            isListed : true,
            productOffer: { $gt : 0}
        })
        .populate({ path:"category", match:{isListed:true}, select:"name" })
        .populate({ path:"brand", match:{isListed:true}, select:"brandName"})
        .populate("rating", "rating")
        .limit(10);

        let topProducts  = await Product.find({
            isDeleted : false ,
            isListed : true 
        })
        .populate({ path:"category", match:{isListed:true}, select:"name" })
        .populate({ path:"brand", match:{isListed:true}, select:"brandName"})
        .populate("rating", "rating")
        .sort({ "rating.rating": -1 })
        .limit(8)
    
        //filtering products that has brand and category
        products = products.filter(pr => pr.category && pr.brand);
        offers = offers.filter(off => off.category && off.brand);
        topProducts = topProducts.filter(top => top.category && top.brand);

        res.setHeader('Cache-Control', 'no-store');
        res.render("home", {
          products,
          offers,
          topProducts,
          user: userData,
          isLoggedIn: isLoggedIn,
          showBlockedNotification: isUserBlocked,
          wishlist
        });  
    } catch (error) {
        console.log("Home page not loading:", error);
        res.status(500).send("Server Error");
    }
}

const getProducts = async (req, res) => {
    try {
        const { isLoggedIn, userData, isUserBlocked } = res.locals;
        const { search, sort, category, priceMin, priceMax, brand } = req.query;
        
        let query = {
            isDeleted: false,
            isListed: true,
        };

        if (search) {
            query.$or = [
                { productName: { $regex: search.trim(), $options: "i" } }
            ];
        }

        if (category) {
            const categories = Array.isArray(category) ? category : [category];
            const categoryDocs = await Category.find({
                name: { $in: categories.map(c => new RegExp(`^${c}$`, 'i')) },
                isListed: true,   
                isDeleted: false
            }).select('_id');
            const categoryIds = categoryDocs.map(cat => cat._id);
    
            if (categoryIds.length > 0) {
                query.category = { $in: categoryIds };
            }
        }

        if (priceMin || priceMax) {
            query.salePrice = {};
            if (priceMin) query.salePrice.$gte = Number(priceMin);
            if (priceMax) query.salePrice.$lte = Number(priceMax);
        }

        if (brand) {
            const brands = Array.isArray(brand) ? brand : [brand];
            const brandDocs = await Brand.find({
                brandName: { $in: brands.map(b => new RegExp(`^${b}$`, 'i')) },
                isListed: true,   
                isDeleted: false
            }).select('_id');
            const brandIds = brandDocs.map(br => br._id);
    
            if (brandIds.length > 0) {
                query.brand = { $in: brandIds };
            }
        }


        let sortOption = {};
        switch (sort) {
            case "price-low-to-high": sortOption = { salePrice: 1 }; break;
            case "price-high-to-low": sortOption = { salePrice: -1 }; break;
            case "title-asc": sortOption = { productName: 1 }; break;
            case "title-desc": sortOption = { productName: -1 }; break;
            case "popularity": sortOption = { quantity: -1 }; break;
            case "rating": sortOption = { "rating.rating": -1 }; break;
            case "new-arrivals": sortOption = { createdAt: -1 }; break;
            default: sortOption = { createdAt: -1 };
        }

        // Get min and max prices from database
        const priceStats = await Product.aggregate([
            {
                $match: {
                    isDeleted: false,
                    isListed: true,
                }
            },
            {
                $group: {
                    _id: null,
                    minPrice: { $min: "$salePrice" },
                    maxPrice: { $max: "$salePrice" }
                }
            }
        ]);

        const dbMinPrice = priceStats.length > 0 ? priceStats[0].minPrice : 0;
        const dbMaxPrice = priceStats.length > 0 ? priceStats[0].maxPrice : 999999;
      

        // Fetch categories and brands, with fallback
        const allCategories = await Category.find({ isDeleted: false, isListed: true }).select("name") || [];
        const allBrands = await Brand.find({ isDeleted: false, isListed: true }).select("brandName") || [];
     
        let products = await Product.find(query)
            .populate({ 
                path: "category", 
                match: { isListed: true, isDeleted: false }, 
                select: "name" 
            })
            .populate({ 
                path: "brand", 
                match: { isListed: true, isDeleted: false }, 
                select: "brandName" 
            })
            .populate("rating", "rating")
            .sort(sortOption)
            .lean();

        products = products.filter(pr => pr.category && pr.brand);
        

        const transformedProducts = products.map(product => {
            let rating = product.rating?.rating || "N/A";
            return {
                _id: product._id,
                title: product.productName,
                description: product.description,
                category: product.category?.name || "Unknown",
                brand: product.brand?.brandName || "Unknown",
                price: product.salePrice,
                originalPrice: product.regularPrice,
                image: product.cardImage,
                rating: rating,
                status: ["Available", "out of stock"].includes(product.status),
            };
        });


        let filterQueryParts = [];
        if (category) {
            const categories = Array.isArray(category) ? category : [category];
            categories.forEach(cat => filterQueryParts.push(`category=${encodeURIComponent(cat)}`));
        }
        if (brand) {
            const brands = Array.isArray(brand) ? brand : [brand];
            brands.forEach(br => filterQueryParts.push(`brand=${encodeURIComponent(br)}`));
        }
        if (priceMin) filterQueryParts.push(`priceMin=${priceMin}`);
        if (priceMax) filterQueryParts.push(`priceMax=${priceMax}`);
        const filterQuery = filterQueryParts.length > 0 ? `&${filterQueryParts.join('&')}` : '';

        
        let wishlist = null;
        if (isLoggedIn) {
            wishlist = await Wishlist.findOne({ userId: userData._id });
        }
        const renderData = {
            products: transformedProducts,
            categories: allCategories.map(cat => cat.name),
            brands: allBrands.map(br => br.brandName),
            searchQuery: search || "",
            sortOption: sort || "",
            selectedCategories: category ? (Array.isArray(category) ? category : [category]) : [],
            selectedBrands: brand ? (Array.isArray(brand) ? brand : [brand]) : [],
            priceMin: priceMin || dbMinPrice,
            priceMax: priceMax || dbMaxPrice,
            dbMinPrice: dbMinPrice,  
            dbMaxPrice: dbMaxPrice,  
            filterQuery: filterQuery,
            isLoggedIn: isLoggedIn,
            user: userData,
            showBlockedNotification: isUserBlocked,
            wishlist
        };
        
        res.render("products",renderData);
    } catch (error) {
        console.error("Error fetching products:", error);
      
        const errorData = {
            products: [],
            categories: [],
            brands: [],
            searchQuery: "",
            sortOption: "",
            selectedCategories: [],
            selectedBrands: [],
            priceMin: 0,
            priceMax: 999999,
            dbMinPrice: 0,
            dbMaxPrice: 999999,
            filterQuery: "",
            error: "An error occurred while fetching products. Please try again.",
            isLoggedIn: res.locals.isLoggedIn,
            user: res.locals.userData,
            showBlockedNotification: res.locals.isUserBlocked
        };
        res.status(500).render("products", errorData);
    }
};

const getProductDetails = async (req, res , next ) => {
    try {
        const { userData ,isLoggedIn , isUserBlocked } = res.locals;
        const productId = req.params.id;
        
        let product = await Product.findById(productId)
            .populate('category', 'name isListed categoryOffer')
            .populate('brand', 'brandName isListed brandOffer')
            .lean();
        
        const status = await determineStatus(productId);
        product.status = status;
        
        if (status === 'Discontinued') {
            return res.redirect('/products');
        }
        
        // Calculate all available discounts
        const productDiscount = Math.max((product.regularPrice - product.salePrice), 0);
        const categoryDiscount = product.category?.categoryOffer 
            ? (product.regularPrice * product.category.categoryOffer) / 100 
            : 0;
        const brandDiscount = product.brand?.brandOffer 
            ? (product.regularPrice * product.brand.brandOffer) / 100 
            : 0;
        
        // Get special offers
        const specialOffers = await getSpecialOffer(product);
        
        const availableOffers = [];
        
        if (productDiscount > 0) {
            availableOffers.push({
                type: 'product',
                name: 'Product Discount',
                discount: productDiscount,
                discountPercentage: Math.round((productDiscount / product.regularPrice) * 100),
                description: `${Math.round((productDiscount / product.regularPrice) * 100)}% off on ${product.productName}`
            });
        }
        
        if (categoryDiscount > 0) {
            availableOffers.push({
                type: 'category', 
                name: `${product.category.name} Category Offer`,
                discount: categoryDiscount,
                discountPercentage: product.category.categoryOffer,
                description: `${product.category.categoryOffer}% off on all ${product.category.name} products`
            });
        }
        
        if (brandDiscount > 0) {
            availableOffers.push({
                type: 'brand',
                name: `${product.brand.brandName} Brand Offer`,
                discount: brandDiscount,
                discountPercentage: product.brand.brandOffer,
                description: `${product.brand.brandOffer}% off on all ${product.brand.brandName} products`
            });
        }

        for (const special of specialOffers) {
            if (special.discount > 0) {
                availableOffers.push({
                    type: special.appliedOn ,
                    name: special.offerName,
                    discount: special.discount,
                    description: `Special offer: ${special.description}`,
                    endDate: special.endDate,
                    isSpecial: true
                });
            }
        }
        
        // Calculate best offer
        const bestOffer = await calculateBestOffer(product, 1);
        
        // Calculate final sale price
        const finalPrice = product.regularPrice - bestOffer.amount;
        
        // related products
        let relatedProducts = await Product.find({
            category: product.category._id,
            _id: { $ne: productId },
            isDeleted: false,
            isListed: true
        })
        .populate('category', 'name isListed')
        .populate('brand', 'brandName isListed')
        .lean();
        
        relatedProducts = relatedProducts.filter(pr => pr?.category?.isListed && pr?.brand?.isListed).slice(0,7);
        
        for (let i = 0; i < relatedProducts.length; i++) {
            const relProduct = relatedProducts[i];
            const relStatus = await determineStatus(relProduct._id);
            relProduct.status = relStatus;
        }
        

        res.render('product-details', {
            product,
            relatedProducts,
            title: product.productName,
            isLoggedIn: isLoggedIn,              
            user: userData,                     
            showBlockedNotification: isUserBlocked,
            availableOffers,
            bestOffer,
            finalPrice 
        });

    } catch (error) {
        error.statusCode = 500; 
        next(error);
    }
};



module.exports  = {
    loadHome,
    getProducts,
    getProductDetails
}