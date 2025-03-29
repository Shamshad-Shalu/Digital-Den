 const { sendUserStatusEmail } = require('../../utils/userEmails');
 const User = require("../../model/userSchema");

const customerInfo = async (req, res) =>{
    try {

        let search = req.query.search || "";
        let status = req.query.status || "All";
        let page = parseInt(req.query.page) || 1;
        const limit = 5 ;

        let user = {isAdmin:false};

        search = search.trim();
        if(search) {
            user.$or = [
                { username: { $regex: search, $options: 'i' } },
                { email: { $regex: search, $options: 'i' } },
            ];
        }

        if(status !== "All"){
            user.isBlocked = status === 'Blocked';
        }

        const userData = await User.find(user)
              .sort({ createdAt: -1 })
              .limit(limit)
              .skip((page - 1) * limit)
              .exec();
        
        const count = await User.countDocuments(user);

        res.render("admin/customers",{
            userData,
            page,
            limit,
            count,
            search,
            status 
        });

    } catch (error) {
        console.log('Error in customerInfo:', error);
        res.status(500).render('error', { message: 'Error fetching user data' });
    }
}

const toggleUserStatus = async (req, res )=>{
    try {

        const userId = req.params.id;
        const user = await User.findById(userId);

        if(!user) {
            return res.status(404).json({success:false , message:"User not found" })
        }

        // Toggle the isBlocked status
        user.isBlocked = !user.isBlocked;
        await user.save();

        //sending status email 
        const emailSent = await sendUserStatusEmail(user);

        if(req.xhr) {
            return res.json({
                success: true,
                isBlocked: user.isBlocked,
                emailSent,
                message: `User status updated${emailSent ? ' and email sent' : ', but email failed'}`,
            })
        }
        res.redirect("/admin/customers");

    } catch (error) {
        
        console.error('Error in toggleUserStatus:', error);
        if (req.xhr) {
            return res.status(500).json({ success: false, message: 'Error updating user status' });
        }
        res.status(500).render('error', { message: 'Server error' });
    }
}

module.exports = {
    customerInfo,
    toggleUserStatus
}