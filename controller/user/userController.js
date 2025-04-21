const User = require("../../model/userSchema");
const bcrypt = require("bcrypt");
const { validateUser ,sendVerificationEmail, genarateOtp }  = require("../../utils/helper.js");
const Product = require("../../model/productSchema.js")
const Review = require("../../model/reviewSchema .js");
const Wallet = require("../../model/walletSchema.js");
const {sendForgotOtp, sendSignupOtp} = require("../../utils/userEmails.js")

const loadLoagin = async (req , res) =>{
    try {
        if(!req.session.user){
            return res.render("user/signin");
        }
        res.redirect("/user/home");
        
    } catch (error) {
        console.log("an error found while loading login:",error);
        res.redirect("/user/pageNotFound");   
    }
}

const login = async (req , res) => {
    try {
        const {email , password} = req.body;
        const user = await User.findOne({email, isAdmin:false});
        if(!user) {
            return res.status(400).json({
                success: false,
                message: "Invalid credentials"
              });
        } 

        const isGoogleUser = user.googleId ? true : false;

        if (!isGoogleUser && !password) {
            return res.status(400).json({
                success: false,message: "Password is required"
            });
        }

        if (!isGoogleUser) {
            const passwordMatch = await bcrypt.compare(password, user.password);
            
            if(!passwordMatch) {
                return res.status(400).json({
                    success: false,
                    message: "Invalid credentials"
                });   
            }
        } 

        req.session.user = user._id;
        res.setHeader('Cache-Control', 'no-store',);

        //success 
        return res.status(200).json({
            success: true,
            message: "Login successful",
            redirectUrl: "/user/home"
          });

        
    } catch (error) {

        console.error("Login error:", error);
        return res.status(500).json({
          success: false,
          message: "An error occurred during login"
        });
    }
    
}

const loadSignup = async (req,res) =>{
    try {
       return res.render("user/signup");
    } catch (error) {
        console.log("Signup page is not loading..:",error);
        res.status(500).send("Server Error");
    }
}

const signup = async(req,res) =>{
    try {
        
        const {username,email,password ,referralCode  } = req.body;
        const findUser = await User.findOne({email, isAdmin:false});

        if(findUser){
            console.log("user found with this email ")
            return res.status(400).json({
                success: false,
                message: "User already exists...Please Login"
            }); 
        }
        // validation  process
        const validationError =  validateUser(req);
        if(validationError){
            return res.status(400).json({
                success: false,
                message:validationError
            }); 
        }
         //  otp 
        const otp = genarateOtp();

        // send verification email 
        const emailSent = await sendSignupOtp(username, email,otp);
        if(!emailSent){
            return res.status(400).json({
                success:false,
                message:"Failed to send email ",
                
            })
        }

        // Store OTP and user data in session
        req.session.userOtp = otp;
        req.session.userData = {
            username,email,password,
            referralCode : referralCode || null
        };

        
        console.log("Otp generated:",otp);
        return res.status(200).json({
            success: true,
            message: "Signup successful",
            redirectUrl: "/user/verify-otp"
        });
        
    } catch (error) {
        console.error("Signup  error",error);
        res.status(500).json({
            success:false,
            message:"Something Went Wrong!",
        })  
    }
}

const loadVerifyOtp = async (req,res)=> {
    try{
        res.render("user/verify-otp");
    }
    catch(err){
        console.log("an error fond in otp verification!! ")
        res.status(500).send("erorr fond");
    }
}

