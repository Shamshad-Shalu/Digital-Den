const Cart = require("../../model/cartSchema");
const Product = require("../../model/productSchema");
const { determineStatus } = require("../../utils/helper");
const User = require("../../model/userSchema");
const Address = require("../../model/addressModel");
const Order  = require("../../model/orderSchema");
const Wishlist = require("../../model/wishlistSchema"); 
const Wallet = require("../../model/walletSchema");
const Coupon = require("../../model/couponSchema");
const Offer = require("../../model/offerSchema");
const {State} = require("country-state-city");
const mongoose = require("mongoose");
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();
const Razorpay = require('razorpay');
const crypto = require("crypto");

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});

// const getWishlistPage = async (req , res) => {

//     try {
//         const { isLoggedIn, userData ,page } = res.locals;
        
//         page = parseInt(page) || 1;
//         let limit = 5;

//         let query = {};

//         if (!isLoggedIn ) {
//             return res.status(401).redirect("/user/home");
//         }



//         //  const coupons = await Coupon.find(query)
//         //             .sort({ createdAt: -1 })
//         //             .limit(limit)
//         //             .skip((page - 1) * limit)
//         //             .exec();

//         const wishlist = await Wishlist.findOne({ userId: userData._id })
//             .populate({
//                 path: 'products.productId',
//                 populate: [
//                     { path: "brand" },
//                     { path: "category" }
//                 ]
//             })
//             .sort({ createdAt: -1 })
//             .limit(limit)
//             .skip((page - 1) * limit)
//             .exec();

//         if (!wishlist) {
//             return res.render("user/wishlist", {
//                 wishlist: { products: [] }
//             });
//         } 

//         const validProducts = [];
//         for(let i = 0;i < wishlist.products.length ;i++){
//             const item = wishlist.products[i];
//             const product = item.productId;

//             if(!product || !product._id) continue;

//             const status = await determineStatus(product._id );
//             product.status = status;
//             await product.save();

//             validProducts.push(item);

//         }

//         // if (validProducts.length !== wishlist.products.length) {
//             wishlist.products = validProducts;
//             await wishlist.save();
//             // console.log("Updated wishlist in DB with valid products:", wishlist);
//         // }

//        // Prepare wishlist data for rendering
//        const wishlistData = {
//         products: wishlist.products
//             .map(item => {
//                 const productData = item.productId;
//                 if (!productData || !productData._id) return null;

//                 return {
//                     product: {
//                         id: productData._id,
//                         name: productData.productName,
//                         brand: productData.brand?.brandName,
//                         category: productData.category?.name,
//                         salePrice: productData.salePrice,
//                         regularPrice: productData.regularPrice,
//                         status: productData.status,
//                         quantity: productData.quantity,
//                         cardImage: productData.cardImage,
//                         rating: productData.rating
//                     }
//                 };
//             })
//             .filter(item => item !== null) 
//         };

//     res.render("user/wishlist", { wishlist: wishlistData });

//     } catch (error) {
//         console.error("Error in Wishlist:", error);
//         res.status(500).json({ 
//             success: false, 
//             message: "Failed to load cart page", 
//             error: error.message 
//         });
//     }  
// }

const getWishlistPage = async (req , res) => {

    try {
        const { isLoggedIn, userData  } = res.locals;
        // let  page= req.body. parseInt(page) || 1;
        // let limit = 5;

        // let query = {};

        if (!isLoggedIn ) {
            return res.status(401).json({ success: false, message: "Please login to manage wishlist",redirectUrl:"/user/signin" });
        }

        const wishlist = await Wishlist.findOne({ userId: userData._id })
            .populate({
                path: 'products.productId',
                populate: [
                    { path: "brand" },
                    { path: "category" }
                ]
            })
         

        if (!wishlist) {
            return res.render("user/wishlist", {
                wishlist: { products: [] }
            });
        } 

        const validProducts = [];
        for(let i = 0;i < wishlist.products.length ;i++){
            const item = wishlist.products[i];
            const product = item.productId;

            if(!product || !product._id) continue;

            const status = await determineStatus(product._id );
            product.status = status;
            await product.save();

            validProducts.push(item);

        }
            wishlist.products = validProducts;
            await wishlist.save();

       // Prepare wishlist data for rendering
       const wishlistData = {
        products: wishlist.products
            .map(item => {
                const productData = item.productId;
                if (!productData || !productData._id) return null;

                return {
                    product: {
                        id: productData._id,
                        name: productData.productName,
                        brand: productData.brand?.brandName,
                        category: productData.category?.name,
                        salePrice: productData.salePrice,
                        regularPrice: productData.regularPrice,
                        status: productData.status,
                        quantity: productData.quantity,
                        cardImage: productData.cardImage,
                        rating: productData.rating
                    }
                };
            })
            .filter(item => item !== null) 
        };

    res.render("user/wishlist", { wishlist: wishlistData });

    } catch (error) {
        console.error("Error in Wishlist:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to load cart page", 
            error: error.message 
        });
    }  
};

const addToWishlist = async (req , res )=>{
    const { isLoggedIn, userData, isUserBlocked } = res.locals;
    const { productId } = req.body;
    if (!isLoggedIn) {
        return res.status(401).json({ success: false, message: "Please login to add to wishlist",redirectUrl:"/user/signin" });
    }

    if (isUserBlocked) {
        return res.status(401).json({ success: false, message: "User is blocked and can't take actions" });
    }

    if (!productId) {
        return res.status(400).json({ success: false, message: "Product ID is required" });
    }

    try {

        const product = await Product.findById(productId)
            .populate('brand')
            .populate('category');

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        // Check product 
        const status = await determineStatus(product._id);
        if (status === 'Discontinued') {
            return res.status(400).json({ success: false, message: "Product is discontinued or unavailable" });
        }

        const existingProduct = await Wishlist.findOne({
            userId: userData._id,
            'products.productId': productId
        });

        if (existingProduct) {
            return res.status(400).json({ success: false, message: "Product is already in your wishlist" });
        }


        const wishlist =  await Wishlist.findOneAndUpdate(
            { userId:userData._id},
            {
                $push: {
                    products: {
                        productId :product._id,
                        addedOn:new Date()
                    }
                }
            },
            {
                upsert:true,
                new :true,
                runValidators:true  // Ensure schema validators are applied
            }
        );

        console.log("Updated wishlist:", wishlist);
        res.status(200).json({ success: true, message: "Product added to wishlist successfully" });

    } catch (error) {
        console.error("Error adding to wishlist:", error);
        res.status(500).json({
            success: false,
            message: "Failed to add product to wishlist",
            error: error.message
        });
    }
}

const removeFromWishlist = async (req, res) => {
    const { isLoggedIn, userData, isUserBlocked } = res.locals;
    const { productId } = req.body;

    if (!isLoggedIn) {
        return res.status(401).json({ success: false, message: "Please login to remove from wishlist" });
    }

    if (isUserBlocked) {
        return res.status(401).json({ success: false, message: "User is blocked and can't take actions" });
    }

    if (!productId) {
        return res.status(400).json({ success: false, message: "Product ID is required" });
    }

    try {
        const wishlist = await Wishlist.findOne({ userId: userData._id });

        if (!wishlist) {
            return res.status(404).json({ success: false, message: "Wishlist not found" });
        }

        // Find the index of the product in the wishlist
        const productIndex = wishlist.products.findIndex(item =>
            item.productId.toString() === productId.toString()
        );

        if (productIndex === -1) {
            return res.status(404).json({ success: false, message: "Product not found in wishlist" });
        }

        // Remove the product from the wishlist
        wishlist.products.splice(productIndex, 1);
        await wishlist.save();

        res.status(200).json({ success: true, message: "Product removed from wishlist successfully" });

    } catch (error) {
        console.error("Error removing from wishlist:", error);
        res.status(500).json({
            success: false,
            message: "Failed to remove product from wishlist",
            error: error.message
        });
    }
};
 
// const cron = require('node-cron');
// const { checkout } = require("../../router/user");


// const cron = require('node-cron');
// cron.schedule('0 0 * * *', async () => {
//     try {
//         await cleanupDiscontinuedItems();
//         console.log('Discontinued items cleanup completed');
//     } catch (error) {
//         console.error('Error in discontinued items cleanup:', error);
//     }
// });

// async function cleanupDiscontinuedItems() {
//     const deletePeriod = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

//     await Cart.updateMany(
//         { "items.discontinuedAt": { $lt: deletePeriod } },
//         { $pull: { items: { discontinuedAt: { $lt: deletePeriod } } } }
//     );
// }


// async function calculateCartTotals(cart, product, quantity) {
//     let subtotal = 0;
//     let discount = 0;

//     if (!cart?.items || cart.items.length === 0) {
//         if (product && quantity) {
//             subtotal = product.salePrice * quantity;
//             discount = (product.regularPrice - product.salePrice) * quantity;
//         }
//     } else {
//         const productIds = cart.items.map(item => item.productId);
        
//         const products = await Product.find({ 
//             _id: { $in: productIds },
//             isListed: true
//         }).populate('brand').populate('category');
        
//         for (const item of cart.items) {
//             if (item.discontinuedAt) continue;
            
//             const itemProduct = products.find(p => 
//                 p._id.toString() === (typeof item.productId === 'object' ? 
//                     item.productId._id.toString() : item.productId.toString())
//             );
            
