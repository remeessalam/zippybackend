import express from "express";
import {
  addProduct,
  getAllProducts,
  updateProduct,
} from "../controllers/productController.js";
import authMiddleware from "../middleware/authMiddleware.js";

const router = express.Router();

// Public route
router.get("/", getAllProducts);

// Protected routes
router.post("/", authMiddleware, addProduct);
router.put("/:id", authMiddleware, updateProduct);

export default router;