const verifyOTP = async(req, res)=>{

    try {
        const {otp } = req.body;

        if(!otp || !req.session.userOtp){
            return res.status(400).json({ success:false,message:"OTP is required!"})
        }
        console.log("session stored OTP:",req.session.userOtp);
        if(otp !== req.session.userOtp ){
            return res.status(400).json({success:false,message:"Invalid OTP, Please try again"})
        }

        let user = req.session.userData;

        const harshPassword = await bcrypt.hash(user.password,10);
        if (!harshPassword) {
            return res.status(500).json({ success: false, message: "An error occurred while processing password!" });
        }
        const newUser = new User({
            username:user.username,
            email:user.email,
            password:harshPassword
        });

        let referrer = null;

        if (user.referralCode) {
            referrer = await User.findOne({ referralCode: user.referralCode });
            if (referrer) {
                referrer.referredBy = referrer._id;
            }
        }

        await newUser.save();

        const updateTasks = [];

        if(referrer){
            const referrerWallet = Wallet.findOneAndUpdate(
                {userId : referrer._id},
                {
                    $inc: {balance : 200},
                    $push:{
                        transactions:{
                            amount: 200,
                            type:"Credit",
                            method: "Referral",
                            status: "Completed",
                            description: `Referral reward for ${newUser.username}`,
                        },
                    },
                    $setOnInsert :{
                        userId : referrer._id,
                    },
                },
                {
                    upsert: true,
                    new: true,
                }
            );

            const newUserWallet = Wallet.findOneAndUpdate(
                { userId: newUser._id },
                {
                    $inc: { balance: 100 },
                    $push: {
                        transactions: {
                            amount: 100,
                            type: "Credit",
                            method: "Referral",
                            status: "Completed",
                            description: "Welcome reward for using referral code",
                            createdAt: new Date()
                        }
                    },
                    $setOnInsert: {
                        userId: newUser._id
                    }
                },
                { upsert: true, new: true }
            );

            const referrerRedeemed = User.findByIdAndUpdate(
                referrer._id,
                { $push: { redeemedUsers: newUser._id } }
            );

            updateTasks.push(referrerWallet, newUserWallet, referrerRedeemed);
        }

        if (updateTasks.length > 0) {
            await Promise.all(updateTasks);
        }
 
        req.session.user = newUser._id;
        res.setHeader('Cache-Control', 'no-store',);

        delete req.session.userOtp;
        delete req.session.userData;

        console.log("User created Successfully!!")
        return  res.json({
            success:true,
            message:"Account created Successfully!!!",
            redirectUrl:"/user/home"
        });
       

    } catch (error) {
        console.log("Error Verifying OTP :",error);
        return res.status(500).json({
            success:false,
            message:"An Error occured while processing otp"
        });  
    }
}

const resendOtp = async (req, res)=>{
    try {
        
        const { email, username } = req.session.userData;
        if(!email){
            res.status(500).json({
                success:false,
                message:"Email not found , pls try again!"
            });
        } 

        let otp  = genarateOtp();
        req.session.userOtp = otp ;

        const emailSent  = await sendSignupOtp(username , email, otp);
        if(! emailSent){
            return res.status(500).json({
                success: false,
                message: "Failed to send email, please try again later"
            });
        }

        console.log("Resend otp:",otp);
        return res.status(200).json({
            success: true,
            message: "OTP resent successfully"
        });
    } catch (error) {
        console.log("Error resending OTP:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error. Please try again..."
        }); 
    }
}

const logout = async (req, res)=>{
    try {
        req.session.destroy(err => {
            if(err){
                console.log("Session destruction error:",err.message);
                return res.status(500).redirect("/user/pageNotFound");
            }

            return res.redirect("/user/home");
        })
    } catch (error) {

        console.log("Logout error :",error);
        res.redirect("/user/pageNotFound"); 
    }
}

const loadForgotPage = async (req,res) => {
    try {
        res.render("user/forgot");
        
    } catch (error) {
        console.log("forgot password page not loading:", error);
        res.status(500).send("Server Error");
        
    }
}

const forgotPassword = async (req , res) => {
    try {
        const {email} = req.body;
        const findUser = await User.findOne({email, isAdmin:false});

        if(!findUser){
            console.log("user not found with this email ")
            return res.status(400).json({
                success: false,
                message: "No User Found with this email ...Please signup to enjoy our shopping..."
            }); 
        } 
        //  otp 
        const otp = genarateOtp();
        const emailSent = await sendForgotOtp(findUser, otp);

        if(!emailSent){
            return res.status(400).json({
                success:false,
                message:"Failed to send email ",
                
            })
        }
        req.session.userOtp = otp;
        req.session.userData = {email};

        console.log("Otp generated:",otp);
        return res.status(200).json({
            success: true,
            message: "Email Sent successfully",
            redirectUrl: "/user/reset-otp"
        });
    } catch (error) {
        console.error("forgot-password error",error);
        res.status(500).json({
            success:false,
            message:"Something Went Wrong!",
        }) 
    }
}

