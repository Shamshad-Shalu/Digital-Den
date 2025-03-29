const mongoose = require("mongoose");
const Product = require("../../model/productSchema"); 
const Category = require("../../model/categorySchema"); 
const Brand = require("../../model/brandSchema"); 
const {determineStatus} = require("../../utils/helper");
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
        res.render("user/home", {
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
        
        res.render("user/products",renderData);
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
        res.status(500).render("user/products", errorData);
    }
};

// const getProducts = async (req, res) => {
//     try {
//         const { isLoggedIn, userData, isUserBlocked } = res.locals;
//         const { search, sort, category, priceMin, priceMax, brand } = req.query;
        
//         let query = {
//             isDeleted: false,
//             isListed: true,
//         };

//         if (search) {
//             query.$or = [
//                 { productName: { $regex: search, $options: "i" } }
//             ];
//         }

//         if (category) {
//             const categories = Array.isArray(category) ? category : [category];
        
//             const categoryDocs = await Category.find({
//                 name: { $in: categories.map(c => new RegExp(`^${c}$`, 'i')) }
//             }).select('_id');
//             const categoryIds = categoryDocs.map(cat => cat._id);
    
//             if (categoryIds.length > 0) {
//                 query.category = { $in: categoryIds };
//             } else {
//                 console.log("No matching categories found in DB");
//             }
//         }

//         if (priceMin || priceMax) {
//             query.salePrice = {};
//             if (priceMin) query.salePrice.$gte = Number(priceMin);
//             if (priceMax) query.salePrice.$lte = Number(priceMax);
//         }

//         if (brand) {
//             const brands = Array.isArray(brand) ? brand : [brand];
//             const brandDocs = await Brand.find({
//                 brandName: { $in: brands.map(b => new RegExp(`^${b}$`, 'i')) }
//             }).select('_id');
//             const brandIds = brandDocs.map(br => br._id);
    
//             if (brandIds.length > 0) {
//                 query.brand = { $in: brandIds };
//             }
//         }

//         let sortOption = {};
//         switch (sort) {
//             case "price-low-to-high": sortOption = { salePrice: 1 }; break;
//             case "price-high-to-low": sortOption = { salePrice: -1 }; break;
//             case "title-asc": sortOption = { productName: 1 }; break;
//             case "title-desc": sortOption = { productName: -1 }; break;
//             case "popularity": sortOption = { quantity: -1 }; break;
//             case "rating": sortOption = { "rating.rating": -1 }; break;
//             case "new-arrivals": sortOption = { createdAt: -1 }; break;
//             default: sortOption = { createdAt: -1 };
//         }

//         // console.log("MongoDB Query:", JSON.stringify(query, null, 2));
      

//         // Fetch categories and brands, with fallback
//         const allCategories = await Category.find({ isDeleted: false, isListed: true }).select("name") || [];
//         const allBrands = await Brand.find({ isDeleted: false, isListed: true }).select("brandName") || [];
     

//         const products = await Product.find(query)
//             .populate("category", "name")
//             .populate("brand", "brandName")
//             .sort(sortOption)
//             .lean();

      
//         // if (products.length === 0) {
//         //     console.log("Debug: Checking products with category only:", 
//         //         await Product.find({ category: new ObjectId("67ceb6d7032c616d85877a2e") }).lean());
//         //     console.log("Debug: Checking all products:", await Product.find({}).limit(5).lean());
//         // }

//         const transformedProducts = products.map(product => {
//             let rating = product.rating?.rating || "N/A";
//             // if (Array.isArray(product.specifications)) {
//             //     const ratingSpec = product.specifications.find(spec => spec.name === "rating");
//             //     rating = ratingSpec?.value || "N/A";
//             // }
//             return {
//                 _id: product._id,
//                 title: product.productName,
//                 description: product.description,
//                 category: product.category?.name || "Unknown",
//                 brand: product.brand?.brandName || "Unknown",
//                 price: product.salePrice,
//                 originalPrice: product.regularPrice,
//                 image: product.cardImage,
//                 rating: rating,
//                 isListed: ["Available", "out of stock"].includes(product.status),
//                 isBlocked: product.isBlocked,
//             };
//         });