//             if (itemProduct?.isListed && itemProduct.brand?.isListed && itemProduct.category?.isListed 
//                 && itemProduct.status !== "Discontinued" &&itemProduct.status !== "Out of stock") {
                
//                 subtotal += item.totalPrice;
//                 discount += (itemProduct.regularPrice - itemProduct.salePrice) * item.quantity;
//             }
//         }
        
//         // Add new product if it's not already in cart
//         if (product && quantity) {
//             const isNewProduct = !cart.items.some(item => 
//                 (typeof item.productId === 'object' ? 
//                     item.productId._id.toString() : item.productId.toString()) === product._id.toString()
//             );
            
//             if (isNewProduct) {
//                 subtotal += product.salePrice * quantity;
//                 discount += (product.regularPrice - product.salePrice) * quantity;
//             }
//         }
//     }
    

//     const tax = subtotal * 0.1; //10% tax 
//     const shipping = !subtotal ? 0 : (subtotal > 500 ? 0 : 50); 
//     const totalAmount = subtotal + tax + shipping;
    
//     return { subtotal, discount, tax, shipping, totalAmount };
// }
 


/////////////////////


// async function calculateCartTotals(cart, product, quantity) {
//     let subtotal = 0;
//     let discount = 0;

//     if (!cart?.items || cart.items.length === 0) {
//         if (product && quantity) {
//             const status = await determineStatus(product._id);
//             if (status === 'Discontinued' || status === 'Out of stock') {
//                 return { subtotal: 0, discount: 0, tax: 0, shipping: 0, totalAmount: 0 };
//             }

//             subtotal = product.salePrice * quantity;
//             discount = (product.regularPrice - product.salePrice) * quantity;
//         }
//     } else {
//         const productIds = cart.items.map(item => item.productId);
        
//         const products = await Product.find({ 
//             _id: { $in: productIds },
//             isListed: true
//         }).populate('brand').populate('category');
        
//         for (const item of cart.items) {
//             if (item.discontinuedAt){
//                 continue;
//             } 
            
//             const itemProduct = products.find(p => 
//                 p._id.toString() === (typeof item.productId === 'object' ? 
//                     item.productId._id.toString() : item.productId.toString())
//             );

//             if (!itemProduct) {
//                 item.discontinuedAt = new Date();
//                 continue;
//             }
            
//             const status = await determineStatus(itemProduct._id);
//             if (status === 'Discontinued' || status === 'Out of stock') {
//                 item.discontinuedAt = new Date();
//                 continue;
//             }

//            subtotal += item.totalPrice;
//             discount += (itemProduct.regularPrice - itemProduct.salePrice) * item.quantity;
//         }
        
//         // Add new product if not in cart
//         if (product && quantity) {
//             const isNewProduct = !cart.items.some(item => 
//                 (typeof item.productId === 'object' ? 
//                     item.productId._id.toString() : item.productId.toString()) === product._id.toString()
//             );
            
//             if (isNewProduct) {
//                 const status = await determineStatus(product._id);
//                 if (status !== 'Discontinued' && status !== 'Out of stock') {
//                     subtotal += product.salePrice * quantity;
//                     discount += (product.regularPrice - product.salePrice) * quantity;
//                 }
//             }
//         }
//     }
    

//     const tax = subtotal * 0.18; //18% tax 
//     const shipping = !subtotal ? 0 : (subtotal > 500 ? 0 : 50); 
//     const totalAmount = subtotal + tax + shipping;
    
//     return { subtotal, discount, tax, shipping, totalAmount };
// }

// async function calculateCartTotals(cart, product, quantity, appliedCoupon = null) {
//     let subtotal = 0;
//     let totalDiscount = 0;
//     let couponDiscount = 0;
//     let discountDetails = []; 

//     if (!cart?.items || cart.items.length === 0) {
//         if (product && quantity) {
//             const status = await determineStatus(product._id);
//             if (status === 'Discontinued' || status === 'Out of stock') {
//                 return { subtotal: 0, discount: 0, tax: 0, shipping: 0, totalAmount: 0, couponDiscount: 0, discountDetails: [] };
//             }

//             subtotal = product.regularPrice * quantity;

//             const productDiscount = (product.regularPrice - product.salePrice) * quantity;
//             const categoryDiscount = product.category?.categoryOffer 
//                 ? (product.regularPrice * product.category.categoryOffer * quantity) / 100 
//                 : 0;
//             const brandDiscount = product.brand?.brandOffer 
//                 ? (product.regularPrice * product.brand.brandOffer * quantity) / 100 
//                 : 0;

//             const maxDiscount = Math.max(productDiscount || 0, categoryDiscount || 0, brandDiscount || 0);
//             totalDiscount = maxDiscount;

//             let discountType = 'product';
//             if (maxDiscount === categoryDiscount) discountType = 'category';
//             else if (maxDiscount === brandDiscount) discountType = 'brand';

//             discountDetails.push({ productId: product._id, type: discountType, amount: maxDiscount / quantity });
//         }
//     } else {
//         const productIds = cart.items.map(item => item.productId);
        
//         const products = await Product.find({ 
//             _id: { $in: productIds },
//             isListed: true
//         }).populate('brand').populate('category');
        
//         for (const item of cart.items) {
//             if (item.discontinuedAt) continue;
            
//             const itemProduct = products.find(p => 
//                 p._id.toString() === (typeof item.productId === 'object' 
//                     ? item.productId._id.toString() 
//                     : item.productId.toString())
//             );

//             if (!itemProduct) {
//                 item.discontinuedAt = new Date();
//                 continue;
//             }
            
//             const status = await determineStatus(itemProduct._id);
//             if (status === 'Discontinued' || status === 'Out of stock') {
//                 item.discontinuedAt = new Date();
//                 continue;
//             }

//             const itemSubtotal = itemProduct.regularPrice * item.quantity;
//             subtotal += itemSubtotal;

//             const productDiscount = (itemProduct.regularPrice - itemProduct.salePrice) * item.quantity;
//             const categoryDiscount = itemProduct.category?.categoryOffer 
//                 ? (itemProduct.regularPrice * itemProduct.category.categoryOffer * item.quantity) / 100 
//                 : 0;
//             const brandDiscount = itemProduct.brand?.brandOffer 
//                 ? (itemProduct.regularPrice * itemProduct.brand.brandOffer * item.quantity) / 100 
//                 : 0;

//             const maxDiscount = Math.max(productDiscount || 0, categoryDiscount || 0, brandDiscount || 0);
//             totalDiscount += maxDiscount;

//             let discountType = 'product';
//             if (maxDiscount === categoryDiscount) discountType = 'category';
//             else if (maxDiscount === brandDiscount) discountType = 'brand';

//             discountDetails.push({ productId: itemProduct._id, type: discountType, amount: maxDiscount / item.quantity });
//         }

//         if (product && quantity) {
//             const isNewProduct = !cart.items.some(item => 
//                 (typeof item.productId === 'object' 
//                     ? item.productId._id.toString() 
//                     : item.productId.toString()) === product._id.toString()
//             );
            
//             if (isNewProduct) {
//                 const status = await determineStatus(product._id);
//                 if (status !== 'Discontinued' && status !== 'Out of stock') {
//                     const newSubtotal = product.regularPrice * quantity;
//                     subtotal += newSubtotal;

//                     const productDiscount = (product.regularPrice - product.salePrice) * quantity;
//                     const categoryDiscount = product.category?.categoryOffer 
//                         ? (product.regularPrice * product.category.categoryOffer * quantity) / 100 
//                         : 0;
//                     const brandDiscount = product.brand?.brandOffer 
//                         ? (product.regularPrice * product.brand.brandOffer * quantity) / 100 
//                         : 0;

//                     const maxDiscount = Math.max(productDiscount || 0, categoryDiscount || 0, brandDiscount || 0);
//                     totalDiscount += maxDiscount;

//                     let discountType = 'product';
//                     if (maxDiscount === categoryDiscount) discountType = 'category';
//                     else if (maxDiscount === brandDiscount) discountType = 'brand';

//                     discountDetails.push({ productId: product._id, type: discountType, amount: maxDiscount / quantity });
//                 }
//             }
//         }
//     }

//     if (appliedCoupon && subtotal >= appliedCoupon.minPurchase) {
//         if (appliedCoupon.status === 'Active' && (!appliedCoupon.expireOn || new Date() <= appliedCoupon.expireOn)) {
//             if (appliedCoupon.type === 'Percentage') {
//                 couponDiscount = (subtotal * appliedCoupon.discount) / 100;
//                 if (appliedCoupon.maxDiscount && couponDiscount > appliedCoupon.maxDiscount) {
//                     couponDiscount = appliedCoupon.maxDiscount;
//                 }
//             } else if (appliedCoupon.type === 'Fixed') {
//                 couponDiscount = appliedCoupon.discount;
//             }
//             totalDiscount += couponDiscount;
//         }
//     }

//     const tax = subtotal * 0.18;
//     const shipping = !subtotal ? 0 : (subtotal - totalDiscount > 500 ? 0 : 50);
//     const totalAmount = subtotal - totalDiscount + tax + shipping;

//     return { subtotal, discount: totalDiscount, tax, shipping, totalAmount, couponDiscount, discountDetails };
// }


// async function calculateCartTotals(cart, product, quantity, appliedCoupon = null) {
//     let subtotal = 0;
//     let totalDiscount = 0;
//     let couponDiscount = 0;
//     let discountDetails = []; 

