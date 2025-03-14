const User = require("../model/userSchema.js");

const adminAuth = async (req, res, next) => {
    if(! req.session.adminId){
        return res.redirect("/admin/login");
    }

    try {
        const admin = await User.findOne({_id:req.session.adminId});
    
        if(!admin?.isAdmin){
            console.log("not admin found ");
            req.session.destroy();
            return res.redirect("/admin/login");
           
        }

        next();

    } catch (error) {
        console.error("Auth middleware error:", error);
        req.session.destroy();
        return res.redirect("/admin/login");
        
    } 
}


module.exports = {
    adminAuth
}