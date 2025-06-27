import express from "express";
import {
  addProduct,
  deleteProduct,
  getAllProducts,
  getProductById,
  updateProduct,
} from "../controllers/productController.js";
import authMiddleware from "../middleware/authMiddleware.js";
import upload from "../middleware/multer.js";

const router = express.Router();

// Public route
router.get("/", getAllProducts);
router.get("/:id", getProductById);

// Protected routes
// authMiddleware
router.post("/", upload.array("images", 9), addProduct);
router.put("/:id", upload.array("images", 9), updateProduct);
router.delete("/:id", deleteProduct);

export default router;
