const User = require("../../model/userSchema"); 
const Wallet = require("../../model/walletSchema");
const crypto = require("crypto");
const Razorpay = require('razorpay');
const {generateCustomId } = require("../../utils/helper");

const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET
});
    
const getWalletPage = async (req, res , next) => {
    try {
        const {userData, isLoggedIn } = res.locals;

        if (!isLoggedIn) {
            return res.status(401).json({ success: false, message: "Please login to view Wallet", redirectUrl:"/signin" });
        }
        
        const user = await User.findById(userData);
        if (!user) {
            return res.status(403).json({
                message: "User not found with this ID", redirectUrl: '/signin'
            });
        }
        
        const { search = '', type = 'All', filter = 'All', status = 'All', page = 1, limit = 5 } = req.query;
        
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

        res.render("wallet", { 
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

const addAmountWallet = async (req, res, next ) => {
    try {
        const { userData, isLoggedIn } = res.locals;
        const { amount } = req.body;

        if (!isLoggedIn) {
            return res.status(401).json({ 
                success: false, message: "Please login to add funds to your wallet", redirectUrl: "/signin" 
            });
        }
        let error = '';
        if (!amount) {
            error = "Please enter an amount";
        } else if (isNaN(amount) || amount <= 0) {
            error = "Please enter a valid positive number";
        } else if (amount < 100) {
            error = "Minimum amount is ₹100";
        } else if (amount % 100 !== 0) {
            error = "Amount must be in multiples of ₹100 (e.g., ₹100, ₹200, ₹300)";
        } else if (amount > 50000) {
            error = "Maximum amount is ₹50,000 per transaction";
        }

        if (error) {
            return res.status(400).json({ 
                success: false, 
                message: error 
            });
        }

        const user = await User.findById(userData);
        if (!user) {
            return res.status(403).json({
                success: false,message: "User not found with this ID",redirectUrl: '/signin'
            });
        }

        let wallet = await Wallet.findOne({ userId: user._id });
        if (!wallet) {
            wallet = new Wallet({
                userId: user._id,
                balance: 0,
            });
            await wallet.save();
        }

        const receiptId = "rcpt_" + Date.now();
        
        const orderOptions = {
            amount: amount * 100,
            currency: "INR", 
            receipt: receiptId,
            notes: {
                userId: user._id.toString(),
                email: user.email,
                purpose: "Wallet Recharge"
            }
        };

        const razorpayOrder = await razorpay.orders.create(orderOptions);
        
        const transactionId = generateCustomId("RZP");
        
        wallet.transactions.push({
            transactionId: transactionId,
            amount: amount,
            type: "Credit",
            method: "Razorpay",
            status: "Pending", 
            date: new Date(),
            description: `Amount ₹${amount} being added to wallet via Razorpay`
        });
        
        await wallet.save();

        return res.status(200).json({
            success: true,
            message: "Payment initiated",
            order: { 
                id: razorpayOrder.id,
                amount: razorpayOrder.amount / 100, 
                currency: razorpayOrder.currency,
                receipt: razorpayOrder.receipt
            },
            key_id: process.env.RAZORPAY_KEY_ID,
            transactionId: transactionId,
            user: {
                name: user.username || user.name,
                email: user.email,
                contact: user.phoneNumber || ""
            }
        });

    } catch (error) {
        error.statusCode = 500; 
        next(error);
    }
};

const verifyPayment = async (req, res, next) => {
    try {
        const { razorpay_order_id, razorpay_payment_id, razorpay_signature, transactionId } = req.body;
        
        // Verify payment signature
        const generated_signature = crypto
            .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
            .update(razorpay_order_id + "|" + razorpay_payment_id)
            .digest('hex');
            
        if (generated_signature !== razorpay_signature) {
            return res.status(400).json({
                success: false,
                message: "Invalid payment signature"
            });
        }
        
        const wallet = await Wallet.findOne({
            "transactions.transactionId": transactionId
        });
        
        if (!wallet) {
            return res.status(404).json({
                success: false,
                message: "Transaction not found"
            });
        }
        
        // Find the specific transaction
        const transactionIndex = wallet.transactions.findIndex(
            tx => tx.transactionId === transactionId
        );
        
        if (transactionIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Transaction not found in wallet"
            });
        }
        
        const transaction = wallet.transactions[transactionIndex];
        
        if (transaction.status === "Completed") {
            return res.status(200).json({
                success: true,
                message: "Payment was already processed",
                wallet: {
                    balance: wallet.balance,
                    currency: wallet.currency
                }
            });
        }
        
        // Update transaction details
        wallet.transactions[transactionIndex].status = "Completed";
        wallet.transactions[transactionIndex].description = 
            `Amount ₹${transaction.amount} added to wallet via Razorpay (Payment ID: ${razorpay_payment_id})`;
            
        wallet.balance += transaction.amount;
        wallet.lastUpdated = new Date();
        
        await wallet.save();
        
        return res.status(200).json({
            success: true,
            message: `₹${transaction.amount} has been successfully added to your wallet`,
            wallet: {
                balance: wallet.balance,
                currency: wallet.currency
            }
        });
        
    } catch (error) {
        error.statusCode = 500; 
        next(error);
    }
};

const handlePaymentFailure = async (req, res) => {
    try {
        const { transactionId, error_code, error_description } = req.body;
        
        const wallet = await Wallet.findOne({
            "transactions.transactionId": transactionId
        });
        
        if (!wallet) {
            return res.status(404).json({
                success: false,
                message: "Transaction not found"
            });
        }
        
        const transactionIndex = wallet.transactions.findIndex(
            tx => tx.transactionId === transactionId
        );
        
        if (transactionIndex === -1) {
            return res.status(404).json({
                success: false,
                message: "Transaction not found in wallet"
            });
        }
        
        wallet.transactions[transactionIndex].status = "Failed";
        wallet.transactions[transactionIndex].description = 
            `Payment failed: ${error_description || "Unknown error"}`;
            
        await wallet.save();
        
        return res.status(200).json({
            success: false,
            message: "Payment failed",
            error: error_description || "Payment was not completed"
        });
        
    } catch (error) {
        console.error("Error in handlePaymentFailure:", error.message);
        return res.status(500).json({
            success: false,
            message: "Something went wrong while processing payment failure"
        });
    }
};

module.exports = {
    getWalletPage,
    addAmountWallet,
    verifyPayment,
    handlePaymentFailure
};