//     if (!cart?.items || cart.items.length === 0) {
//         if (product && quantity) {
//             const status = await determineStatus(product._id);
//             if (status === 'Discontinued' || status === 'Out of stock') {
//                 return { subtotal: 0, discount: 0, tax: 0, shipping: 0, totalAmount: 0, couponDiscount: 0, discountDetails: [] };
//             }

//             subtotal = product.regularPrice * quantity;

//             const productDiscount = (product.regularPrice - product.salePrice) * quantity;
//             const categoryDiscount = product.category?.categoryOffer 
//                 ? (product.regularPrice * product.category.categoryOffer * quantity) / 100 
//                 : 0;
//             const brandDiscount = product.brand?.brandOffer 
//                 ? (product.regularPrice * product.brand.brandOffer * quantity) / 100 
//                 : 0;

//             const maxDiscount = Math.max(productDiscount || 0, categoryDiscount || 0, brandDiscount || 0);
//             totalDiscount = maxDiscount;

//             let discountType = 'product';
//             if (maxDiscount === categoryDiscount) discountType = 'category';
//             else if (maxDiscount === brandDiscount) discountType = 'brand';

//             discountDetails.push({ productId: product._id, type: discountType, amount: maxDiscount / quantity });
//         }
//     } else {
//         const productIds = cart.items.map(item => item.productId);
        
//         const products = await Product.find({ 
//             _id: { $in: productIds },
//             isListed: true
//         }).populate('brand').populate('category');
        
//         for (const item of cart.items) {
//             if (item.discontinuedAt) continue;
            
//             const itemProduct = products.find(p => 
//                 p._id.toString() === (typeof item.productId === 'object' 
//                     ? item.productId._id.toString() 
//                     : item.productId.toString())
//             );

//             if (!itemProduct) {
//                 item.discontinuedAt = new Date();
//                 continue;
//             }
            
//             const status = await determineStatus(itemProduct._id);
//             if (status === 'Discontinued' || status === 'Out of stock') {
//                 item.discontinuedAt = new Date();
//                 continue;
//             }

//             const itemSubtotal = itemProduct.regularPrice * item.quantity;
//             subtotal += itemSubtotal;

//             const productDiscount = (itemProduct.regularPrice - itemProduct.salePrice) * item.quantity;
//             const categoryDiscount = itemProduct.category?.categoryOffer 
//                 ? (itemProduct.regularPrice * itemProduct.category.categoryOffer * item.quantity) / 100 
//                 : 0;
//             const brandDiscount = itemProduct.brand?.brandOffer 
//                 ? (itemProduct.regularPrice * itemProduct.brand.brandOffer * item.quantity) / 100 
//                 : 0;

//             const maxDiscount = Math.max(productDiscount || 0, categoryDiscount || 0, brandDiscount || 0);
//             totalDiscount += maxDiscount;

//             let discountType = 'product';
//             if (maxDiscount === categoryDiscount) discountType = 'category';
//             else if (maxDiscount === brandDiscount) discountType = 'brand';

//             discountDetails.push({ productId: itemProduct._id, type: discountType, amount: maxDiscount / item.quantity });
//         }

//         if (product && quantity) {
//             const isNewProduct = !cart.items.some(item => 
//                 (typeof item.productId === 'object' 
//                     ? item.productId._id.toString() 
//                     : item.productId.toString()) === product._id.toString()
//             );
            
//             if (isNewProduct) {
//                 const status = await determineStatus(product._id);
//                 if (status !== 'Discontinued' && status !== 'Out of stock') {
//                     const newSubtotal = product.regularPrice * quantity;
//                     subtotal += newSubtotal;

//                     const productDiscount = (product.regularPrice - product.salePrice) * quantity;
//                     const categoryDiscount = product.category?.categoryOffer 
//                         ? (product.regularPrice * product.category.categoryOffer * quantity) / 100 
//                         : 0;
//                     const brandDiscount = product.brand?.brandOffer 
//                         ? (product.regularPrice * product.brand.brandOffer * quantity) / 100 
//                         : 0;

//                     const maxDiscount = Math.max(productDiscount || 0, categoryDiscount || 0, brandDiscount || 0);
//                     totalDiscount += maxDiscount;

//                     let discountType = 'product';
//                     if (maxDiscount === categoryDiscount) discountType = 'category';
//                     else if (maxDiscount === brandDiscount) discountType = 'brand';

//                     discountDetails.push({ productId: product._id, type: discountType, amount: maxDiscount / quantity });
//                 }
//             }
//         }
//     }

//     if (appliedCoupon && subtotal >= appliedCoupon.minPurchase) {
//         if (appliedCoupon.status === 'Active' && (!appliedCoupon.expireOn || new Date() <= appliedCoupon.expireOn)) {
//             if (appliedCoupon.type === 'Percentage') {
//                 couponDiscount = (subtotal * appliedCoupon.discount) / 100;
//                 if (appliedCoupon.maxDiscount && couponDiscount > appliedCoupon.maxDiscount) {
//                     couponDiscount = appliedCoupon.maxDiscount;
//                 }
//             } else if (appliedCoupon.type === 'Fixed') {
//                 couponDiscount = appliedCoupon.discount;
//             }
//             totalDiscount += couponDiscount;
//         }
//     }

//     const tax = subtotal * 0.18;
//     const shipping = !subtotal ? 0 : (subtotal - totalDiscount > 500 ? 0 : 50);
//     const totalAmount = subtotal - totalDiscount + tax + shipping;

//     return { subtotal, discount: totalDiscount, tax, shipping, totalAmount, couponDiscount, discountDetails };
// }


async function calculateBestOffer (product , quantity) {

    const productDiscount = Math.max((product.regularPrice - product.salePrice), 0)* quantity;
    const categoryDiscount = product.category?.categoryOffer 
        ? (product.regularPrice * product.category.categoryOffer * quantity) / 100 
        : 0;
    const brandDiscount = product.brand?.brandOffer 
        ? (product.regularPrice * product.brand.brandOffer * quantity) / 100 
        : 0;

    const specialOffer = await getSpecialOffer(product);
    const specialDiscount = specialOffer.discount * quantity;

    const maxDiscount = Math.max(productDiscount, categoryDiscount , brandDiscount ,specialDiscount);

    let discountType = 'product';
    if (maxDiscount === categoryDiscount){
        discountType = 'category';
    }else if (maxDiscount === brandDiscount) {
        discountType = 'brand';
    }else if (maxDiscount === specialDiscount) {
        discountType = specialOffer.type;
    }

    return {amount : maxDiscount , type : discountType }
}

async function calculateCartTotals(cart, product, quantity, appliedCoupon = null) {
    let subtotal = 0;
    let totalDiscount = 0;
    let couponDiscount = 0;
    let discountDetails = []; 

     //  When Cart is Empty
    if (!cart?.items || cart.items.length === 0) {
        if (product && quantity) {
            const status = await determineStatus(product._id);
            if (status === 'Discontinued' || status === 'Out of stock') {
                return { subtotal: 0, discount: 0, tax: 0, shipping: 0, totalAmount: 0, couponDiscount: 0, discountDetails: [] };
            }

            subtotal = product.regularPrice * quantity;

            const {amount , type } = await calculateBestOffer(product , quantity );

            totalDiscount = amount ;

            discountDetails.push({ productId: product._id, type , amount: amount / quantity });
        }
    // When Cart has Items
    } else {
        const productIds = cart.items.map(item => item.productId);
        
        const products = await Product.find({ 
            _id: { $in: productIds },
            isListed: true
        }).populate('brand').populate('category');
        
        for (const item of cart.items) {
            if (item.discontinuedAt) continue;
            
            const itemProduct = products.find(pr => 
                pr._id.toString() === (typeof item.productId === 'object' 
                    ? item.productId._id.toString() 
                    : item.productId.toString())
            );

            if (!itemProduct) {
                item.discontinuedAt = new Date();
                continue;
            }
            
            const status = await determineStatus(itemProduct._id);
            if (status === 'Discontinued' || status === 'Out of stock') {
                item.discontinuedAt = new Date();
                continue;
            }

            const itemSubtotal = itemProduct.regularPrice * item.quantity;
            subtotal += itemSubtotal;

            const {amount , type } = await calculateBestOffer(itemProduct , item.quantity );

            totalDiscount += amount ;

            discountDetails.push({ productId: itemProduct._id, type, amount: amount / item.quantity });
        }

        // Add New Product if not in cart
        if (product && quantity) {
            const isNewProduct = !cart.items.some(item => 
                (typeof item.productId === 'object' 
                    ? item.productId._id.toString() 
                    : item.productId.toString()) === product._id.toString()
            );
            
            if (isNewProduct) {
                const status = await determineStatus(product._id);
                if (status !== 'Discontinued' && status !== 'Out of stock') {
                    const newSubtotal = product.regularPrice * quantity;
                    subtotal += newSubtotal;

                    const { amount, type } = await calculateBestOffer(product, quantity);
                    totalDiscount += amount ;

                    discountDetails.push({ productId: product._id, type, amount: amount/ quantity });
                }
            }
        }
    }
    // coupon handle 
    if (appliedCoupon && subtotal >= appliedCoupon.minPurchase) {
        if (appliedCoupon.status === 'Active' && (!appliedCoupon.expireOn || new Date() <= appliedCoupon.expireOn)) {
            if (appliedCoupon.type === 'Percentage') {
                couponDiscount = (subtotal * appliedCoupon.discount) / 100;
                if (appliedCoupon.maxDiscount && couponDiscount > appliedCoupon.maxDiscount) {
                    couponDiscount = appliedCoupon.maxDiscount;
                }
            } else if (appliedCoupon.type === 'Fixed') {
                couponDiscount = appliedCoupon.discount;
            }
        }
    }

    const tax = subtotal * 0.18;
    const shipping =  !subtotal ? 0 : (subtotal - totalDiscount > 500 ? 0 : 50);
    const totalAmount = subtotal - totalDiscount - couponDiscount + tax + shipping;

    return { subtotal, discount: totalDiscount, tax, shipping, totalAmount, couponDiscount, discountDetails };
}

