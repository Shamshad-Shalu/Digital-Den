const express = require("express");
const router = express.Router();
const userController = require("../controller/user/userController");
const productsController = require("../controller/user/procutsController");
const cartController = require("../controller/user/cartController.js");
const addressController = require("../controller/user/addressController.js");
const orderController = require("../controller/user/orderController.js");
const profileController = require("../controller/user/profileController.js")
const { checkBlockedStatus ,checkSignupSession,
      checkUserLoggedIn} = require('../middleware/userAuthMiddleware.js');
const passport = require("passport");
const { createUpload, uploadSingle } = require('../middleware/userUpload.js'); // Import the refactored Multer middleware

// Configure Multer for user profile images (single file upload)
const userUpload = uploadSingle('/uploads/user/profileimages', 'profileImage');

// user router 
router.get("/signin",userController.loadLoagin);
router.post("/signin",userController.login);
router.get("/signup",userController.loadSignup );
router.post("/signup",userController.signup);
router.get("/verify-otp",userController.loadVerifyOtp);
router.post("/verify-otp" ,checkSignupSession, userController.verifyOTP);
router.post("/resend-otp", checkSignupSession ,userController.resendOtp);
router.get("/logout",userController.logout);
router.get("/Forgot-Password",userController.loadForgotPage);
router.post("/Forgot-Password",userController.forgotPassword);
router.get("/reset-otp",userController.getResetOtpPage);
router.post("/resend-fOtp",userController.resendResetOtp)
router.post("/reset-otp",userController.forgotOtp);
router.get("/reset-password",userController.loadResetPassword);
router.patch("/reset-password",userController.ResetPassword);


// Google OAuth routes
router.get("/auth/google", passport.authenticate("google", {
    scope: ["profile", "email"]
}));
 
router.get("/auth/google/callback", 
    passport.authenticate("google", {
        failureRedirect: "/user/signin",
        failureFlash: true
    }),
    (req, res) => {
       req.session.user = req.user._id;
        res.redirect("/user/home");
    }
);

//home 
router.use(checkBlockedStatus);
router.get("/home",productsController.loadHome);
// products-page
router.get("/products", productsController.getProducts);
router.get('/product/:id', productsController.getProductDetails);
router.use(checkUserLoggedIn)


// wishlist 
router.get("/wishlist",cartController.getWishlistPage);
router.post("/wishlist/add",cartController.addToWishlist);
router.post('/wishlist/remove', cartController.removeFromWishlist);


// Cart
router.get("/cart" ,cartController.getCartPage);
router.post('/cart/add', cartController.addToCart);
router.post("/cart/update",cartController.updateCart);
router.post("/cart/remove",cartController.removeFromCart)

// error-page 
router.get("/error-404",userController.pageNotFound);

// checkout-section
router.get("/checkout",cartController.getCheckoutpage);
router.post("/checkout",cartController. proceedToCheckout);
router.post('/create-razorpay-order', cartController.createRazorpayOrder);
// order- section 
router.post("/order/place",cartController.placeOrder);
router.get("/order-success",orderController.getorderSuccessPage);
router.get("/orders",orderController.getOrders);
router.get('/order/track/:orderId', orderController.trackOrder);
router.post('/order/cancel/:orderId', orderController.cancelOrder);
router.post('/order/return/:orderId', orderController.returnOrder);
router.post('/order/return-item/:orderId/:itemId', orderController.returnItem);
 





router.use(checkUserLoggedIn);
//address -section
router.get("/address",addressController.loadAddresspage);
router.post("/address/add",addressController.addAddress);
router.patch("/address/edit/:id", addressController.editAddress);
router.delete("/address/delete/:id", addressController.deleteAddress);


// profile -section 
router.get('/profile', profileController.getUserProfile);
router.get('/edit-profile', profileController.getEditProfile);
router.post('/change-password', profileController.changePassword);
router.post("/add-password",profileController.addPassword);
router.post('/change-email', profileController.changeEmail);
router.post('/verify-email-otp', profileController.verifyEmailOtp);
router.post('/update-profile', profileController.updateProfile); 
router.post('/verify-phone-otp', profileController.verifyPhoneOtp);









module.exports = router;

