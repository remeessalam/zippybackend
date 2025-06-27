import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    default:
      "BABORUI 3.0 Upgraded Interactive Cat Toy with 2-Speed Adjustment, Remote Control, Automatic, Orange",
  },
  amount: { type: Number, required: true, min: 0.01 },
  description: {
    type: String,
    trim: true,
  },
  headings: [
    {
      title: {
        type: String,
        required: true,
        trim: true,
      },
      description: {
        type: String,
        required: true,
        trim: true,
      },
    },
  ],
  about: {
    type: [String],
    default: [
      "Smart remote control with two modes: smart and manual.",
      "Includes blue caterpillar and yellow/white feathers to stimulate curiosity.",
      "Automatic obstacle avoidance with intelligent motion sensors.",
      "High-quality silicone for durability and easy-to-clean wheels.",
      "Suitable for cats of all ages, promotes exercise and interaction.",
    ],
  },
  images: {
    type: [String],
    required: true,
    validate: {
      validator: function (arr) {
        return arr.length > 0;
      },
      message: "At least one image is required",
    },
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt field before saving
productSchema.pre("save", function (next) {
  this.updatedAt = Date.now();
  next();
});

export default mongoose.model("Product", productSchema);
