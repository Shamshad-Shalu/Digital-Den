const mongoose = require("mongoose");
const {Schema} = mongoose;

const addressSchema = new Schema(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    addresses: [
      {
        addressType: {
          type: String,
          enum: ["Home", "Work", "Other"],
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
        addressLine: {
          type: String,
          required: true,
        },
        city: {
          type: String,
          required: true,
          
        },
        landmark: {
          type: String,
          required: true, 
        },
        state: {
          type: String,
          required: true,
        },
        pincode: {
          type: String,
          required: true,
        },
        phone: {
          type: String,
          required: true,
        },
        altPhone: {
          type: String,
          required:false,
          sparse: true,
        },
        isDefault: {
          type: Boolean,
          default: false,
        },
      },
    ],
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model("Address", addressSchema);