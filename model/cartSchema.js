const mongoose = require("mongoose");
const {Schema} = mongoose;

const cartSchema = new Schema({
    userId : {
       type:Schema.Types.ObjectId,
       ref:"User",
       required:true
    },
    items:[{
        productId :{
            type:Schema.Types.ObjectId,
            ref:'Product',
            required:true
        },
        discontinuedAt: { 
            type: Date, 
            default: null 
        }, 
        quantity:{
            type:Number,
            default:1
        },
        price:{
            type:Number,
            required:true
        },
        totalPrice:{
            type:Number,
            required:true
        }
    }],
    subtotal: { 
        type: Number,
        required: true,
        default: 0
    },
    discount: {  
        type: Number,
        default: 0
    },
    tax: {  
        type: Number,
        default: 0
    },
    shipping: {  
        type: Number,
        default: 0
    },
    totalAmount: {  
        type: Number,
        required: true,
        default: 0
    },
    appliedCoupon: { 
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Coupon',
        default: null
    },
    couponDiscount: { 
        type: Number,
        default: 0
    }
},{
    timestamps: true,
  })

module.exports = mongoose.model("Cart",cartSchema);