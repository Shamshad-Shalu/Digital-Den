const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reviewSchema = new Schema({
  userID: {
    type: Schema.Types.ObjectId,
    ref: 'User',                 
    required: true,             
    trim: true             
  },
  productID: {
    type: Schema.Types.ObjectId, 
    ref: 'Product',          
    required: true,             
    trim: true                 
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
    default: 4         
  },
  title: {
    type: String,              
    required: true,            
    trim: true             
  },
  feedback: {
    type: String,         
    required: true,     
    trim: true                  
  },
  verifiedPurchase: {
    type: Boolean,          
    default: false              
  },
  helpfulVotes: {
    type: Number,              
    default: 0          
  },
  isDeleted: {
    type: Boolean,               
    default: false              
  },
  updatedAt: {
    type: Date,                  
    default: Date.now           
  },
  createdAt: {
    type: Date,               
    default: Date.now           
  }
});


module.exports = mongoose.model('Review', reviewSchema);