async function getSpecialOffer (product){
    const now = new Date();
    const regularPrice = product.regularPrice;
    const MAX_DISCOUNT = regularPrice * 0.5 ;

    const offers = await Offer.find({
        status: 'Active',
        startDate: { $lte: now },
        endDate: { $gte: now },
        $or: [
            { appliedOn: 'product', products: product._id },
            { appliedOn: 'brand', brands: product.brand?._id || product.brand },
            { appliedOn: 'category', categories: product.category?._id || product.category }
        ]
    });

    let maxDiscount = 0;
    let bestType = null;
    let offerName = null;

    for(let offer of offers) {
        let discount = 0 ;

        if(offer.type === "Percentage" ){
            discount = (regularPrice * offer.discount) / 100;
        }else if(offer.type ==="Fixed"){
            discount = offer.discount;
        }
        discount = Math.min(discount , MAX_DISCOUNT);
        
        if (discount > maxDiscount) {
            maxDiscount = discount;
            bestType = `${offer.appliedOn}`;
            offerName = offer.name;
        }
    };

    console.log({
        status: "Checking status of special discount",
        specialDiscount: maxDiscount,
        applyOn: bestType,
        name: offerName
    });
    return {discount: maxDiscount, type: bestType , offerName}
};


const addToCart = async (req ,res) => {

    const { isLoggedIn, userData, isUserBlocked } = res.locals;
    let { productId, quantity } = req.body;

    quantity = parseInt(quantity);

    try {
        const product = await Product.findById(productId)
            .populate('brand')
            .populate('category');

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        // Check product status using determineStatus
        const status = await determineStatus(product._id);
        if (status === 'Discontinued') {
            return res.status(404).json({ success: false, message: "Product is discontinued or unavailable" });
        }
        if (status === 'Out of stock') {
            return res.status(400).json({ success: false, message: "Product is out of stock" });
        }

        const maxQuantity = 10;
        let cart = await Cart.findOne({ userId: userData._id });
        let existingQuantity = 0;
        let existingItemIndex = -1;

        if (cart) {
            existingItemIndex = cart.items.findIndex(item => 
                item.productId.toString() === productId.toString()
            );
            
            if (existingItemIndex !== -1) {
                existingQuantity = cart.items[existingItemIndex].quantity;
            }
        }
        const totalQuantity = existingQuantity + quantity;
        
        if (totalQuantity > product.quantity) {
            return res.status(400).json({ success: false, message: `Sorry, only ${product.quantity} items available in stock` 
            });
        } 
        if (totalQuantity > maxQuantity) {
            return res.status(400).json({ 
                success: false, 
                message: `Maximum quantity per product is ${maxQuantity}` 
            });
        }

        if(!cart) {
            const totals = await calculateCartTotals(null, product, quantity);
            cart = new Cart({
                userId:userData._id,
                items:[{
                    productId:product._id,
                    quantity:quantity,
                    price:product.salePrice,
                    totalPrice:product.salePrice * quantity
                }],
                subtotal: totals.subtotal,
                discount: totals.discount,
                tax: totals.tax.toFixed(2),
                shipping: totals.shipping,
                couponDiscount : totals.couponDiscount,
                totalAmount: totals.totalAmount
            });
        }else {

             // Update existing or add new one 
             if (existingItemIndex !== -1) {
                cart.items[existingItemIndex].quantity = totalQuantity;
                cart.items[existingItemIndex].totalPrice = totalQuantity * product.salePrice;
                cart.items[existingItemIndex].discontinuedAt = null;
            } else {
                cart.items.push({
                    productId: product._id,
                    quantity: quantity,
                    price: product.salePrice,
                    totalPrice: product.salePrice * quantity
                });
            }



            const appliedCoupon = cart.appliedCoupon ? await Coupon.findById(cart.appliedCoupon) : null;
            const totals = await calculateCartTotals(cart, product, quantity, appliedCoupon);
            cart.subtotal = totals.subtotal;
            cart.discount = totals.discount;
            cart.tax = totals.tax.toFixed(2);
            cart.shipping = totals.shipping;
            cart.totalAmount = totals.totalAmount;
            cart.couponDiscount = totals.couponDiscount;

        } 

        await cart.save();

        // Remove the product from the wishlist
        let wishlist = await Wishlist.findOne({ userId: userData._id });
        if (wishlist) {
            const wishlistItemIndex = wishlist.products.findIndex(item => 
                item.productId.toString() === productId.toString()
            );
            if (wishlistItemIndex !== -1) {
                console.log("Product found :",productId)
                await Wishlist.updateOne({ userId: userData._id }, { $pull: { products: { productId: product._id } } });
                await wishlist.save();
            }
        }

        res.status(200).json({ success: true, message: "Product added to cart successfully" });
        
    } catch (error) {
        console.error("Error adding to cart:", error);
        res.status(500).json({ success: false, message: "Failed to add product to cart", error: error.message }); 
    }
} 

// const getCartPage = async (req, res) => {
//     const { isLoggedIn, userData } = res.locals;

//     if (!isLoggedIn ) {
//         return res.status(401).redirect("/user/home");
//     }
    
//     try {
//         const defaultCart = {
//             items: [],
//             subtotal: 0,
//             discount: 0,
//             tax: 0,
//             shipping: 0,
//             totalAmount: 0
//         };

//         // If user is not logged in, render empty cart
//         if (!isLoggedIn || !userData) {
//             return res.render('user/cart', { cart: defaultCart });
//         }
        
//         const cart = await Cart.findOne({ userId: userData._id })
//             .populate({
//                 path: 'items.productId',
//                 populate: [
//                     { path: "brand" },
//                     { path: "category" }
//                 ]
//             });

//         if (!cart) {
//             return res.render('user/cart', { cart: defaultCart });
//         }

//         for (let i = cart.items.length - 1; i >= 0; i--) {
//             const item = cart.items[i];
//             const product = item.productId;

//             if (!product || !product._id) {
//                 cart.items.splice(i, 1); // Remove invalid items
//                 continue;
//             }

//             const status = await determineStatus(product._id);
//             product.status = status;
//             await product.save();

//             if (status === 'Discontinued' || status === 'Out of stock') {
//                 item.discontinuedAt = item.discontinuedAt || new Date();
//             } else {
//                 if (item.discontinuedAt) {
//                     item.discontinuedAt = null;
//                 }
//             }
//         }

//         const totals = await calculateCartTotals(cart);

//         cart.subtotal = totals.subtotal;
//         cart.discount = totals.discount;
//         cart.tax = totals.tax.toFixed(2);
//         cart.shipping = totals.shipping;
//         cart.totalAmount = totals.totalAmount;

//         await cart.save();

//         // Prepare cart data for rendering
//         const cartData = {
//             items: cart.items.map(item => {
//                 const productData = item.productId;
//                 if (!productData || !productData._id) return null;
                
//                 return {
//                     product: {
//                         id: productData._id,
//                         name: productData.productName ,
//                         brand: productData.brand?.brandName ,
//                         category: productData.category?.name,
//                         salePrice: item.price,
//                         regularPrice: productData.regularPrice,
//                         status: productData.status,
//                         quantity: productData.quantity,
//                         cardImage: productData.cardImage,
//                         rating: productData.rating
//                     },
//                     isDiscontinued: !!item.discontinuedAt,
//                     quantity: item.quantity,
//                     totalPrice: item.totalPrice
//                 };
//             }).filter(Boolean), 
//             subtotal: cart.subtotal,
//             discount: cart.discount,
//             tax: cart.tax,
//             shipping: cart.shipping,
//             totalAmount: cart.totalAmount
//         };
    
//         res.render("user/cart", { cart: cartData });
    
//     } catch (error) {
//         console.error("Error in getCartPage:", error);
//         res.status(500).json({ 
//             success: false, 
//             message: "Failed to load cart page", 
//             error: error.message 
//         });
//     }
// };

// const getCartPage = async (req, res) => {
//     const { isLoggedIn, userData } = res.locals;

//     if (!isLoggedIn ) {
//         return res.status(401).json({ success: false, message: "Please login to manage cart",redirectUrl:"/user/signin" });
//     }

//     try {
//         const defaultCart = { 
//             items: [], 
//             subtotal: 0, 
//             discount: 0, 
//             tax: 0, 
//             shipping: 0, 
//             totalAmount: 0, 
//             couponDiscount: 0 // Ensure default value
//         };
//         if (!userData) return res.render('user/cart', { cart: defaultCart, coupons: [] });