//         let filterQueryParts = [];
//         if (category) {
//             const categories = Array.isArray(category) ? category : [category];
//             categories.forEach(cat => filterQueryParts.push(`category=${encodeURIComponent(cat)}`));
//         }
//         if (brand) {
//             const brands = Array.isArray(brand) ? brand : [brand];
//             brands.forEach(br => filterQueryParts.push(`brand=${encodeURIComponent(br)}`));
//         }
//         if (priceMin) filterQueryParts.push(`priceMin=${priceMin}`);
//         if (priceMax) filterQueryParts.push(`priceMax=${priceMax}`);
//         const filterQuery = filterQueryParts.length > 0 ? `&${filterQueryParts.join('&')}` : '';

//         // Ensure categories and brands are always arrays
//         const renderData = {
//             products: transformedProducts,
//             categories: Array.isArray(allCategories) ? allCategories.map(cat => cat.name) : [],
//             brands: Array.isArray(allBrands) ? allBrands.map(br => br.brandName) : [],
//             searchQuery: search || "",
//             sortOption: sort || "",
//             selectedCategories: category ? (Array.isArray(category) ? category : [category]) : [],
//             selectedBrands: brand ? (Array.isArray(brand) ? brand : [brand]) : [],
//             priceMin: priceMin || 0,
//             priceMax: priceMax || 300000,
//             filterQuery: filterQuery,
//             isLoggedIn: isLoggedIn,             
//             user: userData,                     
//             showBlockedNotification: isUserBlocked 
//         };


//         res.render("user/products",renderData);
//     } catch (error) {
//         console.error("Error fetching products:", error);
      
//         const errorData = {
//             products: [],
//             categories: [],
//             brands: [],
//             searchQuery: "",
//             sortOption: "",
//             selectedCategories: [],
//             selectedBrands: [],
//             priceMin: 0,
//             priceMax: 500000,
//             filterQuery: "",
//             error: "An error occurred while fetching products. Please try again.",
//             isLoggedIn: isLoggedIn,              
//             user: userData,                     
//             showBlockedNotification: isUserBlocked 
//         };
//         res.status(500).render("user/products", errorData);
//     }
// };


// Get Product Details
const getProductDetails = async (req, res) => {
    try {

        const { isLoggedIn, userData, isUserBlocked } = res.locals;
        const productId = req.params.id;

        let product = await Product.findById(productId)
            .populate('category', 'name isListed')
            .populate('brand', 'brandName isListed')
            .lean();

        if (!product || !product.isListed || product.isDeleted){
            return res.redirect('/user/products'); 
        }
        if  (!product?.category?.isListed || !product?.brand?.isListed){
            return res.redirect('/user/products');
        }


        const status = await determineStatus(productId);
        product.status = status; 

        if (status === 'Discontinued') {
            return res.redirect('/user/products');
        }



        // related products
        let relatedProducts = await Product.find({
            category: product.category._id,
            _id: { $ne: productId },
            isDeleted: false,
            isListed: true
        })
        .populate('category', 'name  isListed')
        .populate('brand', 'brandName isListed')
        .lean();

        relatedProducts = relatedProducts.filter(pr => pr?.category?.isListed && pr?.brand?.isListed).slice(0,7)
         
        for (let i = 0; i < relatedProducts.length; i++) {
            const relProduct = relatedProducts[i];
            const relStatus = await determineStatus(relProduct._id);
            relProduct.status = relStatus;
        }

        res.render('user/product-details', {
            product,
            relatedProducts,
            title: product.productName,
            isLoggedIn: isLoggedIn,              
            user: userData,                     
            showBlockedNotification: isUserBlocked 
        });
    } catch (error) {
        console.error(error);
        res.status(500).send('Server Error');
    }
};

// const getProducts = async (req, res) => {
//     try {
//         const { isLoggedIn, userData, isUserBlocked } = res.locals;
//         const { search, sort, category, priceMin, priceMax, brand } = req.query;

//         let query = {
//             isDeleted: false,
//             isBlocked: false,
//         };

//         // Fetch active categories and brands upfront
//         const activeCategories = await Category.find({ isDeleted: false, isBlocked: false }).select('_id name');
//         const activeBrands = await Brand.find({ isDeleted: false, isBlocked: false }).select('_id brandName');

//         const activeCategoryIds = activeCategories.map(cat => cat._id);
//         const activeBrandIds = activeBrands.map(br => br._id);

//         // Ensure products belong to active categories and brands
//         query.category = { $in: activeCategoryIds };
//         query.brand = { $in: activeBrandIds };

