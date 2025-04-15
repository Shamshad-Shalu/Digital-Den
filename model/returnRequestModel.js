// models/ReturnRequest.js
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
      type: String,
      required: true,
      trim: true,
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