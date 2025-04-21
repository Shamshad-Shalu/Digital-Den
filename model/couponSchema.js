const mongoose = require("mongoose");
const {Schema} = mongoose;

const couponSchema = new Schema({
    code: {
        type: String,
        required: true,
        unique: true,
        trim: true,
        uppercase: true
    },
    discount: {
        type: Number,
        required: true,
        min: 1
    },
    type: {
        type: String,
        enum: ['Percentage', 'Fixed'],
        required: true
    },
    minPurchase: {
        type: Number,
        required: true,
        min: 0
    },
    maxDiscount: {
        type: Number,
        default: null,
        min: 0
    },
    expireOn:{
        type:Date,
        required:true
    },
    status: {
        type: String,
        enum: ['Active', 'Expired', 'Disabled'],
        default: 'Active'
    },
    usersUsed: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
    }],
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },

});

module.exports = mongoose.model("Coupon",couponSchema);