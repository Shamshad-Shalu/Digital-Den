const mongoose = require("mongoose");
const {Schema} = mongoose;


const brandSchema = new Schema({
    brandName:{
        type:String,
        required:true,
        trim: true
    },
    brandImage:{
        type:[String],
        required:true
    },
    isListed: {
        type: Boolean,
        default: true
    },
    brandOffer:{
        type:Number,
        default:0,
        min: 0,
        max: 100
    },
    isDeleted:{
        type:Boolean,
        default:false
    }
},{timestamps:true});

module.exports = mongoose.model("Brand",brandSchema);


