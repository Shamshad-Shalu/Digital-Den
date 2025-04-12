// const mongoose = require("mongoose");
// const {Schema} = mongoose;

// const offerSchema = new Schema ({
//     name:{
//         type:String,
//         required:true
//     },
//     type:{
//         type:String,
//         enum:['product', 'category', 'brand'],
//         required: true
//     },
//     targetIds: [{ type: Schema.Types.ObjectId, refPath: 'type' }], 
//     discountPercentage: { type: Number, required: true },
//     startDate: { type: Date, required: true },
//     endDate: { type: Date, required: true },
//     isActive: { type: Boolean, default: true }
// });

// offerSchema.index({ type: 1, targetIds: 1, startDate: 1 });

// module.exports = mongoose.model('Offer', offerSchema);


// const mongoose = require('mongoose');
// const { Schema } = mongoose;

// const offerSchema = new Schema({
//   code: { type: String, unique: true, required: true }, // Coupon code
//   name: { type: String, required: true },
//   discountPercentage: { type: Number, min: 0, max: 100, required: true },
//   minPurchase: { type: Number, default: 0 }, // Minimum amount to apply
//   maxDiscount: { type: Number }, // Optional cap on discount amount
//   startDate: { type: Date, required: true },
//   endDate: { type: Date, required: true },
//   isActive: { type: Boolean, default: true },
//   appliesTo: {
//     type: String,
//     enum: [
//       'all',                  // All products
//       'specificProducts',     // Specific products
//       'category',             // All products in a category
//       'brand',                // All products of a brand
//       'brandCategory',        // Specific brand + category
//       'brandProducts'         // Specific brand + specific products
//     ],
//     required: true
//   },
//   targetIds: [{ type: Schema.Types.ObjectId, refPath: 'appliesToTarget' }], // Dynamic reference
//   appliesToTarget: {
//     type: String,
//     enum: ['Product', 'Category', 'Brand', null],
//     default: null
//   },
//   brandId: { type: Schema.Types.ObjectId, ref: 'Brand' } // For brand-specific filters
// }, { timestamps: true });

// // Dynamic refPath for targetIds based on appliesTo
// offerSchema.path('appliesToTarget').get(function () {
//   switch (this.appliesTo) {
//     case 'specificProducts':
//     case 'brandProducts':
//       return 'Product';
//     case 'category':
//     case 'brandCategory':
//       return 'Category';
//     case 'brand':
//       return 'Brand';
//     default:
//       return null;
//   }
// });

// offerSchema.index({ code: 1, startDate: 1, endDate: 1 });
// module.exports = mongoose.model('Offer', offerSchema);

// const mongoose = require('mongoose');
// const { Schema } = mongoose;

// const offerSchema = new Schema({
//   name: { type: String, required: true },
//   discountPercentage: { type: Number, min: 0, max: 100, required: true },
//   minPurchase: { type: Number, default: 0 },
//   maxDiscount: { type: Number },
//   startDate: { type: Date, required: true },
//   endDate: { type: Date, required: true },
//   isActive: { type: Boolean, default: true },
//   appliesTo: {
//     type: String,
//     enum: ['products', 'categories', 'brands'],
//     required: true
//   },
//   isAll: { type: Boolean, default: true },
//   targetIds: [{ type: Schema.Types.ObjectId, refPath: 'appliesToModel' }],
//   appliesToModel: {
//     type: String,
//     enum: ['Product', 'Category', 'Brand'],
//     required: true
//   }
// }, { timestamps: true });

// offerSchema.pre('save', function (next) {
//   switch (this.appliesTo) {
//     case 'products':
//       this.appliesToModel = 'Product';
//       break;
//     case 'categories':
//       this.appliesToModel = 'Category';
//       break;
//     case 'brands':
//       this.appliesToModel = 'Brand';
//       break;
//     default:
//       throw new Error('Invalid appliesTo value');
//   }
//   if (this.isAll) this.targetIds = [];
//   next();
// });

// offerSchema.index({ appliesTo: 1, startDate: 1, endDate: 1 });
// module.exports = mongoose.model('Offer', offerSchema);



const mongoose = require("mongoose");
const { Schema } = mongoose;

const offerSchema = new Schema({
  name: { 
    type: String, 
    required: true 
  },
  description:{
    type:String,
    required:true
  }, 
  discountType: { 
    type: String, 
    enum: ["percentage", "fixed"], 
    required: true 
  },
  discountValue: { 
    type: Number, 
    required: true 
  },
  startDate: { 
    type: Date, 
    required: true 
  },
  endDate: { 
    type: Date, 
    required: true 
  },
  appliedOn: { 
    type: String, 
    enum: ["category", "brand", "product"], 
    required: true 
  },
  categories: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Category" 
  }],
  brands: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Brand" 
  }],
  products: [{ 
    type: mongoose.Schema.Types.ObjectId, 
    ref: "Product" 
  }],
  isActive: { type: Boolean, default: true }
});

module.exports = mongoose.model("Offer", offerSchema);
