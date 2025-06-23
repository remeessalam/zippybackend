import mongoose from "mongoose";

const productSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    default:
      "BABORUI 3.0 Upgraded Interactive Cat Toy with 2-Speed Adjustment, Remote Control, Automatic, Orange",
  },
  petToyType: {
    type: String,
    required: true,
    trim: true,
    default: "Exercise Toy",
  },
  theme: {
    type: String,
    trim: true,
    default: "Animals",
  },
  breedRecommendation: {
    type: String,
    trim: true,
    default: "ALL",
  },
  brand: {
    type: String,
    required: true,
    trim: true,
    default: "BABORUI",
  },
  recommendedUses: {
    type: String,
    trim: true,
    default: "Playing",
  },
  cartoonCharacter: {
    type: String,
    trim: true,
    default: "Remote Control Cat Toy",
  },
  usage: {
    type: String,
    trim: true,
    default: "Indoor",
  },
  color: {
    type: String,
    trim: true,
    default: "Orange",
  },
  material: {
    type: String,
    trim: true,
    default: "Silicone",
  },
  scent: {
    type: String,
    trim: true,
    default: "Unscented",
  },
  about: [
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
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Product", productSchema);
