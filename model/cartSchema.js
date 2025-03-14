const mongoose = require("mongoose");
const {Schema} = mongoose;

const cartSchema = new Schema({
    userId:{
        type:Schema.Types.ObjectId,
        ref:"Users",
        required:true
    },
    items:[{
        productId:{
            type:Schema.Types.ObjectId,
            ref:"Product",
            required:true
           },
           quantity:{
            type:Number,
            required:true
           },
           price:{
            type:Number,
            required:true
           },
    //    status:{
    //     type:Boolean,
    //     default:"placed"
    //    },
    //    cancellationReason:{
    //         type:String,
    //         default:"none"
    //    }       
    }],
    totalAmount:{  
        type:Number,
        required:true
    }
},{timestamps:true});

module.exports = mongoose.model("Cart",cartSchema);