import Product from "../models/productSchema.js";
import { v2 as cloudinaryV2 } from "cloudinary";
import fs from "fs";
import path from "path";

// Configure Cloudinary
cloudinaryV2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Ensure uploads directory exists
// const uploadDir = path.join(process.cwd(), "uploads");
// if (!fs.existsSync(uploadDir)) {
//   fs.mkdirSync(uploadDir, { recursive: true });
// }

// Add a new product (Protected)
const addProduct = async (req, res) => {
  try {
    const { files } = req;
    let productData = req.body;
    // Log incoming request data for debugging
    console.log(
      "addProduct - Incoming files:",
      files?.map((f) => f.originalname)
    );
    console.log("addProduct - Incoming body:", productData);

    // Validate amount
    if (!productData.amount) {
      return res.status(400).json({ message: "Amount is required" });
    }
    const amount = parseFloat(productData.amount);
    if (isNaN(amount) || amount <= 0) {
      return res
        .status(400)
        .json({ message: "Amount must be a positive number" });
    }
    productData.amount = amount;

    // Validate files presence
    if (!files || files.length === 0) {
      return res
        .status(400)
        .json({ message: "At least one product image is required" });
    }

    // Parse about field if it's a string
    if (typeof productData.about === "string") {
      productData.about = productData.about
        .split(",")
        .map((point) => point.trim())
        .filter((point) => point);
    } else if (Array.isArray(productData.about)) {
      productData.about = productData.about.filter((point) => point.trim());
    }

    // Parse headings if sent as JSON string
    if (typeof productData.headings === "string") {
      try {
        productData.headings = JSON.parse(productData.headings);
      } catch (e) {
        return res.status(400).json({ message: "Invalid headings format" });
      }
    }

    // Upload images to Cloudinary
    const uploadPromises = files.map((file) =>
      cloudinaryV2.uploader
        .upload(file.path, {
          folder: "products",
          transformation: [
            { width: 800, height: 800, crop: "limit" },
            { quality: "auto" },
            { fetch_format: "auto" },
          ],
        })
        .finally(() => {
          // Clean up local file after upload
          fs.unlink(file.path, (err) => {
            if (err) console.error("Error deleting temp file:", err);
          });
        })
    );

    const results = await Promise.all(uploadPromises);
    productData.images = results.map((result) => result.secure_url);

    // Create and save product
    const product = new Product(productData);
    await product.save();

    res.status(201).json({ message: "Product added successfully", product });
  } catch (error) {
    console.error("Error adding product:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    res.status(400).json({
      message: "Error adding product",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

// Get all products (Public)
const getAllProducts = async (req, res) => {
  try {
    const { page = 1, limit = 12 } = req.query;
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const products = await Product.find().skip(skip).limit(parseInt(limit));
    const total = await Product.countDocuments();

    res.status(200).json({
      message: "Products retrieved successfully",
      products,
      total,
      page: parseInt(page),
      limit: parseInt(limit),
    });
  } catch (error) {
    console.error("Error retrieving products:", {
      message: error.message,
      stack: error.stack,
    });
    res.status(500).json({
      message: "Error retrieving products",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

// Get a product by ID (Public)
const getProductById = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res
      .status(200)
      .json({ message: "Product retrieved successfully", product });
  } catch (error) {
    console.error("Error retrieving product by ID:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    res.status(400).json({
      message: "Error retrieving product",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

// Update a product (Protected)
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    let productData = req.body;
    const { files } = req;

    // Log incoming request data for debugging
    console.log(
      "updateProduct - Incoming files:",
      files?.map((f) => f.originalname)
    );
    console.log("updateProduct - Incoming body:", productData);

    // Validate amount
    if (!productData.amount) {
      return res.status(400).json({ message: "Amount is required" });
    }
    const amount = parseFloat(productData.amount);
    if (isNaN(amount) || amount <= 0) {
      return res
        .status(400)
        .json({ message: "Amount must be a positive number" });
    }
    productData.amount = amount;

    // Parse about field if it's a string
    if (typeof productData.about === "string") {
      productData.about = productData.about
        .split(",")
        .map((point) => point.trim())
        .filter((point) => point);
    } else if (Array.isArray(productData.about)) {
      productData.about = productData.about.filter((point) => point.trim());
    }

    // Parse headings if sent as JSON string
    if (typeof productData.headings === "string") {
      try {
        productData.headings = JSON.parse(productData.headings);
      } catch (e) {
        return res.status(400).json({ message: "Invalid headings format" });
      }
    }

    // If new images are provided, upload and delete old ones
    if (files && files.length > 0) {
      const existingProduct = await Product.findById(id);
      if (existingProduct && existingProduct.images) {
        const deletePromises = existingProduct.images.map((image) => {
          const publicId = image.split("/").pop().split(".")[0];
          return cloudinaryV2.uploader.destroy(`products/${publicId}`);
        });
        await Promise.all(deletePromises);
      }

      const uploadPromises = files.map((file) =>
        cloudinaryV2.uploader
          .upload(file.path, {
            folder: "products",
            transformation: [
              { width: 800, height: spoor800, crop: "limit" },
              { quality: "auto" },
              { fetch_format: "auto" },
            ],
          })
          .finally(() => {
            // Clean up local file after upload
            fs.unlink(file.path, (err) => {
              if (err) console.error("Error deleting temp file:", err);
            });
          })
      );
      const results = await Promise.all(uploadPromises);
      productData.images = results.map((result) => result.secure_url);
    }

    const product = await Product.findByIdAndUpdate(id, productData, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({ message: "Product updated successfully", product });
  } catch (error) {
    console.error("Error updating product:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    res.status(400).json({
      message: "Error updating product",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

// Delete a product (Protected)
const deleteProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    // Delete all images from Cloudinary
    if (product.images && product.images.length > 0) {
      const deletePromises = product.images.map((image) => {
        const publicId = image.split("/").pop().split(".")[0];
        return cloudinaryV2.uploader.destroy(`products/${publicId}`);
      });
      await Promise.all(deletePromises);
    }

    await Product.findByIdAndDelete(id);
    res.status(200).json({ message: "Product deleted successfully" });
  } catch (error) {
    console.error("Error deleting product:", {
      message: error.message,
      stack: error.stack,
      code: error.code,
    });
    res.status(400).json({
      message: "Error deleting product",
      error: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
  }
};

export {
  addProduct,
  getAllProducts,
  getProductById,
  updateProduct,
  deleteProduct,
};
