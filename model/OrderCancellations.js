const mongoose = require("mongoose");
const { Schema } = mongoose;

const orderCancellationSchema = new Schema(
  {
    orderId: {
      type: Schema.Types.ObjectId,
      ref: "Order",
      required: true,
    },
    reason: {
      type: String,
      enum: ["changed_mind", "wrong_item", "Other"],
      required: true,
    },
    comments: {
      type: String,
      trim: true,
      default: "",
    },
    canceledAt: {
      type: Date,
      default: Date.now,
    },
    canceledBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model("OrderCancellation", orderCancellationSchema);