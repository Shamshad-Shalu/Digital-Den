const User = require('../../model/userSchema');
const bcrypt = require('bcrypt');
const {validatePassword, validateEmail} = require("../../utils/validation");
const {genarateOtp} = require("../../utils/helper");
const {sendProfileUpdateOtp} = require("../../utils/userEmails");
const { uploadSingle}= require('../../middleware/userUpload'); 
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

const userUpload = uploadSingle('/uploads/user/profileimages', 'profileImage');

const updateProfile = async (req, res) => {
    try {
        console.log('Received updateProfile request:', req.body, req.file); // Debug log
        userUpload(req, res, async (err) => {
            if (err) {
                console.error('Multer error:', err); // Debug log
                return res.status(400).json({ success: false, message: err.message });
            }

            const { userData } = res.locals;
            const { firstName, lastName, username, phone, removePhoto } = req.body;

            console.log('User data:', userData); // Debug log
            console.log('Form data:', { firstName, lastName, username, phone, removePhoto }); // Debug log

            const user = await User.findById(userData._id);
            if (!user) {
                console.log('User not found'); // Debug log
                return res.status(403).json({ success: false, message: "User not found" });
            }

            const errors = {};
            if (!firstName) errors.firstName = "First name is required";
            if (!lastName) errors.lastName = "Last name is required";
            if (!username) errors.username = "Username is required";
            if (username && username !== user.username) {
                const existingUser = await User.findOne({ username, _id: { $ne: user._id } });
                if (existingUser) errors.username = "Username is already taken";
            }
            if (phone && !/^\d{10}$/.test(phone)) {
                errors.phone = "Phone number must be 10 digits";
            }

            if (Object.keys(errors).length > 0) {
                console.log('Validation errors:', errors); // Debug log
                return res.status(400).json({ success: false, errors });
            }

            // Handle profile image
            if (removePhoto === 'true' && user.cardImage) {
                const oldImagePath = path.join(__dirname, '../public', user.cardImage);
                if (fs.existsSync(oldImagePath)) {
                    fs.unlinkSync(oldImagePath);
                    console.log('Old image deleted:', oldImagePath); // Debug log
                }
                user.cardImage = null;
            } else if (req.file) {
                if (user.cardImage) {
                    const oldImagePath = path.join(__dirname, '../public', user.cardImage);
                    if (fs.existsSync(oldImagePath)) {
                        fs.unlinkSync(oldImagePath);
                        console.log('Old image deleted:', oldImagePath); // Debug log
                    }
                }
                user.cardImage = `/uploads/user/profileimages/${req.file.filename}`;
                console.log('New image uploaded:', user.cardImage); // Debug log
            }

            user.firstName = firstName;
            user.lastName = lastName;
            user.username = username;

            if (phone && phone !== user.phone) {
                const otp = genarateOtp();
                req.session.phoneOtp = String(otp); // Ensure OTP is stored as a string
                req.session.tempPhone = phone;
                console.log('Generated OTP:', otp, 'Stored in session:', req.session.phoneOtp); // Debug log

                const emailSent = await sendProfileUpdateOtp(user.username, user.email, otp);
                if (!emailSent) {
                    console.log('Failed to send OTP'); // Debug log
                    return res.status(500).json({
                        success: false,
                        message: 'Failed to send OTP. Please try again later.'
                    });
                }

                await user.save();
                console.log('OTP sent, user saved:', user); // Debug log
                return res.status(200).json({ success: true, message: "OTP sent to email for phone verification" });
            }

            user.phone = phone || null;
            await user.save();
            console.log('Profile updated successfully:', user); // Debug log

            return res.status(200).json({ success: true, message: "Profile updated successfully" });
        });
    } catch (error) {
        console.error('Profile update error:', error);
        return res.status(500).json({ success: false, message: 'Server error occurred' });
    }
};

const verifyPhoneOtp = async (req, res) => {
    try {
        console.log('Received verifyPhoneOtp request:', req.body); // Debug log
        const { userData } = res.locals;
        const { phoneOtp } = req.body;

        const user = await User.findById(userData._id);
        if (!user) {
            console.log('User not found'); // Debug log
            return res.status(403).json({ success: false, message: "User not found" });
        }

        const errors = {};
        if (!phoneOtp) {
            errors.phoneOtp = "Please enter OTP";
        } else if (phoneOtp.length !== 6) {
            errors.phoneOtp = "OTP must be 6 digits";
        } else if (String(phoneOtp) !== req.session.phoneOtp) { // Ensure comparison as strings
            console.log('OTP comparison failed:', { entered: phoneOtp, stored: req.session.phoneOtp }); // Debug log
            errors.phoneOtp = "Invalid OTP";
        }

        if (Object.keys(errors).length > 0) {
            console.log('Validation errors:', errors); // Debug log
            return res.status(400).json({ success: false, errors });
        }

        user.phone = req.session.tempPhone;
        delete req.session.phoneOtp;
        delete req.session.tempPhone;
        await user.save();
        console.log('Phone number updated:', user); // Debug log

        return res.status(200).json({ success: true, message: "Phone number updated successfully" });
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