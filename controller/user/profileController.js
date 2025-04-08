const User = require('../../model/userSchema');
const bcrypt = require('bcrypt');
const {validatePassword, validateEmail ,validateUserProfile} = require("../../utils/validation");
const {genarateOtp} = require("../../utils/helper");
const {sendProfileUpdateOtp} = require("../../utils/userEmails");
const fs = require('fs');
const path = require('path');


const getUserProfile = async (req, res) => {
    try {
       const user = res.locals.userData;   

        res.render('user/profile', { user ,  });
    } catch (error) {
        console.error('Error fetching profile:', error);
        res.status(500).render('error', { message: 'Server error' });
    }
};


const getEditProfile = async (req, res) => {
    try {
        const user = res.locals.userData;
        const formData = req.session.formData || {};
        delete req.session.formData; 
        res.render('user/edit-profile', { user, errors: {}, otpSent: false, phoneOtpSent: false, formData });
    } catch (error) {
        console.error('Error fetching edit profile:', error);
        res.status(500).render('error', { message: 'Server error' });
    }
};


const addPassword = async (req , res ) => {
    try {

        const user = await User.findById(res.locals.userData);
        if (!user) {
            return res.status(403).json({
                message: "User not found with this ID",redirectUrl: '/user/login'
            });
        }
        const data = {
            password : req.body.password,
            cPassword:req.body.cPassword
        }

        const errors = await  validatePassword(user, data, false);

        if (errors) {
            return res.status(400).json({ success: false, errors});
        }

        const hashPassword  = await bcrypt.hash(data.password , 10);

        if(!hashPassword){
            res.status(500).json({success:false , message:'an error found why harshing password , pls try again later .'})
        }

        user.password = hashPassword;
        await user.save();

       res.status(200).json({success:true , message: "Password added succesfully .." });
        
    } catch (error) {
        console.error('Error fetching edit profile:', error);
        res.status(500).json({message:"error while processing .."}); 
    }
};

const changePassword = async (req,res) => {
    try {

        const  {googleIdUser ,userData, isUserBlocked}  = res.locals;

        const data =  {
            currentPassword: req.body.currentPassword,
            password:req.body.password, 
            cPassword:req.body.cPassword 
        }

        const user = await User.findById(userData._id);
        if(!user) {
            return res.status(403).json({ message: "User not found with this ID",redirectUrl: '/user/login'});
        };

        const errors = await  validatePassword(user, data, true);
        if (errors) {
            return res.status(400).json({ success: false, errors});
        }

        const hashPassword  = await bcrypt.hash(data.password , 10);
        if(!hashPassword){
            res.status(500).json({success:false , message:'an error found why harshing password , pls try again later .'})
        }

        user.password = hashPassword;

        await user.save();
        res.json({success:true ,message:"success"})
        
    } catch (error) {
        console.error('Error fetching edit profile:', error);
        res.status(500).json({message:" Error while processing password"});   
    }
}

const changeEmail = async (req , res) => {
    try {
        const {userData} = res.locals;
        const {password , email } = req.body ;
        console.log(password , email)

        const user = await User.findById(userData._id);
        if(!user) {
            return res.status(403).json({ message: "User not found with this ID"});
        };

        let errors = await validateEmail(user,{password ,email});
        if (errors) {
            return res.status(400).json({ success: false, errors});
        }

        const otp = genarateOtp();

        req.session.otp = otp;
        req.session.email = email;
        await user.save();
        console.log("otp:",otp)

        const emailSent = await sendProfileUpdateOtp(user.username ,email,otp);
        if (!emailSent) {
            return res.status(500).json({success: false,
                message: 'Failed to send OTP. Please try again later.'
            });
        };

        console.log("email sent successfully ")
        res.status(200).json({success:true, message:"OTP sent to new email. Please verify "});

    } catch (error) {
        console.error('Change email error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Server error occurred'
        });
    }
}