//         let cart = await Cart.findOne({ userId: userData._id })
//             .populate({
//                 path: 'items.productId',
//                 populate: [{ path: "brand" }, { path: "category" }]
//             });

//         // Fetch available coupons
//         const coupons = await Coupon.find({
//             status: 'Active',
//             expireOn: { $gte: new Date() },
//             $or: [{ users: { $size: 0 } }, { users: userData._id }]
//         });

//         if (!cart) return res.render('user/cart', { cart: defaultCart, coupons });

//         for (let i = cart.items.length - 1; i >= 0; i--) {
//             const item = cart.items[i];
//             const product = item.productId;

//             if (!product || !product._id) {
//                 cart.items.splice(i, 1);
//                 continue;
//             }

//             const status = await determineStatus(product._id);
//             product.status = status;
//             await product.save();

//             if (status === 'Discontinued' || status === 'Out of stock') {
//                 item.discontinuedAt = item.discontinuedAt || new Date();
//             } else if (item.discontinuedAt) {
//                 item.discontinuedAt = null;
//             }
//         }

//         const appliedCoupon = cart.appliedCoupon ? await Coupon.findById(cart.appliedCoupon) : null;
//         const totals = await calculateCartTotals(cart, null, null, appliedCoupon);

//         cart.subtotal = totals.subtotal;
//         cart.discount = totals.discount;
//         cart.tax = totals.tax.toFixed(2);
//         cart.shipping = totals.shipping;
//         cart.totalAmount = totals.totalAmount;
//         cart.couponDiscount = totals.couponDiscount || 0; // Ensure it’s always defined

//         await cart.save();

//         const cartData = {
//             items: cart.items.map(item => {
//                 const productData = item.productId;
//                 if (!productData || !productData._id) return null;
        
//                 const discountDetail = totals.discountDetails.find(d => d.productId.toString() === productData._id.toString()) || {};
//                 const discountPercentage = discountDetail.amount 
//                     ? Math.round((discountDetail.amount / productData.regularPrice) * 100) 
//                     : 0;
//                 const effectivePrice = productData.regularPrice - (discountDetail.amount || 0); 
        
//                 return {
//                     product: {
//                         id: productData._id,
//                         name: productData.productName,
//                         brand: productData.brand?.brandName,
//                         category: productData.category?.name,
//                         salePrice: effectivePrice, 
//                         regularPrice: productData.regularPrice,
//                         status: productData.status,
//                         quantity: productData.quantity,
//                         cardImage: productData.cardImage,
//                         rating: productData.rating
//                     },
//                     isDiscontinued: !!item.discontinuedAt,
//                     quantity: item.quantity,
//                     totalPrice: effectivePrice * item.quantity, 
//                     discountType: discountDetail.type || 'product',
//                     discountPercentage: discountPercentage
//                 };
//             }).filter(Boolean),
//             subtotal: cart.subtotal,
//             discount: cart.discount,
//             tax: cart.tax,
//             shipping: cart.shipping,
//             totalAmount: cart.totalAmount,
//             couponDiscount: cart.couponDiscount || 0,
//             appliedCoupon: appliedCoupon ? { code: appliedCoupon.code, discount: cart.couponDiscount } : null
//         };

//         res.render("user/cart", { cart: cartData, coupons });
//     } catch (error) {
//         console.error("Error in getCartPage:", error);
//         res.status(500).json({ success: false, message: "Failed to load cart page", error: error.message });
//     }
// };


const getCartPage = async (req, res) => {
    const { userData } = res.locals;

    try {
        const defaultCart = { 
            items: [], subtotal: 0,  discount: 0,tax: 0,shipping: 0,totalAmount: 0,couponDiscount: 0 
        };

        let cart = await Cart.findOne({ userId: userData._id })
            .populate({ path: 'items.productId', populate: ["brand", "category"] })
            .populate('appliedCoupon');
            // .populate({
            //     path: 'items.productId',
            //     populate: [{ path: "brand" }, { path: "category" }]
            // });


        // Fetch available coupons
        const coupons = await Coupon.find({
            status: 'Active',
            expireOn: { $gte: new Date() },
            $or: [{ usersUsed: { $ne: userData._id } }, { usersUsed: { $exists: false } }],
        });

        if (!cart) return res.render('user/cart', { cart: defaultCart, coupons });

        await checkCartItemStatus(cart);
        await validateCartCoupon(cart);

        const appliedCoupon = cart.appliedCoupon ? await Coupon.findById(cart.appliedCoupon) : null;
        const totals = await calculateCartTotals(cart, null, null, appliedCoupon);

        cart.subtotal = totals.subtotal;
        cart.discount = totals.discount;
        cart.tax = totals.tax.toFixed(2);
        cart.shipping = totals.shipping;
        cart.couponDiscount = totals.couponDiscount
        cart.totalAmount = totals.totalAmount;
        cart.discountDetails = totals.discountDetails;

        await cart.save();
        

        const cartData = {
            items: cart.items.map(item => {
                const product = item.productId;
                const discount = totals.discountDetails.find(d => d.productId.toString() === product._id.toString()) || {};
                const effectivePrice = product.regularPrice - (discount.amount || 0 );
                
                return {
                    product: {
                        id: product._id,
                        name: product.productName,
                        brand: product.brand?.brandName,
                        category: product.category?.name,
                        salePrice: effectivePrice,
                        regularPrice: product.regularPrice,
                        status: product.status,
                        quantity: product.quantity,
                        cardImage: product.cardImage,
                        rating: product.rating,
                    },
                    isDiscontinued : !!item.discontinuedAt,
                    quantity: item.quantity,
                    totalPrice: effectivePrice * item.quantity,
                    discountType: discount.type || 'product',
                    discountPercentage: discount.amount ? Math.round((discount.amount / product.regularPrice) * 100) : 0
                };
            }),
            subtotal: cart.subtotal,
            discount: cart.discount,
            tax: cart.tax,
            shipping: cart.shipping,
            shipping: cart.shipping,
            couponDiscount : cart.couponDiscount,
            totalAmount: cart.totalAmount,
            couponCode: appliedCoupon?.code || null
        }

        res.render("user/cart", { cart: cartData, coupons });

    } catch (error) {
        console.error("Error in getCartPage:", error);
        res.status(500).json({ success: false, message: "Failed to load cart page", error: error.message });
    }
};

async function checkCartItemStatus(cart) {

    for (let i = cart.items.length - 1; i >= 0; i--) {
        const item = cart.items[i];
        const product = await Product.findById(item.productId);

        if (!product) {
            cart.items.splice(i, 1);
            continue;
        }

        const status = await determineStatus(product._id);

        if (product.status !== status) {
            product.status = status;
            await product.save();
        }

        if (status === 'Discontinued' || status === 'Out of stock') {
            item.discontinuedAt = item.discontinuedAt || new Date();
        } else if (item.discontinuedAt) {
            item.discontinuedAt = null;
        }
    }

    await cart.save();
    return cart;
}

// const applyCoupon = async (req, res) => {

//     const { userData, isUserBlocked } = res.locals;
//     const { couponCode } = req.body;

//     if (isUserBlocked) return res.status(401).json({ success: false, message: "User is blocked and can't take actions..!" });

//     try {
//         const cart = await Cart.findOne({ userId: userData._id })
//              .populate('items.productId').populate('appliedCoupon');
//         if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });

//         if(cart.appliedCoupon ?.code === couponCode ){
//             cart.appliedCoupon = null;
//             cart.couponDiscount = 0 ;
//         }

//         const coupon = await Coupon.findOne({ 
//             code: couponCode.toUpperCase(), 
//             status: 'Active', 
//             expireOn: { $gte: new Date() },
//             $or: [{ users: { $size: 0 } }, { users: userData._id }]
//         });

//         if (!coupon) return res.status(400).json({ success: false, message: "Invalid or expired coupon" });
//         if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return res.status(400).json({ success: false, message: "Coupon usage limit reached" });

//         const totals = await calculateCartTotals(cart, null, null, coupon);
//         if (totals.subtotal < coupon.minPurchase) return res.status(400).json({ success: false, message: `Minimum purchase of ₹${coupon.minPurchase} required for this coupon` });

//         cart.appliedCoupon = coupon._id;
//         cart.subtotal = totals.subtotal;
//         cart.discount = totals.discount;
//         cart.tax = totals.tax.toFixed(2);
//         cart.shipping = totals.shipping;
//         cart.totalAmount = totals.totalAmount;
//         cart.couponDiscount = totals.couponDiscount;

//         await cart.save();
//         await Coupon.updateOne({ _id: coupon._id }, { $inc: { usedCount: 1 }, $addToSet: { users: userData._id } });

//         res.status(200).json({ 
//             success: true, 
//             message: "Coupon applied successfully", 
//             cart: prepareCartData(cart),
//             appliedCoupon: { code: coupon.code, discount: totals.couponDiscount }
//         });
//     } catch (error) {
//         console.error("Error applying coupon:", error);
//         res.status(500).json({ success: false, message: "Failed to apply coupon", error: error.message });
//     }
// };