const getResetOtpPage = async (req , res ) => {
    try {
        res.render("user/reset-otp")
        
    } catch (error) {
        res.status(500).send("Server error"); 
    }
}

const forgotOtp = async (req , res) =>{
    try {
        const {otp } = req.body;
        console.log(otp)

        if(!otp || !req.session.userOtp){
            return res.status(400).json({
                success:false,
                message:"OTP is required!",
            })
        }
        console.log("session stored OTP:",req.session.userOtp);

        if(otp === req.session.userOtp ){

            res.setHeader('Cache-Control', 'no-store',);
            return  res.json({
                success:true,
                message:"Account created Successfully!!!",
                redirectUrl:"/user/reset-password"
            });
        }else {
            res.status(400).json(({ 
                success:false,
                message:"Invalid OTP, Please try again"
            }))
        }

    } catch (error) {
        console.log("Error Verifying OTP :",error);
        res.status(500).json({
            success:false,
            message:"An Error occured while processing otp"
        });    
    }
}

const resendResetOtp = async (req , res) =>{
    try {

        if (!req.session.userData || !req.session.userData.email) {
            return res.status(400).json({
                success: false,
                message: "Session expired. Please start the forgot password process again."
            });
        }

        const { email} = req.session.userData;
        const findUser = await User.findOne({email, isAdmin:false});
        
        if (!findUser) {
            return res.status(404).json({
                success: false,
                message: "User not found with this email"
            });
        }

        //  otp 
        const otp = genarateOtp();
        const emailSent = await sendForgotOtp(findUser, otp);
        if(! emailSent){
            return res.status(500).json({
                success: false,
                message: "Failed to send email, please try again later"
            });
        }

        req.session.userOtp = otp;
        if(! emailSent){
            return res.status(500).json({
                success: false,
                message: "Failed to send email, please try again later"
            });
        }

        console.log("Resend otp:",otp);
        return res.status(200).json({
            success: true,
            message: "OTP resent successfully"
        });
    } catch (error) {
        console.log("Error resending OTP:", error);
        return res.status(500).json({
            success: false,
            message: "Internal server error. Please try again..."
        }); 
    }
}

const loadResetPassword = async (req, res) => {
    try {
        
        res.render("user/repassword");
    } catch (error) {
        console.log("Error loading reset password:", error);
        res.status(500).send("Server error");
    }
}

const ResetPassword = async (req , res) => {
    try {
        const {password} = req.body;
        const {email} =  req.session.userData;  

        if(!password ){
            return res.status(400).json({
                success:false,
                message:"Password is required..!",
            })
        }
        const hashPassword = await bcrypt.hash(password,10);
        if(! hashPassword){
            res.status(500).json({
                success:false,
                message:"An error found while processing!",
            })
        }

        const updateUser = await User.findOneAndUpdate(
            {email:email , isAdmin :false},
            {password:hashPassword},
            {new:true}
        );

        if(!updateUser ) {
            return res.status(404).json({
                success:false,
                message:"No user found!",
            })
        }

        req.session.user = updateUser._id;
        res.setHeader('Cache-Control', 'no-store');

        console.log("User Password reset successfully!!")
        return res.status(200).json({
            success: true,
            message: "Password reset successfully",
            redirectUrl: "/user/signin"
        });
       
        
    } catch (error) {

        console.error("Password reset error:", error);
        res.status(500).json({
            success: false,
            message: "Something went wrong!",
        });
        
    }
}

const pageNotFound = async (req,res)=> {
    try {
        res.render("user/pageNotFound");

    } catch (error) {
        res.status(500).send("an issue while loading");
        
    }
}


module.exports = {
    loadLoagin,
    login,
    loadSignup,
    signup,
    loadVerifyOtp,
    verifyOTP,
    resendOtp,
    logout,
    pageNotFound,
    loadForgotPage,
    forgotPassword,
    loadResetPassword,
    forgotOtp,
    ResetPassword,
    getResetOtpPage,
    resendResetOtp
}