//         // Handle search
//         if (search) {
//             query.$or = [
//                 { productName: { $regex: search, $options: "i" } }
//             ];
//         }

//         // Handle category filter
//         if (category) {
//             const categories = Array.isArray(category) ? category : [category];
//             const categoryDocs = await Category.find({
//                 name: { $in: categories.map(c => new RegExp(`^${c}$`, 'i')) },
//                 isDeleted: false, // Ensure category is not deleted
//                 isBlocked: false   // Ensure category is not blocked
//             }).select('_id');
//             const categoryIds = categoryDocs.map(cat => cat._id);

//             if (categoryIds.length > 0) {
//                 query.category = { $in: categoryIds }; // Override with filtered category IDs
//             } else {
//                 console.log("No matching active categories found in DB");
//                 query.category = { $in: [] }; // No products will match if no valid categories
//             }
//         }

//         // Handle price range
//         if (priceMin || priceMax) {
//             query.salePrice = {};
//             if (priceMin) query.salePrice.$gte = Number(priceMin);
//             if (priceMax) query.salePrice.$lte = Number(priceMax);
//         }

//         // Handle brand filter
//         if (brand) {
//             const brands = Array.isArray(brand) ? brand : [brand];
//             const brandDocs = await Brand.find({
//                 brandName: { $in: brands.map(b => new RegExp(`^${b}$`, 'i')) },
//                 isDeleted: false, // Ensure brand is not deleted
//                 isBlocked: false   // Ensure brand is not blocked
//             }).select('_id');
//             const brandIds = brandDocs.map(br => br._id);

//             if (brandIds.length > 0) {
//                 query.brand = { $in: brandIds }; // Override with filtered brand IDs
//             } else {
//                 console.log("No matching active brands found in DB");
//                 query.brand = { $in: [] }; // No products will match if no valid brands
//             }
//         }

//         // Sort options
//         let sortOption = {};
//         switch (sort) {
//             case "price-low-to-high": sortOption = { salePrice: 1 }; break;
//             case "price-high-to-low": sortOption = { salePrice: -1 }; break;
//             case "title-asc": sortOption = { productName: 1 }; break;
//             case "title-desc": sortOption = { productName: -1 }; break;
//             case "popularity": sortOption = { quantity: -1 }; break;
//             case "rating": sortOption = { "rating.rating": -1 }; break;
//             case "new-arrivals": sortOption = { createdAt: -1 }; break;
//             default: sortOption = { createdAt: -1 };
//         }

//         // Fetch all categories and brands for the filter UI (only active ones)
//         const allCategories = await Category.find({ isDeleted: false, isBlocked: false, isListed: true }).select("name") || [];
//         const allBrands = await Brand.find({ isDeleted: false, isBlocked: false, isListed: true }).select("brandName") || [];

//         // Fetch products
//         const products = await Product.find(query)
//             .populate("category", "name")
//             .populate("brand", "brandName")
//             .sort(sortOption)
//             .lean();

//         // Transform products
//         const transformedProducts = products.map(product => {
//             let rating = product.rating?.rating || "N/A";
//             return {
//                 _id: product._id,
//                 title: product.productName,
//                 description: product.description,
//                 category: product.category?.name || "Unknown",
//                 brand: product.brand?.brandName || "Unknown",
//                 price: product.salePrice,
//                 originalPrice: product.regularPrice,
//                 image: product.cardImage,
//                 rating: rating,
//                 isListed: ["Available", "out of stock"].includes(product.status),
//                 isBlocked: product.isBlocked,
//             };
//         });

//         // Build filter query for URL
//         let filterQueryParts = [];
//         if (category) {
//             const categories = Array.isArray(category) ? category : [category];
//             categories.forEach(cat => filterQueryParts.push(`category=${encodeURIComponent(cat)}`));
//         }
//         if (brand) {
//             const brands = Array.isArray(brand) ? brand : [brand];
//             brands.forEach(br => filterQueryParts.push(`brand=${encodeURIComponent(br)}`));
//         }
//         if (priceMin) filterQueryParts.push(`priceMin=${priceMin}`);
//         if (priceMax) filterQueryParts.push(`priceMax=${priceMax}`);
//         const filterQuery = filterQueryParts.length > 0 ? `&${filterQueryParts.join('&')}` : '';