const applyCoupon = async (req, res) => {

    const { userData, isUserBlocked } = res.locals;
    const { couponCode } = req.body;

    if (isUserBlocked) return res.status(401).json({ success: false, message: "User is blocked and can't take actions..!" });

    try {
        const cart = await Cart.findOne({ userId: userData._id })
             .populate('items.productId').populate('appliedCoupon');

        if (!cart) return res.status(404).json({ success: false, message: "Cart not found" });

        if (cart.appliedCoupon?.code === couponCode) {
            return res.status(400).json({ success: false, message: "This coupon is already applied to your cart" });
        }

        const coupon = await Coupon.findOne({ code: couponCode, status: 'Active', expireOn: { $gte: new Date() } });
        if (!coupon) {
            return res.status(400).json({ success: false, message: "Coupon not found or expired" });
        }

        if (coupon.usersUsed.includes(userData._id)) {
            return res.status(400).json({ success: false, message: "You have already used this coupon" });
        }

        // Calculate subtotal of valid products  
        const subtotal = cart.items
            .filter(item => !item.discontinuedAt && item.productId.status !== 'Out of stock')
            .reduce((acc, item) => acc + item.totalPrice, 0);

        if (subtotal < coupon.minPurchase) {
            return res.json({ success: false, message: `Minimum purchase ₹${coupon.minPurchase} required` });
        }

        if (cart.appliedCoupon) {
            await Coupon.updateOne(
                { _id: cart.appliedCoupon._id },
                { $pull: { usersUsed: userData._id } }
            );
            cart.appliedCoupon = null;
            cart.couponDiscount = 0;
        }

        const totals = await calculateCartTotals(cart, null, null, coupon);
        cart.appliedCoupon = coupon._id;
        cart.subtotal = totals.subtotal;
        cart.discount = totals.discount;
        cart.tax = totals.tax.toFixed(2);
        cart.shipping = totals.shipping;
        cart.totalAmount = totals.totalAmount;
        cart.couponDiscount = totals.couponDiscount;

        await cart.save();
            
        await Coupon.updateOne({ _id: coupon._id }, { $addToSet: { usersUsed: userData._id } });

        res.status(200).json({ 
            success: true, 
            message: "Coupon applied successfully", 
            cart: prepareCartData(cart),
            appliedCoupon: { code: coupon.code, couponDiscount : totals.couponDiscount }
        });

    } catch (error) {
        console.error("Error applying coupon:", error);
        res.status(500).json({ success: false, message: "Failed to apply coupon", error: error.message });
    }
};

// await Coupon.updateOne({ _id: coupon._id }, { $inc: { usedCount: 1 }, $addToSet: { userId: userData._id } });
// if (coupon.usageLimit && coupon.usedCount >= coupon.usageLimit) return res.status(400).json({ success: false, message: "Coupon usage limit reached" });


const updateCart = async (req , res) => {
    const maxQuantity = 10;
    let {productId , quantity } = req.body;
    const {userData , isUserBlocked} = res.locals;

    if (isUserBlocked) {
        return res.status(401).json({ success: false, message: "User is blocked and can't take actions..!" });
    }

    try {

        const product = await Product.findById(productId)
            .populate('brand')
            .populate('category')
            .populate('appliedCoupon');

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        const status = await determineStatus(product._id);
        if (status === 'Discontinued') {
            return res.status(400).json({ success: false, message: "Product is discontinued or unavailable" });
        }
        if (status === 'Out of stock') {
            return res.status(400).json({ success: false, message: "Product is out of stock" });
        }

        const cart = await Cart.findOne({userId:userData._id});

        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found" });
        }

        const cartItemIndex = cart.items.findIndex(item => 
            item.productId.toString() === productId.toString()
        );

        if (cartItemIndex === -1) {
            return res.status(404).json({ success: false, message: "Item not found in cart" });
        }

        if(quantity > product.quantity) {
            return res.status(404).json({
                success:false,
                message:`Sorry, only ${product.quantity} items available in stock` 

            })
        }

        if (quantity > maxQuantity) {
            return res.status(400).json({ 
                success: false, 
                message: `Maximum quantity per product is ${maxQuantity}` 
            });
        }

        // Update item quantity and price
        cart.items[cartItemIndex].quantity = quantity;
        cart.items[cartItemIndex].totalPrice = product.salePrice * quantity;

         // Clear any discontinued flag
        if (cart.items[cartItemIndex].discontinuedAt) {
            cart.items[cartItemIndex].discontinuedAt = null;
        }

        await validateCartCoupon(cart);

         // Recalculate cart totals
         const totals = await calculateCartTotals(cart);
        cart.subtotal = totals.subtotal;
        cart.discount = totals.discount;
        cart.tax = totals.tax.toFixed(2);
        cart.shipping = totals.shipping; 
        cart.couponDiscount = totals.couponDiscount,
        cart.totalAmount = totals.totalAmount;

        await cart.save();
    
        const cartData = prepareCartData(cart);

        res.status(200).json({ 
            success: true, 
            message: "Cart updated successfully", 
            cart: cartData 
        });

    } catch (error) {
        console.error("Error updating cart quantity:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to update cart", 
            error: error.message 
        }); 
    }
};

// const validateCartCoupon = async (cart) => {
//     let message = null;

//     if (!cart.appliedCoupon) {
//       return { cart, message };
//     }
  
//     try {

//       const coupon = await Coupon.findById(cart.appliedCoupon);
      
//       if (!coupon) {
//         cart.appliedCoupon = null;
//         cart.couponDiscount = 0;
//         await cart.save();
//         return cart;
//       }
  

//       const validSubtotal = cart.items
//         .filter(item => {
//           // Skip discontinued items
//           if (item.discontinuedAt) return false;
  
//           if (typeof item.productId === 'object' && item.productId !== null) {
//             return item.productId.status !== 'Out of stock';
//           } else {
//             return item.totalPrice > 0;
//           }
//         })
//         .reduce((acc, item) => acc + item.totalPrice, 0);
      
//       if (validSubtotal < coupon.minPurchase || validSubtotal === 0) {
//         await Coupon.updateOne(
//           { _id: coupon._id },
//           { $pull: { usersUsed: cart.userId } }
//         );
        
//         cart.appliedCoupon = null;
//         cart.couponDiscount = 0;
        
//         // Recalculate cart totals without coupon
//         const totals = await calculateCartTotals(cart);
//         cart.subtotal = totals.subtotal;
//         cart.discount = totals.discount;
//         cart.tax = totals.tax.toFixed(2);
//         cart.shipping = totals.shipping;
//         cart.couponDiscount = totals.couponDiscount,
//         cart.totalAmount = totals.totalAmount;
        
//         await cart.save();
        
//         message = `Coupon "${coupon.code}" has been removed as your cart no longer meets the minimum purchase requirement of ₹${coupon.minPurchase}`;
//       } else if (coupon.status !== 'Active' || new Date() > coupon.expireOn) {
//         // Coupon is expired or disabled
//         cart.appliedCoupon = null;
//         cart.couponDiscount = 0;
        
//         // Recalculate cart totals without coupon
//         const totals = await calculateCartTotals(cart);
//         cart.subtotal = totals.subtotal;
//         cart.discount = totals.discount;
//         cart.tax = totals.tax.toFixed(2);
//         cart.shipping = totals.shipping;
//         cart.couponDiscount = totals.couponDiscount,
//         cart.totalAmount = totals.totalAmount;
        
//         await cart.save();
        
//         message = "Applied coupon has expired and has been removed";
//       }
      
//       return { cart, message };
//     } catch (error) {
//       console.error("Error validating cart coupon:", error);
//       return { cart, message: "Error validating coupon" };
//     }
//   };

const validateCartCoupon = async (cart) => {
    try {
        if (!cart.appliedCoupon) return cart;
        
        const coupon = await Coupon.findById(cart.appliedCoupon);
        if (!coupon) {
            cart.appliedCoupon = null;
            cart.couponDiscount = 0;
            return cart;
        }
        const subtotal = cart.items
            .filter(item => !item.discontinuedAt && 
                   (typeof item.productId === 'object' ? 
                     item.productId.status !== 'Out of stock' : true))
            .reduce((acc, item) => acc + item.totalPrice, 0);

        if (subtotal < coupon.minPurchase) {

            await Coupon.updateOne(
                { _id: coupon._id },
                { $pull: { usersUsed: cart.userId } }
            );
        
            cart.appliedCoupon = null;
            cart.couponDiscount = 0;
        }
        
        return cart;
    } catch (error) {
        console.error("Error validating cart coupon:", error);
        return cart;
    }
};

function prepareCartData(cart) {
    return {
        items: cart.items.map(item => {
            const productData = item.productId;
            
            return {
                product: {
                    id: productData._id ,
                    name: productData.productName,
                    status: productData.status || 'Available'
                },
                isDiscontinued: !!item.discontinuedAt,
                quantity: item.quantity,
                totalPrice: item.totalPrice
            };
        }),
        subtotal: cart.subtotal,
        discount: cart.discount,
        tax: cart.tax,
        shipping: cart.shipping,
        couponDiscount: cart.couponDiscount,
        totalAmount: cart.totalAmount
    };
}

