 const { sendUserStatusEmail } = require('../../utils/userEmails');
 const User = require("../../model/userSchema");
 const Wallet = require("../../model/walletSchema");

const customerInfo = async (req, res, next) =>{
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
        error.statusCode = 500; 
        next(error);
    }
};

const toggleUserStatus = async (req, res, next)=>{
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
        error.statusCode = 500; 
        next(error);
    }
};

const customerWalletInfo = async (req, res, next) => {
    try {
        const {userId} = req.params;
        const user = await User.findById(userId);
        if (!user) {
            return res.status(403).json({
                success:false, message: "User not found with this ID",
            });
        }
        
        const { search = '', type = 'All', filter = 'All', status = 'All', page = 1,} = req.query;
        const  limit = 5 
        
        // Find the wallet
        let wallet = await Wallet.findOne({userId: user._id});
        
        if (!wallet) {
            wallet = new Wallet({
                userId: user._id,
                balance: 0,
            });
            await wallet.save();
        }
        
        let filteredWallet = { ...wallet.toObject() };
        let transactions = wallet.transactions || [];
        let count = 0;

        if (transactions && transactions.length > 0) {
            if (search) {
                transactions = transactions.filter(t => 
                    t.transactionId.toLowerCase().includes(search.toLowerCase().trim())
                );
            }
            
            if (type !== 'All') {
                transactions = transactions.filter(t => t.type === type);
            } 
            
            if (filter !== 'All') {
                transactions = transactions.filter(t => t.method === filter);
            }
            
            if (status !== 'All') {
                transactions = transactions.filter(t => t.status === status);
            }
            
            count = transactions.length;
            
            transactions = transactions
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice((page - 1) * limit, page * limit);
        }

        filteredWallet.transactions = transactions;

        if (req.xhr || req.headers["x-requested-with"] === "XMLHttpRequest") {
            return res.status(200).json({ 
                success: true, 
                user,
                wallet: filteredWallet,
                page,
                limit,
                count
            });
        }

        res.render("admin/wallet", { 
            user,
            wallet: filteredWallet,
            page,
            limit,
            count,
            search,
            filter,
            status,
            type
        });

    } catch (error) {
        error.statusCode = 500; 
        next(error);
    }
};

module.exports = {
    customerInfo,
    toggleUserStatus,
    customerWalletInfo
}