//         // Render data
//         const renderData = {
//             products: transformedProducts,
//             categories: Array.isArray(allCategories) ? allCategories.map(cat => cat.name) : [],
//             brands: Array.isArray(allBrands) ? allBrands.map(br => br.brandName) : [],
//             searchQuery: search || "",
//             sortOption: sort || "",
//             selectedCategories: category ? (Array.isArray(category) ? category : [category]) : [],
//             selectedBrands: brand ? (Array.isArray(brand) ? brand : [brand]) : [],
//             priceMin: priceMin || 0,
//             priceMax: priceMax || 300000,
//             filterQuery: filterQuery,
//             isLoggedIn: isLoggedIn,
//             user: userData,
//             showBlockedNotification: isUserBlocked
//         };

//         res.render("user/products", renderData);
//     } catch (error) {
//         console.error("Error fetching products:", error);
//         const errorData = {
//             products: [],
//             categories: [],
//             brands: [],
//             searchQuery: "",
//             sortOption: "",
//             selectedCategories: [],
//             selectedBrands: [],
//             priceMin: 0,
//             priceMax: 500000,
//             filterQuery: "",
//             error: "An error occurred while fetching products. Please try again.",
//             isLoggedIn: isLoggedIn,
//             user: userData,
//             showBlockedNotification: isUserBlocked
//         };
//         res.status(500).render("user/products", errorData);
//     }
// };

/////////////////////

// const getProducts = async (req, res) => {
//     try {
//         const { search, sort, category, priceMin, priceMax, brand } = req.query;

//         // Log incoming request parameters for debugging
//         console.log("Request Query Parameters:", req.query);

//         let query = {
//             isDeleted: false,
//             isBlocked: false,
//         };

//         // Search query
//         if (search) {
//             query.$or = [
//                 { productName: { $regex: search, $options: "i" } }
//             ];
//         }

//         // Category filtering
//         // if (category) {
//         //     const categories = Array.isArray(category) ? category : [category];
//         //     console.log("Filtering by categories:", categories);
            
//         //     const categoryDocs = await Category.find({ name: { $in: categories } }).select('_id');
//         //     const categoryIds = categoryDocs.map(cat => cat._id);
            
//         //     if (categoryIds.length > 0) {
//         //         query.category = { $in: categoryIds };
//         //     }
//         // }

//         if (category) {
//             const categories = Array.isArray(category) ? category : [category];
//             console.log("Filtering by categories:", categories);
//             const categoryDocs = await Category.find({
//                 name: { $in: categories.map(c => new RegExp(`^${c}$`, 'i')) } // Case-insensitive match
//             }).select('_id');
//             const categoryIds = categoryDocs.map(cat => cat._id);
//             console.log("Category IDs found:", categoryIds); // Debug: Check resolved IDs
//             if (categoryIds.length > 0) {
//                 query.category = { $in: categoryIds };
//             } else {
//                 console.log("No matching categories found in DB");
//             }
//         }

//         // Price range filtering
//         if (priceMin || priceMax) {
//             query.salePrice = {};
//             if (priceMin) query.salePrice.$gte = Number(priceMin);
//             if (priceMax) query.salePrice.$lte = Number(priceMax);
//             console.log("Price filter:", query.salePrice);
//         }

//         // Brand filtering
//         // if (brand) {
//         //     const brands = Array.isArray(brand) ? brand : [brand];
//         //     console.log("Filtering by brands:", brands);
            
//         //     const brandDocs = await Brand.find({ brandName: { $in: brands } }).select('_id');
//         //     const brandIds = brandDocs.map(br => br._id);
            
//         //     if (brandIds.length > 0) {
//         //         query.brand = { $in: brandIds };
//         //     }
//         // }

//         // Brand filtering (case-insensitive)
//         if (brand) {
//             const brands = Array.isArray(brand) ? brand : [brand];
//             console.log("Filtering by brands:", brands);
//             const brandDocs = await Brand.find({
//                 brandName: { $in: brands.map(b => new RegExp(`^${b}$`, 'i')) } // Case-insensitive match
//             }).select('_id');
//             const brandIds = brandDocs.map(br => br._id);
//             console.log("Brand IDs found:", brandIds); // Debug: Check resolved IDs
//             if (brandIds.length > 0) {
//                 query.brand = { $in: brandIds };
//             } else {
//                 console.log("No matching brands found in DB");
//             }
//         }

