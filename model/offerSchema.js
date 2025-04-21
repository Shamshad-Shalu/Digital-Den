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
  type: { 
    type: String, 
    enum: ["Percentage", "Fixed"], 
    required: true 
  },
  discount: { 
    type: Number, 
    required: true 
  },
  status: {
    type: String,
    enum: ['Active', 'Expired', 'Disabled',"Upcoming"],
    default: 'Active'
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
  }]
},{ timestamps: true });

module.exports = mongoose.model("Offer", offerSchema);
