const mongoose = require("mongoose");
const User = require('../../model/userSchema');
const Product = require("../../model/productSchema"); 
const Category = require("../../model/categorySchema"); 
const Brand = require("../../model/brandSchema"); 
const {determineStatus ,getSpecialOffer , calculateBestOffer} = require("../../utils/helper");
const Wishlist = require("../../model/wishlistSchema");
const Review = require("../../model/reviewSchema");
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


// const Review = require('../models/Review');
// const Product = require('../models/Product');

// Helper function to recalculate product rating summary
const updateProductRatingSummary = async (productId) => {
    try {
        // Get all non-deleted reviews for this product
        const reviews = await Review.find({ 
            productID: productId, 
            isDeleted: false 
        });
        
        // If no reviews, reset ratings
        if (reviews.length === 0) {
            await Product.findByIdAndUpdate(productId, {
                ratingsSummary: {
                    averageRating: 0,
                    totalReviews: 0,
                    ratingCounts: { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 }
                }
            });
            return;
        }
        
        // Calculate ratings distribution
        const ratingCounts = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
        let ratingSum = 0;
        
        reviews.forEach(review => {
            ratingCounts[review.rating]++;
            ratingSum += review.rating;
        });
        
        const averageRating = ratingSum / reviews.length;
        
        // Update product with new rating summary
        await Product.findByIdAndUpdate(productId, {
            ratingsSummary: {
                averageRating: parseFloat(averageRating.toFixed(1)),
                totalReviews: reviews.length,
                ratingCounts
            }
        });
    } catch (error) {
        console.error('Error updating product rating:', error);
    }
};

// Get all reviews for a product
const getProductReviews = async (req, res) => {
    try {
        const { productId } = req.params;
        const { page = 1, limit = 5, sort = 'createdAt', order = 'desc', filter } = req.query;
        
        // Build query
        const query = { 
            productID: productId,
            isDeleted: false
        };
        
        // Apply filters if any
        if (filter === 'verified') {
            query.verifiedPurchase = true;
        }
        
        // Count total reviews matching query
        const total = await Review.countDocuments(query);
        
        // Get paginated reviews
        const reviews = await Review.find(query)
            .populate('userID', 'username firstName lastName profileImage')
            .sort({ [sort]: order === 'desc' ? -1 : 1 })
            .limit(limit * 1)
            .skip((page - 1) * limit)
            .exec();
            
        // Return reviews with pagination info
        return res.status(200).json({
            reviews,
            totalPages: Math.ceil(total / limit),
            currentPage: page,
            totalReviews: total
        });
    } catch (error) {
        console.error('Error fetching reviews:', error);
        return res.status(500).json({ message: 'Error fetching reviews' });
    }
};

// Create a new review
const createReview = async (req, res) => {
    try {
        const { productId } = req.params;
        const userId = req.user._id; // Assuming user is available from auth middleware
        
        // Check if user already reviewed this product
        const existingReview = await Review.findOne({
            userID: userId,
            productID: productId
        });
        
        if (existingReview) {
            return res.status(400).json({ message: 'You have already reviewed this product' });
        }
        
        // Check if this is a verified purchase
        // This logic will depend on your order model
        // For now setting manually, but you should check against orders
        const isVerifiedPurchase = true; // Replace with actual verification logic
        
        // Create new review
        const newReview = new Review({
            userID: userId,
            productID: productId,
            rating: req.body.rating,
            title: req.body.title,
            feedback: req.body.feedback,
            verifiedPurchase: isVerifiedPurchase
        });
        
        await newReview.save();
        
        // Update product rating summary
        await updateProductRatingSummary(productId);
        
        return res.status(201).json({
            message: 'Review submitted successfully',
            review: newReview
        });
    } catch (error) {
        console.error('Error creating review:', error);
        return res.status(500).json({ message: 'Error submitting review' });
    }
};

