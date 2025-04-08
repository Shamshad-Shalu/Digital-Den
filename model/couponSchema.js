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
    usageLimit: {
        type: Number,
        default: null,
        min: 1
    },
    usedCount: {
        type: Number,
        default: 0,
        min: 0
    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    },
    users: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
    }],
    isReferral: { 
        type: Boolean,
        default: false
    }

    // userId:[{
    //     type:Schema.Types.ObjectId,
    //     ref:"User",
    // }]
     
    // isList:{
    //     type:Boolean,
    //     default:true
    // },                                        
    // offerPrice:{
    //     type:Number,
    //     required:true
    // },                      
    // userId:[{
    //     type:Schema.Types.ObjectId,
    //     ref:"User",
    // }]
});

module.exports = mongoose.model("Coupon",couponSchema);