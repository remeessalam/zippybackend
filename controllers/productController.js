import Product from "../models/productSchema.js";

// Add a new product (Protected)
const addProduct = async (req, res) => {
  try {
    const productData = req.body;
    const product = new Product(productData);
    await product.save();
    res.status(201).json({ message: "Product added successfully", product });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error adding product", error: error.message });
  }
};

// Get all products (Public)
const getAllProducts = async (req, res) => {
  try {
    const products = await Product.find();
    res
      .status(200)
      .json({ message: "Products retrieved successfully", products });
  } catch (error) {
    res
      .status(500)
      .json({ message: "Error retrieving products", error: error.message });
  }
};

// Update a product (Protected)
const updateProduct = async (req, res) => {
  try {
    const { id } = req.params;
    const productData = req.body;
    const product = await Product.findByIdAndUpdate(id, productData, {
      new: true,
      runValidators: true,
    });

    if (!product) {
      return res.status(404).json({ message: "Product not found" });
    }

    res.status(200).json({ message: "Product updated successfully", product });
  } catch (error) {
    res
      .status(400)
      .json({ message: "Error updating product", error: error.message });
  }
};

export { addProduct, getAllProducts, updateProduct };
