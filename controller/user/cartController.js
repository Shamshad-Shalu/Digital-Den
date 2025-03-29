const Cart = require("../../model/cartSchema");
const Product = require("../../model/productSchema");
const { determineStatus } = require("../../utils/helper");
const User = require("../../model/userSchema");
const Address = require("../../model/addressModel");
const Order  = require("../../model/orderSchema");
const Wishlist = require("../../model/wishlistSchema"); 
const {State} = require("country-state-city");
const mongoose = require("mongoose");
const {v4:uuidv4} = require("uuid");
require('dotenv').config();
const Razorpay = require('razorpay');

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});



const getWishlistPage = async (req , res) => {
 
    try {
        const { isLoggedIn, userData } = res.locals;

        if (!isLoggedIn ) {
            return res.status(401).redirect("/user/home");
        }

        const wishlist = await Wishlist.findOne({ userId: userData._id })
            .populate({
                path: 'products.productId',
                populate: [
                    { path: "brand" },
                    { path: "category" }
                ]
            });

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

        // if (validProducts.length !== wishlist.products.length) {
            wishlist.products = validProducts;
            await wishlist.save();
            // console.log("Updated wishlist in DB with valid products:", wishlist);
        // }

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
}


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
 

async function calculateCartTotals(cart, product, quantity) {
    let subtotal = 0;
    let discount = 0;

    if (!cart?.items || cart.items.length === 0) {
        if (product && quantity) {
            const status = await determineStatus(product._id);
            if (status === 'Discontinued' || status === 'Out of stock') {
                return { subtotal: 0, discount: 0, tax: 0, shipping: 0, totalAmount: 0 };
            }

            subtotal = product.salePrice * quantity;
            discount = (product.regularPrice - product.salePrice) * quantity;
        }
    } else {
        const productIds = cart.items.map(item => item.productId);
        
        const products = await Product.find({ 
            _id: { $in: productIds },
            isListed: true
        }).populate('brand').populate('category');
        
        for (const item of cart.items) {
            if (item.discontinuedAt){
                continue;
            } 
            
            const itemProduct = products.find(p => 
                p._id.toString() === (typeof item.productId === 'object' ? 
                    item.productId._id.toString() : item.productId.toString())
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

           subtotal += item.totalPrice;
            discount += (itemProduct.regularPrice - itemProduct.salePrice) * item.quantity;
        }
        
        // Add new product if not in cart
        if (product && quantity) {
            const isNewProduct = !cart.items.some(item => 
                (typeof item.productId === 'object' ? 
                    item.productId._id.toString() : item.productId.toString()) === product._id.toString()
            );
            
            if (isNewProduct) {
                const status = await determineStatus(product._id);
                if (status !== 'Discontinued' && status !== 'Out of stock') {
                    subtotal += product.salePrice * quantity;
                    discount += (product.regularPrice - product.salePrice) * quantity;
                }
            }
        }
    }
    

    const tax = subtotal * 0.18; //18% tax 
    const shipping = !subtotal ? 0 : (subtotal > 500 ? 0 : 50); 
    const totalAmount = subtotal + tax + shipping;
    
    return { subtotal, discount, tax, shipping, totalAmount };
}

const addToCart = async (req ,res) => {

    const { isLoggedIn, userData, isUserBlocked } = res.locals;
    let { productId, quantity } = req.body;

    quantity = parseInt(quantity);

    if (!isLoggedIn) {
        return res.status(401).json({ success: false, message: "Please login..!" });
    }
    if (isUserBlocked) {
        return res.status(401).json({ success: false, message: "User is blocked and can't take actions..!" });
    }

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
        
        // Calculate total quantity after adding
        const totalQuantity = existingQuantity + quantity;
        
        // Validate against available stock and max quantity
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

            const totals =await calculateCartTotals(cart, product, quantity);
            cart.subtotal = totals.subtotal;
            cart.discount = totals.discount;
            cart.tax = totals.tax.toFixed(2);
            cart.shipping = totals.shipping;
            cart.totalAmount = totals.totalAmount;

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

const getCartPage = async (req, res) => {
    const { isLoggedIn, userData } = res.locals;

    if (!isLoggedIn ) {
        return res.status(401).redirect("/user/home");
    }
    
    try {
        const defaultCart = {
            items: [],
            subtotal: 0,
            discount: 0,
            tax: 0,
            shipping: 0,
            totalAmount: 0
        };

        // If user is not logged in, render empty cart
        if (!isLoggedIn || !userData) {
            return res.render('user/cart', { cart: defaultCart });
        }
        
        const cart = await Cart.findOne({ userId: userData._id })
            .populate({
                path: 'items.productId',
                populate: [
                    { path: "brand" },
                    { path: "category" }
                ]
            });

        if (!cart) {
            return res.render('user/cart', { cart: defaultCart });
        }

        for (let i = cart.items.length - 1; i >= 0; i--) {
            const item = cart.items[i];
            const product = item.productId;

            if (!product || !product._id) {
                cart.items.splice(i, 1); // Remove invalid items
                continue;
            }

            const status = await determineStatus(product._id);
            product.status = status;
            await product.save();

            if (status === 'Discontinued' || status === 'Out of stock') {
                item.discontinuedAt = item.discontinuedAt || new Date();
            } else {
                if (item.discontinuedAt) {
                    item.discontinuedAt = null;
                }
            }
        }

        const totals = await calculateCartTotals(cart);

        cart.subtotal = totals.subtotal;
        cart.discount = totals.discount;
        cart.tax = totals.tax.toFixed(2);
        cart.shipping = totals.shipping;
        cart.totalAmount = totals.totalAmount;

        await cart.save();

        // Prepare cart data for rendering
        const cartData = {
            items: cart.items.map(item => {
                const productData = item.productId;
                if (!productData || !productData._id) return null;
                
                return {
                    product: {
                        id: productData._id,
                        name: productData.productName ,
                        brand: productData.brand?.brandName ,
                        category: productData.category?.name,
                        salePrice: item.price,
                        regularPrice: productData.regularPrice,
                        status: productData.status,
                        quantity: productData.quantity,
                        cardImage: productData.cardImage,
                        rating: productData.rating
                    },
                    isDiscontinued: !!item.discontinuedAt,
                    quantity: item.quantity,
                    totalPrice: item.totalPrice
                };
            }).filter(Boolean), 
            subtotal: cart.subtotal,
            discount: cart.discount,
            tax: cart.tax,
            shipping: cart.shipping,
            totalAmount: cart.totalAmount
        };
    
        res.render("user/cart", { cart: cartData });
    
    } catch (error) {
        console.error("Error in getCartPage:", error);
        res.status(500).json({ 
            success: false, 
            message: "Failed to load cart page", 
            error: error.message 
        });
    }
};


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
            .populate('category');

        if (!product) {
            return res.status(404).json({ success: false, message: "Product not found" });
        }

        // // Check if product is available
        // if (!product.isListed || !product.brand.isListed || !product.category.isListed) {
        //     return res.status(400).json({ success: false, message: "Product is discontinued or unavailable" });
        // }

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

         // Recalculate cart totals
         const totals = await calculateCartTotals(cart);
        cart.subtotal = totals.subtotal;
        cart.discount = totals.discount;
        cart.tax = totals.tax.toFixed(2);
        cart.shipping = totals.shipping;
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
}

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
        const totals = await calculateCartTotals(cart);
        
        cart.subtotal = totals.subtotal;
        cart.discount = totals.discount;
        cart.tax = totals.tax.toFixed(2);
        cart.shipping = totals.shipping;
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

            // if (!product.isListed || product.status === "Out of stock" || product.quantity < item.quantity) {
            //     return res.status(400).json({ 
            //         success: false, 
            //         message: `${product.productName} is no longer available or has insufficient stock` 
            //     });
            // }

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
      // Fetch Indian states 
      const indianStates = State.getStatesOfCountry("IN");

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
        console.log(totalItems)
        const defaultAddress = addresses.some(addr => addr.isDefault);

        res.render("user/checkout",{
            checkoutData : {
                states: indianStates,
                addresses,
                defaultAddress,
                cartItems,
                razorpayKeyId: process.env.RAZORPAY_KEY_ID,
                summery:{
                    totalItems,
                    subtotal:cart.subtotal,
                    discount: cart.discount,
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

//         const { addressId, paymentMethod } = req.body;

//         if (!addressId || !paymentMethod) {
//             return res.status(400).json({ success: false, message: "Address and payment method are required" });
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

//         // Filter out discontinued items
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

//             const status = await determineStatus(product._id, product.isListed, product.quantity);
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
//             status: "Pending",
//             couponApplied: cart.discount > 0,
//         });

//         await newOrder.save();

//         // Clear the cart after placing the order
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

        // Verify Razorpay payment if the payment method is "Online"
        if (paymentMethod === 'Online') {
            if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
                return res.status(400).json({ success: false, message: "Razorpay payment details are required" });
            }

            // Verify Razorpay payment (recommended for security)
            const crypto = require('crypto');
            const generatedSignature = crypto
                .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
                .update(razorpay_order_id + '|' + razorpay_payment_id)
                .digest('hex');

            if (generatedSignature !== razorpay_signature) {
                return res.status(400).json({ success: false, message: "Payment verification failed" });
            }
        }

        const user = await User.findById(userData._id);

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        let cart = await Cart.findOne({ userId: userData._id }).populate({
            path: "items.productId",
            select: "productName salePrice regularPrice quantity status",
            populate: [
                { path: "brand" },
                { path: "category" },
            ],
        });

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({ success: false, message: "Cart is empty" });
        }

        // Filter out discontinued items
        cart.items = cart.items.filter((item) => !item.discontinuedAt);

        if (cart.items.length === 0) {
            return res.status(400).json({ success: false, message: "No valid items in cart to order" });
        }

        // Final status check and quantity update
        for (const item of cart.items) {
            const product = await Product.findById(item.productId._id);
            if (!product) {
                return res.status(400).json({
                    success: false,
                    message: "One or more products in your cart are no longer available",
                });
            }

            const status = await determineStatus(product._id);
            product.status = status;
            await product.save();

            if (status === "Discontinued") {
                return res.status(400).json({
                    success: false,
                    message: `${product.productName} is discontinued and cannot be ordered`,
                });
            }
            if (status === "Out of stock" || product.quantity < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `${product.productName} is out of stock or has insufficient stock`,
                });
            }

            // Update product quantity
            product.quantity -= item.quantity;
            await product.save();
        }

        const userAddresses = await Address.findOne({ userId: userData._id });
        if (!userAddresses) {
            return res.status(404).json({ success: false, message: "No addresses found for this user" });
        }

        const selectedAddress = userAddresses.addresses.find((addr) => {
            return addr._id.toString() === addressId;
        });

        if (!selectedAddress) {
            return res.status(404).json({ success: false, message: "Selected address not found" });
        }

        const orderedItems = cart.items.map((item) => ({
            product: item.productId._id,
            quantity: item.quantity,
            price: item.productId.salePrice,
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
            userId: user._id,
            orderId: uuidv4(),
            orderedItems,
            totalPrice: cart.subtotal,
            discount: cart.discount,
            tax: cart.tax,
            shipping: cart.shipping,
            finalAmount: cart.totalAmount,
            address: address,
            paymentMethod,
            invoiceDate: Date.now(),
            status: paymentMethod === 'Online' ? "Confirmed" : "Pending", // Set status to "Confirmed" for Online payments
            couponApplied: cart.discount > 0,
            razorpay_payment_id: paymentMethod === 'Online' ? razorpay_payment_id : undefined, // Store Razorpay payment ID
            razorpay_order_id: paymentMethod === 'Online' ? razorpay_order_id : undefined, // Store Razorpay order ID
        });

        await newOrder.save();

        // Clear the cart after placing the order
        await Cart.findOneAndUpdate(
            { userId: userData._id },
            { $set: { items: [], subtotal: 0, discount: 0, tax: 0, shipping: 0, totalAmount: 0 } }
        );

        req.session.orderId = newOrder.orderId;

        return res.status(200).json({
            success: true,
            message: "Order placed successfully",
            orderId: newOrder.orderId,
        });
    } catch (error) {
        console.error("Error placing order:", error);
        return res.status(500).json({
            success: false,
            message: "Server error: " + error.message,
        });
    }
};


const createRazorpayOrder = async (req, res) => {
    try {
        console.log('RAZORPAY_KEY_ID:', process.env.RAZORPAY_KEY_ID); // Add this line
        console.log('RAZORPAY_KEY_SECRET:', process.env.RAZORPAY_KEY_SECRET); // Add this line
        const { amount } = req.body;
        console.log('Received Amount:', amount);
        const options = {
            amount: amount * 100, // Convert to paise (e.g., ₹500 = 50000 paise)
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
 