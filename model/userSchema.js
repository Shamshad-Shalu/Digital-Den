const mongoose = require("mongoose");
const {Schema} = mongoose;

const userSchema = new Schema({
    username : {
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true,
        lowercase:true,
        trim:true
    },
    phone:{
        type:String,
        required: false,
        unique:true,      
        sparse:true,
        
    },
    googleId:{
        type:String,
        unique:true,
        sparse: true 
    },
    facebookId:{
        type:String,
        unique:true,
        sparse: true 
    },
    xId:{
        type:String,
        unique:true,
        sparse: true 
    },
    password:{
        type:String,
        required:false
    },
    isBlocked:{
        type:Boolean,
        default:false
    } ,
    isAdmin:{
        type:Boolean,
        default:false
    },
    profileImage: {
         type: String,
         required: false
    },
    cart:[{
        type:Schema.Types.ObjectId ,
        ref:"Cart"
    }],
    wallet:{
        type:Number,
        default:0
    },
    wishlist:[{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Wishlist"
    }],
    orderHistory:[{
        type:Schema.Types.ObjectId,
        ref:"Order"
    }],
    referralCode:{
        type:String,
        // required:true
    },
    redeemed:{
        type:Boolean,
        // default:false
    },
    redeemedUsers:[{
        type:Schema.Types.ObjectId,
        ref:"User",
        // required:true  
    }],
    searchHistory:[{
        category:{
            type:Schema.Types.ObjectId,
            ref:"Category",
            required: false
        },
        brand:{
            type:String,
            required: false
        },
        searchOn:{
            type:Date,
            default:Date.now
        }
    }]

},
{ timestamps: true })

module.exports = mongoose.model("User",userSchema);