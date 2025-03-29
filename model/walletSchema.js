const mongoose = require("mongoose");
const { Schema } = mongoose;

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
            default: () => Math.random().toString(36).substr(2, 9)
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
            enum: ["UPI", "Card", "Bank Transfer", "Cashback", "Refund"],
            required: true
        },
        status: {
            type: String,
            enum: ["Pending", "Completed", "Failed"],
            default: "Completed"
        },
        date: {
            type: Date,
            default: Date.now
        },
        description: {
            type: String
        }
    }],
    lastUpdated: {
        type: Date,
        default: Date.now
    }
}, {
    timestamps: true
});

module.exports = mongoose.model("Wallet", walletSchema);