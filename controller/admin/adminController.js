const User = require("../../model/userSchema");
const bcrypt =  require("bcrypt")

const loadLoagin = async (req , res) =>{
    try {
        if(req.session.adminId){
          return  res.redirect("/admin/dashboard")
        }
        res.render("admin/login");
        
    } catch (error) {
        console.log("an error while displaying login page");
        res.send("an error while displaying login page");
    }
}

const login = async (req , res) => {
    try {
        const {email , password} = req.body;

        const admin = await User.findOne({email, isAdmin:true});
        
        if(!admin) {
            return res.status(400).json({
                success: false,
                message: "No user found with this email Id"
            });
        } 

        const passwordMatch = await bcrypt.compare(password, admin.password);
        if(!passwordMatch) {
            return res.status(400).json({
                success: false,
                message: "Invalid credentials"
            });   
        }

        
        req.session.adminId = admin._id;
        // req.session.admin = true;
        res.setHeader('Cache-Control', 'no-store');

        //success 
        return res.status(200).json({
            success: true,
            message: "Login successful",
            redirectUrl: "/admin/dashboard"
          });


    } catch (error) {
        console.error("Login error:", error);
        return res.status(500).json({
          success: false,
          message: "An error occurred during login"
        });
        
    }
}


const logout = async (req, res)=>{
    try {
        req.session.destroy(err => {
            if(err){
                console.log("Logout error:",err.message);
                return res.redirect("/admin/pageError");
            }

            return res.redirect("/admin/login");
        })
    } catch (error) {

        console.log("Logout error :",error);
        res.redirect("/admin/pageError"); 
    }
}

const loadDashboard = async (req, res ) => {

    try {
        res.setHeader('Cache-Control', 'no-store');
        res.render("admin/dashboard");
    } catch (error) {
        console.error("Dashboard error:", error);
        res.status(500).send("An error occurred loading the dashboard");
    }
}

const pageError = async (req, res ,next)=>{
    try {
        res.setHeader('Cache-Control', 'no-store');
        res.render("admin/pageError");
    } catch (error) {

        res.status(500).send("An Error found while loading error page");
    }
}



module.exports = {
    loadLoagin,
    login,
    logout,
    loadDashboard,
    pageError
    
}