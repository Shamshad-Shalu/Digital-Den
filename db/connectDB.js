const mongoose = require("mongoose");
const env = require("dotenv").config();


const connectDatabase = async ()=>{
    try{
        const db = await mongoose.connect(process.env.MONGODB_URI);
        console.log(`database connected to database: ${db.connection.port}`);
    }
    catch(err){
        console.log("Error:"+err);
    }
}

module.exports = {connectDatabase};