const removeFromCart = async (req , res ) => {
    console.log("Remove cart function")

    let {productId } = req.body;
    const {userData , isUserBlocked} = res.locals;

    if (isUserBlocked) {
        return res.status(401).json({ success: false, message: "User is blocked and can't take actions..!" });
    }
    try {

        const cart = await Cart.findOne({ userId: userData._id });
        if (!cart) {
            return res.status(404).json({ success: false, message: "Cart not found" });
        }
        
         // Find the item index in the cart
         const itemIndex = cart.items.findIndex(item => 
            item.productId.toString() === productId.toString()
        );

        if (itemIndex === -1) {
            return res.status(404).json ({ success: false, message: "Item not found in cart" });
        }

        cart.items.splice(itemIndex, 1);
 
        // Recalculate cart totals
        await validateCartCoupon(cart);
        const totals = await calculateCartTotals(cart);
        
        cart.subtotal = totals.subtotal;
        cart.discount = totals.discount;
        cart.tax = totals.tax.toFixed(2);
        cart.shipping = totals.shipping;
        cart.couponDiscount = totals.couponDiscount,
        cart.totalAmount = totals.totalAmount;

        await cart.save();
        // Prepare cart data for response
        const cartData = prepareCartData(cart);

        return res.status(200).json({success: true,message:"Item removed from cart successfully"})
        
    } catch (error) {
        console.error("Error removing item from cart:", error);
        res.status(500).json({ success: false, message: "Failed to remove item from cart"})
    }
}

const  proceedToCheckout = async (req , res) => {
    const { isLoggedIn, userData, isUserBlocked } = res.locals;

    if (!isLoggedIn) {
        return res.status(401).json({ success: false, message: "Please login to proceed to checkout" });
    }
    
    if (isUserBlocked) {
        return res.status(401).json({ success: false, message: "User is blocked and can't take actions" });
    }

    try {

        const cart = await Cart.findOne({userId:userData._id})
                     .populate("items.productId")
                     .populate("productName productImage salePrice regularPrice isListed quantity status")
        
        if (!cart || cart.length === 0) {
            return res.status(400).json({ success: false, message: "Cart is empty" });
        } 
        
        for (const item of cart.items) {
            const product = item.productId;

            if (!product) {
                return res.status(400).json({ success: false, message: "One or more products in your cart are no longer available" });
            }

            const status = await determineStatus(product._id);
            product.status = status;
            await product.save();

            if (status === 'Discontinued') {
                return res.status(400).json({ success: false, message: `${product.productName} is discontinued and cannot be checked out` });
            }
            if (status === 'Out of stock' || product.quantity < item.quantity) {
                return res.status(400).json({ success: false, message: `${product.productName} is out of stock or has insufficient stock`});
            }
        }

        req.session.checkoutActive = true;
        req.session.cartId = cart._id;

        res.status(200).json({ 
            success: true, 
            message: "Moved to checkout successfully",
            checkoutData: {
                items: cart.items,
                subtotal: cart.subtotal,
                discount: cart.discount,
                tax: cart.tax,
                shipping: cart.shipping,
                totalAmount: cart.totalAmount
            }
        });   
    } catch (error) {
        console.error("Error moving to checkout:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to proceed to checkout", 
            error: error.message 
        });
    }

}
 
// const getCheckoutpage = async (req, res) => {
//     const {userData, isLoggedIn,isUserBlocked} = res.locals;
//     if (!isLoggedIn || isUserBlocked) {
//         return res.status(401).redirect("/user/home");
//     }
//     try {

//         // Fetch the user
//         const user = await User.findById(userData._id);
//         if (!user) {
//             return res.redirect("/user/home");
//         }

//         const cart = await Cart.findOne({ userId: userData._id })
//             .populate({
//                 path: 'items.productId',
//                 select: 'productName cardImage salePrice regularPrice isListed quantity status',
//                 populate: [
//                     { path: "brand" },
//                     { path: "category" }
//                 ]
//             });
        
//         if (!cart || cart.items.length === 0) {
//             return res.status(400).json({ success: false, message: "Cart is empty" });
//         }


//       const userAddresses = await Address.findOne({ userId:userData._id  });
//       const addresses = userAddresses ? userAddresses.addresses : []; 
//       // Fetch Indian states 
//       const indianStates = State.getStatesOfCountry("IN");

//       const cartItems = cart.items.map(item => {
//             const product = item.productId;
//             return {
//                 id: item._id,
//                 productId: product._id,
//                 productName: product.productName,
//                 cardImage: product.cardImage,
//                 salePrice: product.salePrice,
//                 regularPrice: product.regularPrice,
//                 quantity: item.quantity,
//                 totalPrice: item.totalPrice,
                
//             };
//         });

//         const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
//         console.log(totalItems)
//         const defaultAddress = addresses.some(addr => addr.isDefault);

//         res.render("user/checkout",{
//             checkoutData : {
//                 states: indianStates,
//                 addresses,
//                 defaultAddress,
//                 cartItems,
//                 razorpayKeyId: process.env.RAZORPAY_KEY_ID,
//                 summery:{
//                     totalItems,
//                     subtotal:cart.subtotal,
//                     discount: cart.discount,
//                     tax: cart.tax,
//                     shipping: cart.shipping,
//                     totalAmount: cart.totalAmount
//                 }    
//             }
//         })

//     } catch (error) {

//         console.error('Error fetching Address:', error);
//         res.status(500).send("Server error ");
        
//     }
// }

const getCheckoutpage = async (req, res) => {
    const {userData, isLoggedIn,isUserBlocked} = res.locals;
    if (!isLoggedIn || isUserBlocked) {
        return res.status(401).redirect("/user/home");
    }
    try {

        // Fetch the user
        const user = await User.findById(userData._id);
        if (!user) {
            return res.redirect("/user/home");
        }

        const cart = await Cart.findOne({ userId: userData._id })
            .populate({
                path: 'items.productId',
                select: 'productName cardImage salePrice regularPrice isListed quantity status',
                populate: [
                    { path: "brand" },
                    { path: "category" }
                ]
            });
        
        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: "Cart is empty" });
        }


      const userAddresses = await Address.findOne({ userId:userData._id  });
      const addresses = userAddresses ? userAddresses.addresses : []; 
      const indianStates = State.getStatesOfCountry("IN");

      const wallet = await Wallet.findOne({userId:userData._id});
      const walletBalance = wallet ? wallet.balance  : 0;

      const cartItems = cart.items.map(item => {
            const product = item.productId;
            return {
                id: item._id,
                productId: product._id,
                productName: product.productName,
                cardImage: product.cardImage,
                salePrice: product.salePrice,
                regularPrice: product.regularPrice,
                quantity: item.quantity,
                totalPrice: item.totalPrice,
                
            };
        });

        const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
        const defaultAddress = addresses.some(addr => addr.isDefault);

        res.render("user/checkout",{
            checkoutData : {
                states: indianStates,
                addresses,
                defaultAddress,
                cartItems,
                walletBalance,
                razorpayKeyId: process.env.RAZORPAY_KEY_ID,
                summery:{
                    totalItems,
                    subtotal:cart.subtotal,
                    discount: cart.discount,
                    discount: cart.discount,
                    couponDiscount : cart.couponDiscount,
                    tax: cart.tax,
                    shipping: cart.shipping,
                    totalAmount: cart.totalAmount
                }    
            }
        })

    } catch (error) {

        console.error('Error fetching Address:', error);
        res.status(500).send("Server error ");
        
    }
}

// const placeOrder = async (req, res) => {
//     try {
//         const { userData, isLoggedIn, isUserBlocked } = res.locals;

//         if (!isLoggedIn || isUserBlocked) {
//             return res.status(401).redirect("/user/home");
//         }

//         const { addressId, paymentMethod, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

//         if (!addressId || !paymentMethod) {
//             return res.status(400).json({ success: false, message: "Address and payment method are required" });
//         }

//         let paymentStatus;
//         if (paymentMethod === 'Online') {

//             try {
//                 const crypto = require('crypto');
//                 const generatedSignature = crypto
//                     .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
//                     .update(razorpay_order_id + '|' + razorpay_payment_id)
//                     .digest('hex');
        
//                 paymentStatus = (generatedSignature === razorpay_signature) ? "Paid" : "Failed";
//             } catch (error) {
//                 paymentStatus = "Failed";
//             }
//             // if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
//             //     return res.status(400).json({ success: false, message: "Razorpay payment details are required" });
//             // }

            
//             // const crypto = require('crypto');
//             // const generatedSignature = crypto
//             //     .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
//             //     .update(razorpay_order_id + '|' + razorpay_payment_id)
//             //     .digest('hex');

//             // if (generatedSignature !== razorpay_signature) {
//             //     return res.status(400).json({ success: false, message: "Payment verification failed" });
//             // }
//         }

//         const user = await User.findById(userData._id);

//         if (!user) {
//             return res.status(404).json({ success: false, message: "User not found" });
//         }

//         let cart = await Cart.findOne({ userId: userData._id }).populate({
//             path: "items.productId",
//             select: "productName salePrice regularPrice quantity status",
//             populate: [
//                 { path: "brand" },
//                 { path: "category" },
//             ],
//         });

//         if (!cart || cart.items.length === 0) {
//             return res.status(400).json({ success: false, message: "Cart is empty" });
//         }

//         cart.items = cart.items.filter((item) => !item.discontinuedAt);

//         if (cart.items.length === 0) {
//             return res.status(400).json({ success: false, message: "No valid items in cart to order" });
//         }

//         // Final status check and quantity update
//         for (const item of cart.items) {
//             const product = await Product.findById(item.productId._id);
//             if (!product) {
//                 return res.status(400).json({
//                     success: false,
//                     message: "One or more products in your cart are no longer available",
//                 });
//             }

//             const status = await determineStatus(product._id);
//             product.status = status;
//             await product.save();

