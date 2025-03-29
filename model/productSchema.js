const mongoose = require("mongoose");
const {Schema} = mongoose;


const productSchema = new Schema({
    productName:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    category:{
        type:Schema.Types.ObjectId,
        ref:"Category",
        required:true
        
    },
    brand:{
        type:Schema.Types.ObjectId,
        ref:"Brand",
        required:true

    },
    rating:{
        type:Schema.Types.ObjectId,
        ref:"Review",
        required:false

    }, 
    regularPrice:{
        type:Number,
        required:true
    },
    salePrice:{
        type:Number,
        required:true
    },
    productOffer:{
        type:Number,
        default:0
    },
    quantity:{
        type:Number,
        required:true
    },
    isDeleted:{
        type:Boolean,
        default:false
    },
    cardImage: { 
        type: String, 
        required: true 
    },
    productImages: { 
        type: [String], 
        required: true 
    },
    isListed: {
        type: Boolean,
        default: true
    },
    specifications: [{
        name: { type: String, required: true },
        value: { type: String, required: true }
    }],
    status:{
        type:String,
        enum:["Available","Out of stock","Discontinued"],
        required:true,
        default:"Available"
    }

},{timestamps:true});


module.exports = mongoose.model("Product",productSchema);