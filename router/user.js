const express = require("express");
const router = express.Router();
const userController = require("../controller/user/userController");
const { checkBlockedStatus , checkSignupSession } = require('../middleware/userAuthMiddleware.js');
const productsController = require("../controller/user/procutsController");
const passport = require("passport");


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

//home 
router.use(checkBlockedStatus);
router.get("/home",productsController.loadHome);
// products-page
router.get("/products", productsController.getProducts);
router.get('/product/:id', productsController.getProductDetails);
// Add to Cart
router.post('/cart/add', productsController.addToCart);



// error-page 
router.get("/error-404",userController.pageNotFound);


// Google OAuth routes
router.get("/auth/google", passport.authenticate("google", {
    scope: ["profile", "email"]
 }));
 
 router.get("/auth/google/callback", 
    passport.authenticate("google", {
        failureRedirect: "/user/signup",
        failureFlash: true
    }),
    (req, res) => {
 
       req.session.user = req.user._id;
        res.redirect("/user/home");
    }
 );

 const User  = require("../model/userSchema.js")

router.get("/",async (req,res) => {
    try {

        const userId = req.session.user;

       
        const currentUser  = await  User.findById({_id:userId ,isAdmin:false})

        if(! currentUser) {
            console.log("no user  found ");
            
        }
        else {
            console.log("current User :",currentUser.username);
        }

        res.render("user/home");
    } catch (error) {

        res.send("an erorr found ")
        
    }
})




module.exports = router;