//         // // Sorting
//         // let sortOption = {};
//         // switch (sort) {
//         //     case "price-low-to-high": sortOption = { salePrice: 1 }; break;
//         //     case "price-high-to-low": sortOption = { salePrice: -1 }; break;
//         //     case "title-asc": sortOption = { productName: 1 }; break;
//         //     case "title-desc": sortOption = { productName: -1 }; break;
//         //     case "popularity": sortOption = { quantity: -1 }; break;
//         //     case "rating": sortOption = { "specifications.rating": -1 }; break;
//         //     case "new-arrivals": sortOption = { createdAt: -1 }; break;
//         //     default: sortOption = { createdAt: -1 };
//         // }

//         // Sorting
//         let sortOption = {};
//         switch (sort) {
//             case "price-low-to-high": sortOption = { salePrice: 1 }; break;
//             case "price-high-to-low": sortOption = { salePrice: -1 }; break;
//             case "title-asc": sortOption = { productName: 1 }; break;
//             case "title-desc": sortOption = { productName: -1 }; break;
//             case "popularity": sortOption = { quantity: -1 }; break;
//             case "rating": sortOption = { "specifications.rating": -1 }; break;
//             case "new-arrivals": sortOption = { createdAt: -1 }; break;
//             default: sortOption = { createdAt: -1 };
//         }

//         console.log("MongoDB Query:", JSON.stringify(query, null, 2));
//         console.log("Sort Option:", sortOption);

//         // Fetch all available categories and brands for the filter sidebar
//         const allCategories = await Category.find().select("name");
//         const allBrands = await Brand.find().select("brandName");

//         // Fetch products with filters applied
//         const products = await Product.find(query)
//             .populate("category", "name")
//             .populate("brand", "brandName")
//             .sort(sortOption)
//             .lean();

//         // console.log(`Found ${products.length} products matching the criteria`);

//         console.log("Raw products from DB:", products);

//         // Transform product data for the frontend
//         const transformedProducts = products.map(product => {
//             let rating = "N/A";
//             if (Array.isArray(product.specifications)) {
//                 const ratingSpec = product.specifications.find(spec => spec.name === "rating");
//                 rating = ratingSpec?.value || "N/A";
//             }
            
//             return {
//                 _id: product._id,
//                 title: product.productName,
//                 description: product.description,
//                 category: product.category?.name || "Unknown",
//                 brand: product.brand?.brandName || "Unknown",
//                 price: product.salePrice,
//                 originalPrice: product.regularPrice,
//                 image: product.cardImage,
//                 rating: rating || 4,
//                 isListed: product.status === "Available" || product.status === "out of stock",
//                 isBlocked: product.isBlocked,
//             };
//         });

//         console.log("Transformed products:", transformedProducts); //

//         // // Build the filter query string for pagination links
//         // let filterQueryParts = [];
//         // if (category) {
//         //     const categories = Array.isArray(category) ? category : [category];
//         //     categories.forEach(cat => filterQueryParts.push(`category=${encodeURIComponent(cat)}`));
//         // }
//         // if (brand) {
//         //     const brands = Array.isArray(brand) ? brand : [brand];
//         //     brands.forEach(br => filterQueryParts.push(`brand=${encodeURIComponent(br)}`));
//         // }
//         // if (priceMin) filterQueryParts.push(`priceMin=${priceMin}`);
//         // if (priceMax) filterQueryParts.push(`priceMax=${priceMax}`);
        
//         // const filterQuery = filterQueryParts.length > 0 ? `&${filterQueryParts.join('&')}` : '';

//         // Build the filter query string for pagination links
//         let filterQueryParts = [];
//         if (category) {
//             const categories = Array.isArray(category) ? category : [category];
//             categories.forEach(cat => filterQueryParts.push(`category=${encodeURIComponent(cat)}`));
//         }
//         if (brand) {
//             const brands = Array.isArray(brand) ? brand : [brand];
//             brands.forEach(br => filterQueryParts.push(`brand=${encodeURIComponent(br)}`));
//         }
//         if (priceMin) filterQueryParts.push(`priceMin=${priceMin}`);
//         if (priceMax) filterQueryParts.push(`priceMax=${priceMax}`);
//         const filterQuery = filterQueryParts.length > 0 ? `&${filterQueryParts.join('&')}` : '';