const verifyEmailOtp = async (req , res) => {
    try {
        const {userData} = res.locals;
        const {otp } = req.body ;

        console.log("otp :",otp)
        const user = await User.findById(userData._id);
        if(!user) {
            return res.status(403).json({ message: "User not found"});
        };
        
        const errors = {};
        if (!otp) {
            errors.otp = "Please enter OTP";
        } else if (otp.length !== 6) {
            errors.otp = "OTP must be 6 digits";
        } else if (otp !== req.session.otp) {
            errors.otp = "Invalid OTP";
        }

        if (Object.keys(errors).length > 0) {
            return res.status(400).json({ success: false, errors });
        }

        console.log("otp is verified ")

        user.email = req.session.email;

        // Clear session temp data
        delete req.session.email;
        delete req.session.otp;
        await user.save();

        return res.status(200).json({ 
            success: true, 
            message: "Email updated successfully"
        });

    } catch (error) {
        console.error('OTP verification error:', error);
        return res.status(500).json({ 
            success: false, 
            message: 'Server error occurred'
        });
    }
}


const updateProfile = async (req, res) => {
    try {
        const user = await User.findById(res.locals.userData._id); 
        if (!user) {
            return res.status(403).json({ success: false, message: 'User not found' });
        }
        const { firstName, lastName, username, phone, removePhoto } = req.body;
      
        const updateData = {
            firstName,
            lastName,
            username,
            phone
        };
      
        // profile image
        if (req.file) {
            if (user.profileImage) {
                const oldImagePath = path.join(__dirname, '../public/uploads/user/profileimages', user.profileImage);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
            updateData.profileImage = req.file.filename;
        } else if (removePhoto === 'true') {
            if (user.profileImage) {
                const oldImagePath = path.join(__dirname, '../public/uploads/user/profileimages', user.profileImage);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                }
            }
            updateData.profileImage = null;
        }
  
        const errors = await validateUserProfile(updateData); 
        if (errors) {
            return res.status(400).json({ success: false, errors });
            console.log(errors);
        }

        delete updateData.phone;
        Object.assign(user, updateData);
  
        //  phone verification 
        if (phone && phone !== user.phone) {

            const otp = genarateOtp();
            
            // Math.floor(100000 + Math.random() * 900000).toString();
            
            // Store OTP and phone in session
            req.session.phoneOtp = otp;
            req.session.tempPhone = phone;

            console.log('Generated OTP:', otp, 'for phone:', phone); 
            //mail
            const emailSent = await sendProfileUpdateOtp(user.username, user.email, otp);
            if (!emailSent) {
                return res.status(500).json({
                    success: false,
                    message: 'Failed to send OTP. Please try again later.',
                });
            }

            await user.save();
            return res.status(200).json({ 
                success: true, 
                message: 'OTP sent to email for phone verification',
                requireOtp: true
            });
        }

        await user.save();
        return res.status(200).json({ success: true, message: 'Profile updated successfully' });
    } catch (error) {
        console.error('Profile update error:', error);
        return res.status(500).json({ success: false, message: 'Server error occurred' });
    }
};


const verifyPhoneOtp = async (req, res) => {
    try {
        const { userData } = res.locals;
        const { phoneOtp } = req.body;

        const user = await User.findById(userData._id);
        if (!user) {
            return res.status(403).json({ success: false, message: 'User not found' });
        }
  
        // Validate otp
        const errors = {};
        if (!phoneOtp) {
            errors.phoneOtp = 'Please enter OTP';
        } else if (!req.session.phoneOtp) {
            errors.phoneOtp = 'OTP session expired. Please request a new OTP';
        } else if (phoneOtp !== req.session.phoneOtp) {
            errors.phoneOtp = 'Invalid OTP';
        }
  
        if (Object.keys(errors).length > 0) {
            return res.status(400).json({ success: false, errors });
        }
  
        // Update phone and save
        user.phone = req.session.tempPhone;
        
        // clear session data
        delete req.session.phoneOtp;
        delete req.session.tempPhone;
        
        await user.save();
   
        return res.status(200).json({ 
            success: true, 
            message: 'Phone number updated successfully'
        });
    } catch (error) {
        console.error('Phone OTP verification error:', error);
        return res.status(500).json({ success: false, message: 'Server error occurred' });
    }
};


module.exports = { 
    getUserProfile, 
    getEditProfile,
    changePassword,
    addPassword,
    changeEmail,
    verifyEmailOtp,
    updateProfile,
    verifyPhoneOtp

};