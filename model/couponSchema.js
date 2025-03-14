const mongoose = require("mongoose");
const {Schema} = mongoose;

const couponSchema = new Schema({
    name:{
        type:String,
        required:true,
        unique:true

    },
    createdOn:{
        type:Date,
        default:Date.now,
        required:true
    },
    expireOn:{
        type:Date,
        required:true
    },
    offerPrice:{
        type:Number,
        required:true
    },  
    minimumPrice:{
        type:Number,
        required:true
    },  
    isList:{
        type:Boolean,
        default:true
    },                                        
    offerPrice:{
        type:Number,
        required:true
    },                      
    userId:[{
        type:Schema.Types.ObjectId,
        ref:"User",
    }]
});

module.exports = mongoose.model("Coupon",couponSchema);