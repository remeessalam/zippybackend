import express from "express";
import {
  createOrder,
  verifyPayment,
  getUserOrders,
  getOrderById,
  cancelOrder,
  getAllOrders,
  updateOrderStatus,
} from "../controllers/orderController.js";
import { verifyToken } from "../middleware/verifyToken.js";

const router = express.Router();

// Get all order
router.get("/", getAllOrders);
// Create a new order
router.post("/create", verifyToken, createOrder);

// Verify payment
router.post("/verify-payment", verifyToken, verifyPayment);

// Get user orders
router.get("/user-orders", verifyToken, getUserOrders);

// Get order by ID
router.get("/:orderId", verifyToken, getOrderById);

// Get order by ID
router.delete("/:orderId/cancel", verifyToken, cancelOrder);

// PATCH /orders/:orderId/status
router.patch("/:orderId/status", updateOrderStatus);

export default router;
