const mongoose = require("mongoose");
const { Schema } = mongoose;

const returnRequestSchema = new Schema(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    itemIds: [{
      type: String, 
      required: false,
    }],
    reason: {
      enum:['changed_mind', 'wrong_item', 'Other']
    },
    comments:{
      type:String,
    }, 
    requestedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    status: {
      type: String,
      enum: ["Pending", "Approved", "Rejected"],
      default: "Pending",
    },
    refundAmount: {
        type: Number,
        default: 0 
    },
    returnedAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("ReturnRequest", returnRequestSchema);


