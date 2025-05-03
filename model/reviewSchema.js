// const mongoose = require('mongoose');
// const Schema = mongoose.Schema;

// const reviewSchema = new Schema({
//   userID: {
//     type: Schema.Types.ObjectId,
//     ref: 'User',                 
//     required: true,             
//     trim: true             
//   },
//   productID: {
//     type: Schema.Types.ObjectId, 
//     ref: 'Product',          
//     required: true,             
//     trim: true                 
//   },
//   rating: {
//     type: Number,
//     required: true,
//     min: 1,
//     max: 5,
//     default: 4         
//   },
//   title: {
//     type: String,              
//     required: true,            
//     trim: true             
//   },
//   feedback: {
//     type: String,         
//     required: true,     
//     trim: true                  
//   },
//   verifiedPurchase: {
//     type: Boolean,          
//     default: false              
//   },
//   helpfulVotes: {
//     type: Number,              
//     default: 0          
//   },
//   isDeleted: {
//     type: Boolean,               
//     default: false              
//   },
//   updatedAt: {
//     type: Date,                  
//     default: Date.now           
//   },
//   createdAt: {
//     type: Date,               
//     default: Date.now           
//   }
// });


// module.exports = mongoose.model('Review', reviewSchema);

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const reviewSchema = new Schema({
  userID: {
    type: Schema.Types.ObjectId,
    ref: 'User',                 
    required: true             
  },
  productID: {
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
  helpfulVotes: {
    type: Number,              
    default: 0          
  },
  // Track users who found this review helpful
  votedUsers: [{
    userID: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    helpful: {
      type: Boolean,
      default: true
    }
  }],
  // Replies to this review
  replies: [{
    userID: {
      type: Schema.Types.ObjectId,
      ref: 'User'
    },
    content: {
      type: String,
      required: true,
      trim: true
    },
    createdAt: {
      type: Date,
      default: Date.now
    }
  }],
  isDeleted: {
    type: Boolean,               
    default: false              
  }
}, { timestamps: true });

// Virtual for getting user details
reviewSchema.virtual('user', {
  ref: 'User',
  localField: 'userID',
  foreignField: '_id',
  justOne: true
});

// Create compound index for preventing duplicate reviews
reviewSchema.index({ userID: 1, productID: 1 }, { unique: true });

module.exports = mongoose.model('Review', reviewSchema);