//         // Render the products page with all data
//         // res.render("test/products", {
//         //     products: transformedProducts,
//         //     categories: allCategories.map(cat => cat.name),
//         //     brands: allBrands.map(br => br.brandName),
//         //     searchQuery: search || "",
//         //     sortOption: sort || "",
//         //     selectedCategories: category ? (Array.isArray(category) ? category : [category]) : [],
//         //     selectedBrands: brand ? (Array.isArray(brand) ? brand : [brand]) : [],
//         //     priceMin: priceMin || 0,
//         //     priceMax: priceMax || 10000,
//         //     filterQuery: filterQuery,
//         // });

//         // Render the products page with all data
//         res.render("test/products", {
//             products: transformedProducts,
//             categories: allCategories.map(cat => cat.name),
//             brands: allBrands.map(br => br.brandName),
//             searchQuery: search || "",
//             sortOption: sort || "",
//             selectedCategories: category ? (Array.isArray(category) ? category : [category]) : [],
//             selectedBrands: brand ? (Array.isArray(brand) ? brand : [brand]) : [],
//             priceMin: priceMin || 0,
//             priceMax: priceMax || 10000,
//             filterQuery: filterQuery,
//         });

//     } catch (error) {
//         console.error("Error fetching products:", error);
//         res.status(500).render("test/products", {
//             products: [],
//             categories: [],
//             brands: [],
//             searchQuery: "",
//             sortOption: "",
//             selectedCategories: [],
//             selectedBrands: [],
//             priceMin: 0,
//             priceMax: 10000,
//             filterQuery: "",
//             error: "An error occurred while fetching products. Please try again."
//         });
//     }
// };

// const getProducts = async (req, res) => {
//     try {
//         // Extract query parameters
//         const { search, sort, category, priceMin, priceMax, brand } = req.query;

//         // Build query object
//         let query = { isListed: true, isBlocked: false };

//         // Search
//         if (search) {
//             query.$or = [
//                 { title: { $regex: search, $options: 'i' } },
//                 { description: { $regex: search, $options: 'i' } }
//             ];
//         }

//         // Filter: Category
//         if (category) {
//             const categories = Array.isArray(category) ? category : [category];
//             query.category = { $in: categories };
//         }

//         // Filter: Price Range
//         if (priceMin || priceMax) {
//             query.price = {};
//             if (priceMin) query.price.$gte = Number(priceMin);
//             if (priceMax) query.price.$lte = Number(priceMax);
//         }

//         // Filter: Brand
//         if (brand) {
//             const brands = Array.isArray(brand) ? brand : [brand];
//             query.brand = { $in: brands };
//         }

//         // Sort
//         let sortOption = {};
//         switch (sort) {
//             case 'price-low-to-high':
//                 sortOption = { price: 1 };
//                 break;
//             case 'price-high-to-low':
//                 sortOption = { price: -1 };
//                 break;
//             case 'title-asc':
//                 sortOption = { title: 1 };
//                 break;
//             case 'title-desc':
//                 sortOption = { title: -1 };
//                 break;
//             case 'popularity':
//                 sortOption = { popularity: -1 };
//                 break;
//             case 'rating':
//                 sortOption = { rating: -1 };
//                 break;
//             case 'new-arrivals':
//                 sortOption = { createdAt: -1 };
//                 break;
//             case 'featured':
//                 sortOption = { popularity: -1 }; // Assuming featured based on popularity
//                 break;
//             default:
//                 sortOption = { createdAt: -1 }; // Default sort by newest
//         }

//         // Fetch products
//         const products = await Product.find(query).sort(sortOption);

//         // Fetch distinct categories and brands for filters
//         const categories = await Product.distinct('category', { isListed: true, isBlocked: false });
//         const brands = await Product.distinct('brand', { isListed: true, isBlocked: false });

//         // Prepare data for rendering
//         const data = {
//             products,
//             categories,
//             brands,
//             selectedCategories: category ? (Array.isArray(category) ? category : [category]) : [],
//             selectedBrands: brand ? (Array.isArray(brand) ? brand : [brand]) : [],
//             priceMin: priceMin || 0,
//             priceMax: priceMax || 10000,
//             sortOption: sort || 'default',
//             searchQuery: search || '',
//             filterQuery: req.query,
//             isLoggedIn: req.session?.isLoggedIn || false // Adjust based on your auth logic
//         };

//         res.render('user/products', data);
//     } catch (error) {
//         console.error('Error fetching products:', error);
//         res.status(500).send('Server Error');
//     }
// };




module.exports  = {
    loadHome,
    getProducts,
    getProductDetails
}