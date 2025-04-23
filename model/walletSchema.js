const mongoose = require("mongoose");
const { Schema } = mongoose;
const {generateCustomId} = require("../utils/helper");

const walletSchema = new Schema({
    userId: {
        type: Schema.Types.ObjectId,
        ref: "User",
        required: true,
        index: true
    },
    balance: {
        type: Number,
        required: true,
        default: 0,
        min: 0
    },
    currency: {
        type: String,
        default: "INR" 
    },
    transactions: [{
        transactionId: {
            type: String,
            unique: true,
            default: () => generateCustomId ("TXN")
        },
        amount: {
            type: Number,
            required: true        
        },
        type: {
            type: String,
            enum: ["Credit", "Debit"],
            required: true
        },
        method: {
            type: String,
            enum: ["Razorpay", "Cashback", "Refund","OrderPayment","Referral"],
            required: true
        },
        status: {
            type: String,
            enum: ["Pending", "Completed", "Failed"],
            default: "Pending"
        },
        date: {
            type: Date,
            default: Date.now
        },
        description: {
            type: String,
            default: "No description provided"
        }
    }],
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    orderId: {
        type: Schema.Types.ObjectId,
        ref: "Order",
        default: null
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Wallet", walletSchema);