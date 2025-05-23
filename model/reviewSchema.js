const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reviewSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',                 
    required: true             
  },
  productId: {
    type: Schema.Types.ObjectId, 
    ref: 'Product',          
    required: true             
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
  votedUsers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }]
}, { timestamps: true });

// Virtual for getting user details
reviewSchema.virtual('user', {
  ref: 'User',
  localField: 'userID',
  foreignField: '_id',
  justOne: true
});


module.exports = mongoose.model('Review', reviewSchema);