//             if (status === "Discontinued") {
//                 return res.status(400).json({
//                     success: false,
//                     message: `${product.productName} is discontinued and cannot be ordered`,
//                 });
//             }
//             if (status === "Out of stock" || product.quantity < item.quantity) {
//                 return res.status(400).json({
//                     success: false,
//                     message: `${product.productName} is out of stock or has insufficient stock`,
//                 });
//             }

//             // Update product quantity
//             product.quantity -= item.quantity;
//             await product.save();
//         }

//         const userAddresses = await Address.findOne({ userId: userData._id });
//         if (!userAddresses) {
//             return res.status(404).json({ success: false, message: "No addresses found for this user" });
//         }

//         const selectedAddress = userAddresses.addresses.find((addr) => {
//             return addr._id.toString() === addressId;
//         });

//         if (!selectedAddress) {
//             return res.status(404).json({ success: false, message: "Selected address not found" });
//         }

//         const orderedItems = cart.items.map((item) => ({
//             product: item.productId._id,
//             quantity: item.quantity,
//             price: item.productId.salePrice,
//         }));

//         let address = {
//             addressType: selectedAddress.addressType,
//             name: selectedAddress.name,
//             addressLine: selectedAddress.addressLine,
//             city: selectedAddress.city,
//             landmark: selectedAddress.landmark,
//             state: selectedAddress.state,
//             pincode: selectedAddress.pincode,
//             phone: selectedAddress.phone,
//             altPhone: selectedAddress.altPhone,
//             isDefault: selectedAddress.isDefault,
//         };

//         const newOrder = new Order({
//             userId: user._id,
//             orderId: uuidv4(),
//             orderedItems,
//             totalPrice: cart.subtotal,
//             discount: cart.discount,
//             tax: cart.tax,
//             shipping: cart.shipping,
//             finalAmount: cart.totalAmount,
//             address: address,
//             paymentMethod,
//             invoiceDate: Date.now(),
//             status: paymentStatus === "Paid" ? "Processing" : "Pending",
//             paymentStatus: paymentStatus,
//             couponApplied: cart.discount > 0,
//             razorpay_payment_id: paymentMethod === 'Online' ? razorpay_payment_id : undefined,
//             razorpay_order_id: paymentMethod === 'Online' ? razorpay_order_id : undefined,
//         });

//         await newOrder.save();

//         // Clear the cart 
//         await Cart.findOneAndUpdate(
//             { userId: userData._id },
//             { $set: { items: [], subtotal: 0, discount: 0, tax: 0, shipping: 0, totalAmount: 0 } }
//         );

//         req.session.orderId = newOrder.orderId;

//         return res.status(200).json({
//             success: true,
//             message: "Order placed successfully",
//             orderId: newOrder.orderId,
//         });
//     } catch (error) {
//         console.error("Error placing order:", error);
//         return res.status(500).json({
//             success: false,
//             message: "Server error: " + error.message,
//         });
//     }
// };


const placeOrder = async (req, res) => {
    try {
        const { userData, isLoggedIn, isUserBlocked } = res.locals;

        if (!isLoggedIn || isUserBlocked) {
            return res.status(401).redirect("/user/home");
        }

        const { addressId, paymentMethod, razorpay_payment_id, razorpay_order_id, razorpay_signature } = req.body;

        if (!addressId || !paymentMethod) {
            return res.status(400).json({ success: false, message: "Address and payment method are required" });
        }

        let paymentStatus = "Pending"

        const user = await User.findById(userData._id);
        if(!user ){
            return res.status(404).json({success:false , message:"User not found"});
        }

        let cart = await Cart.findOne({ userId: userData._id }).populate({
            path: "items.productId",
            select: "productName salePrice regularPrice quantity status",
            populate: [
                { path: "brand" },
                { path: "category" },
            ],
        }).populate('appliedCoupon'); 

            cart.items = cart.items.filter(item => !item.discontinuedAt);

            if(!cart || cart.items.length === 0 ){
                return res.status(400).json({success:false , message:"Cart is empty"});
            }

            const appliedCouponId = cart.appliedCoupon;
            const couponDiscount = cart.couponDiscount;

            for(let item  of cart.items){
                const product = await Product.findById(item.productId._id);
                if(!product){
                    return res.status(400).json({success:false,message:"products in your cart are no longer available"})
                }
                if (product.quantity < item.quantity) {
                    return res.status(400).json({
                        success: false,
                        message: `Insufficient stock for ${product.productName}. Only ${product.quantity} units available.`,
                    });
                }

                const status = await determineStatus(product._id);
                product.status = status;
                await product.save();

                if(status === "Discontinued" ){
                    return res.status(400).json({success:false,message:`${product.productName} is discontinued and cannot be ordered`})  
                }

                product.quantity -= item.quantity;
                await product.save();
            }
            const userAddresses = await Address.findOne({ userId: userData._id });
            if (!userAddresses) {
                return res.status(404).json({ success: false, message: "No addresses found for this user" });
            }

            const selectedAddress = userAddresses.addresses.find(addr => {
                return addr._id.toString() === addressId;
            });

            if (!selectedAddress) {
                return res.status(404).json({ success: false, message: "Selected address not found" });
            };

            if(paymentMethod === "Wallet"){
                const wallet = await Wallet.findOne({userId:userData._id});
                const walletBalance = wallet ? wallet.balance : 0 ;

                if(walletBalance < cart.totalAmount ){
                    return res.status(404).json({ success: false, message: "Insufficient wallet balance to complete the order" });
                }

                wallet.balance -= cart.totalAmount;
                wallet.transactions.push({
                    amount:-cart.totalAmount,
                    type:"Debit",
                    method:"OrderPayment",
                    status:"Completed",
                    description:`Payment for order ${uuidv4()}`,
                    date:Date.now()
                });
                wallet.lastUpdated = Date.now();
                await wallet.save();

                paymentStatus = "Paid";
            }else if (paymentMethod === "Online"){
                if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
                    return res.status(400).json({ success: false, message: "Razorpay payment details are required" });
                };

                const generatedSignature = crypto
                    .createHmac('sha256',process.env.RAZORPAY_KEY_SECRET)
                    .update(razorpay_order_id + '|' + razorpay_payment_id)
                    .digest('hex');

                    paymentStatus = generatedSignature === razorpay_signature ? "Paid" : "Failed";

                    if (paymentStatus === "Failed") {
                        return res.status(400).json({ success: false, message: "Payment verification failed" });
                    }
            }else if (paymentMethod === "COD") {
                paymentStatus = "Pending";
            };
            
            const orderedItems = cart.items.map(item => ({
                product:item.productId._id,
                quantity:item.quantity,
                price:item.productId.regularPrice
            }));

            let address = {
                addressType: selectedAddress.addressType,
                name: selectedAddress.name,
                addressLine: selectedAddress.addressLine,
                city: selectedAddress.city,
                landmark: selectedAddress.landmark,
                state: selectedAddress.state,
                pincode: selectedAddress.pincode,
                phone: selectedAddress.phone,
                altPhone: selectedAddress.altPhone,
                isDefault: selectedAddress.isDefault,
            };

            const newOrder = new Order({
                userId:user._id,
                orderId:uuidv4(),
                orderedItems,
                totalPrice:cart.subtotal,
                discount:cart.discount,
                tax:cart.tax,
                shipping:cart.shipping,
                couponDiscount : couponDiscount,
                finalAmount:cart.totalAmount,
                address,
                paymentMethod,
                invoiceDate:Date.now(),
                status:paymentStatus === "Paid" ? "Processing" : "Pending",
                paymentStatus,
                appliedCoupon : appliedCouponId,
                couponApplied: appliedCouponId ? true : false,
                razorpay_payment_id: paymentMethod === 'Online' ? razorpay_payment_id : undefined,
                razorpay_order_id: paymentMethod === 'Online' ? razorpay_order_id : undefined,
            })

            await newOrder.save();

            // Clear the cart
            await Cart.findOneAndUpdate(
                { userId: userData._id },
                { $set: { items: [], subtotal: 0, discount: 0, tax: 0, shipping: 0,couponDiscount : 0, totalAmount: 0 ,appliedCoupon: null } }
            );

            req.session.orderId = newOrder.orderId

            return res.status(200).json({
                success:true,
                message:"Order placed Successfully",
                orderId:newOrder.orderId
            })

    } catch (error) {
        console.error("Error placing order:", error);
        return res.status(500).json({success: false,message: "Server error: " + error.message});
    }
};

const createRazorpayOrder = async (req, res) => {
    try {
        console.log('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID); 
        console.log('RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET); 
        const { amount } = req.body;
        console.log('Received Amount:', amount);
        const options = {
            amount: amount * 100, 
            currency: 'INR',
            receipt: `order_rcptid_${Date.now()}`
        };
        const order = await razorpay.orders.create(options);
        res.json({ success: true, order });
    } catch (error) {
        console.error('Error creating Razorpay order:', error);
        res.status(500).json({ success: false, message: 'Error creating order' });
    }
};


module.exports = {
    addToCart,
    getCartPage,
    applyCoupon,
    updateCart,
    removeFromCart,
    proceedToCheckout, 
    getCheckoutpage,
    placeOrder,
    createRazorpayOrder,
    getWishlistPage,
    addToWishlist,
    removeFromWishlist
};
 