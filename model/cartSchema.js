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
        },
        // status:{
        //     type:String,
        //     default:'placed'
        // },
        // cancellationReason:{
        //     type:String,
        //     default:"none"
        // }
    }],
    subtotal: {  // (salePrice × quantity)
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
    totalAmount: {  //(subtotal - discount + tax + shipping)
        type: Number,
        required: true,
        default: 0
    }
},{
    timestamps: true,
  })
// cartSchema.methods.calculateTotalPrice = function () {
//     this.subtotal = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
//     return this.subtotal;
// };


module.exports = mongoose.model("Cart",cartSchema);