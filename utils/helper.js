const validator = require("validator");


function validateUser(req) {
    const {username, email, password} = req.body;
    
    if(!validator.isAlphanumeric(username)) {
        return "Please enter a valid Username";
    }
    
    if(!validator.isEmail(email)) {
        return "Please enter a valid Email";
    }
    
    if(!validator.isStrongPassword(password)) {
        return "Please enter a strong password";
    }
    
    return null; 
}

//otp generating 
function genarateOtp(){
  return  Math.floor(100000 + Math.random() * 900000).toString();
} 





module.exports = {
    validateUser,
    genarateOtp
}