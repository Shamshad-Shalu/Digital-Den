const mongoose = require("mongoose");
const {Schema} = mongoose;

const categorySchema = new Schema({
    name:{
        type:String,
        required:true,
        trim: true,
        unique: true
    }, 
    description:{
        type:String,
        required:true
    },
    isListed: {
        type: Boolean,
        default: true
    },
    categoryOffer:{
        type:Number,
        default:0
    },
    isDeleted:{
        type:Boolean,
        default:false

    },
    createdAt: {
        type: Date,
        default: Date.now
    },
    updatedAt: {
        type: Date,
        default: Date.now
    }
});

module.exports = mongoose.model("Category",categorySchema)