// Update a review
const updateReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const userId = req.user._id;
        
        // Find the review
        const review = await Review.findById(reviewId);
        
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }
        
        // Check if user owns this review
        if (review.userID.toString() !== userId.toString()) {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        
        // Update review fields
        review.rating = req.body.rating || review.rating;
        review.title = req.body.title || review.title;
        review.feedback = req.body.feedback || review.feedback;
        
        await review.save();
        
        // Update product rating summary
        await updateProductRatingSummary(review.productID);
        
        return res.status(200).json({
            message: 'Review updated successfully',
            review
        });
    } catch (error) {
        console.error('Error updating review:', error);
        return res.status(500).json({ message: 'Error updating review' });
    }
};

// Delete a review (soft delete)
const deleteReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const userId = req.user._id;
        
        // Find the review
        const review = await Review.findById(reviewId);
        
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }
        
        // Check if user owns this review or is admin
        if (review.userID.toString() !== userId.toString() && !req.user.isAdmin) {
            return res.status(403).json({ message: 'Unauthorized' });
        }
        
        // Soft delete
        review.isDeleted = true;
        await review.save();
        
        // Update product rating summary
        await updateProductRatingSummary(review.productID);
        
        return res.status(200).json({
            message: 'Review deleted successfully'
        });
    } catch (error) {
        console.error('Error deleting review:', error);
        return res.status(500).json({ message: 'Error deleting review' });
    }
};

// Mark a review as helpful/unhelpful
const voteReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const userId = req.user._id;
        const { helpful } = req.body;
        
        // Find the review
        const review = await Review.findById(reviewId);
        
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }
        
        // Check if user already voted
        const existingVote = review.votedUsers.find(
            vote => vote.userID.toString() === userId.toString()
        );
        
        if (existingVote) {
            // Update existing vote
            existingVote.helpful = helpful;
        } else {
            // Add new vote
            review.votedUsers.push({
                userID: userId,
                helpful: helpful
            });
        }
        
        // Recalculate helpful votes count
        review.helpfulVotes = review.votedUsers.filter(vote => vote.helpful).length;
        
        await review.save();
        
        return res.status(200).json({
            message: `Review marked as ${helpful ? 'helpful' : 'unhelpful'}`,
            helpfulVotes: review.helpfulVotes
        });
    } catch (error) {
        console.error('Error voting for review:', error);
        return res.status(500).json({ message: 'Error processing your vote' });
    }
};

// Add a reply to a review
const addReply = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const userId = req.user._id;
        const { content } = req.body;
        
        if (!content || content.trim() === '') {
            return res.status(400).json({ message: 'Reply content cannot be empty' });
        }
        
        // Find the review
        const review = await Review.findById(reviewId);
        
        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }
        
        // Add reply
        review.replies.push({
            userID: userId,
            content: content,
            createdAt: new Date()
        });
        
        await review.save();
        
        // Get user info for response
        const user = await User.findById(userId, 'username firstName lastName profileImage');
        
        return res.status(201).json({
            message: 'Reply added successfully',
            reply: {
                userID: userId,
                user: user,
                content: content,
                createdAt: new Date()
            }
        });
    } catch (error) {
        console.error('Error adding reply:', error);
        return res.status(500).json({ message: 'Error adding reply' });
    }
};

// Get review stats for product
const getReviewStats = async (req, res) => {
    try {
        const { productId } = req.params;
        
        // Get product with rating summary
        const product = await Product.findById(productId, 'ratingsSummary');
        
        if (!product) {
            return res.status(404).json({ message: 'Product not found' });
        }
        
        return res.status(200).json({
            stats: product.ratingsSummary
        });
    } catch (error) {
        console.error('Error fetching review stats:', error);
        return res.status(500).json({ message: 'Error fetching review statistics' });
    }
};


module.exports  = {
    loadHome,
    getProducts,
    getProductDetails,
    createReview,updateReview , deleteReview , voteReview ,addReply ,getReviewStats
}