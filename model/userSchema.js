const mongoose = require("mongoose");
const {Schema} = mongoose;

const userSchema = new Schema({
    username : {
        type:String,
        required:true
    },
    firstName : {
        type:String,
        required:false
    },
    lastName : {
        type:String,
        required:false
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
    orderHistory:[{
        type:Schema.Types.ObjectId,
        ref:"Order",
        default: [],
    }],
    referralCode: {
        type: String,
        unique: true,
        // required: true
    },
    redeemed: {
        type: Boolean,
        default: false
    },
    redeemedUsers: [{
        type: Schema.Types.ObjectId,
        ref: "User",
        default: []
    }]
    // referralCode:{
    //     type:String,
    //     // required:true
    // },
    // redeemed:{
    //     type:Boolean,
    //     // default:false
    // },
    // redeemedUsers:[{
    //     type:Schema.Types.ObjectId,
    //     ref:"User",
    //     // required:true  
    // }],
    // searchHistory:[{
    //     category:{
    //         type:Schema.Types.ObjectId,
    //         ref:"Category",
    //         required: false
    //     },
    //     brand:{
    //         type:String,
    //         required: false
    //     },
    //     searchOn:{
    //         type:Date,
    //         default:Date.now
    //     }
    // }]

},
{ timestamps: true })

module.exports = mongoose.model("User",userSchema);