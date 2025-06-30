import express from "express";
import { verifyToken } from "../middleware/verifyToken.js";
import User from "../models/User.js";
import Address from "../models/Address.js";
import Order from "../models/Order.js";
import Razorpay from "razorpay";
import crypto from "crypto";

const router = express.Router();

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

// Get user details with populated addresses
router.get("/", verifyToken, async (req, res) => {
  try {
    const user = await User.findById(req.user.userId)
      .select("-password")
      .populate("addresses");
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        error: "User not found",
      });
    }
    res.status(200).json(user);
  } catch (error) {
    console.error("Get user details error:", {
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
    res.status(500).json({
      message: "Error fetching user details",
      error: error.message,
    });
  }
});

// Add new address
router.post("/address", verifyToken, async (req, res) => {
  try {
    const { name, mobile, address, area, city, zip, state, defaultAddress } =
      req.body;
    if (!name || !mobile || !address || !city || !zip || !state) {
      return res.status(400).json({
        message: "Required address fields are missing",
        error: "Missing required fields",
      });
    }
    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        error: "User not found",
      });
    }
    const newAddress = new Address({
      name,
      mobile,
      address,
      area,
      city,
      zip,
      state,
      defaultAddress: defaultAddress || false,
    });
    await newAddress.save();
    user.addresses.push(newAddress._id);
    await user.save();
    const updatedUser = await User.findById(req.user.userId).populate(
      "addresses"
    );
    res.status(200).json(updatedUser);
  } catch (error) {
    console.error("Add address error:", {
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
    res.status(500).json({
      message: "Error adding address",
      error: error.message,
    });
  }
});

// Create Razorpay order
router.post("/order", verifyToken, async (req, res) => {
  try {
    const { addressId, cartItems } = req.body;
    if (
      !addressId ||
      !cartItems ||
      !Array.isArray(cartItems) ||
      cartItems.length === 0
    ) {
      return res.status(400).json({
        message: "Address ID and cart items are required",
        error: "Missing required fields",
      });
    }

    // Validate cartItems structure
    const isValidCart = cartItems.every(
      (item) => item.id && item.quantity > 0 && item.price > 0
    );
    if (!isValidCart) {
      return res.status(400).json({
        message:
          "Invalid cart items. Each item must have productId, quantity, and price.",
        error: "Invalid cart items",
      });
    }

    const user = await User.findById(req.user.userId);
    if (!user) {
      return res.status(404).json({
        message: "User not found",
        error: "User not found",
      });
    }

    const address = await Address.findById(addressId);
    if (!address) {
      return res.status(404).json({
        message: "Address not found",
        error: "Address not found",
      });
    }

    // Calculate total amount from cartItems
    const totalAmount = cartItems.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0
    );
    if (totalAmount <= 0) {
      return res.status(400).json({
        message: "Invalid cart total",
        error: "Cart total must be greater than zero",
      });
    }

    // Create Razorpay order
    let razorpayOrder;
    try {
      razorpayOrder = await razorpay.orders.create({
        amount: totalAmount * 100, // Convert to paise
        currency: "INR",
        receipt: `order_${Date.now()}`,
      });
      console.log("Razorpay order created:", razorpayOrder);
    } catch (razorpayError) {
      console.error("Razorpay order creation failed:", razorpayError);
      return res.status(500).json({
        message: "Failed to create Razorpay order",
        error: razorpayError.message,
      });
    }

    if (!razorpayOrder.id) {
      return res.status(500).json({
        message: "Razorpay order creation failed: No order ID returned",
        error: "Invalid Razorpay response",
      });
    }
    console.log(cartItems, "asdfasdfsd");

    // Create order in database
    const order = new Order({
      user: req.user.userId,
      products: cartItems.map((item) => ({
        image: item.image,
        productId: item.productId,
        quantity: item.quantity,
        price: item.price,
      })),
      totalAmount,
      shippingAddress: addressId,
      paymentStatus: "pending",
      orderStatus: "placed",
      paymentId: null,
      paymentMethod: "razorpay",
      paymentDetails: { razorpay_order_id: razorpayOrder.id },
    });
    await order.save();
    user.orders.push(order._id);
    await user.save();

    res.status(200).json({
      orderId: razorpayOrder.id,
      amount: totalAmount,
    });
  } catch (error) {
    console.error("Create order error:", {
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
    res.status(500).json({
      message: "Error creating order",
      error: error.message,
    });
  }
});

// Verify Razorpay payment
router.post("/order/verify", verifyToken, async (req, res) => {
  try {
    const { razorpay_payment_id, razorpay_order_id, razorpay_signature } =
      req.body;
    if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature) {
      return res.status(400).json({
        message: "Missing payment details",
        error: "Incomplete payment data",
      });
    }

    // Verify payment signature
    const generatedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpay_order_id}|${razorpay_payment_id}`)
      .digest("hex");

    if (generatedSignature !== razorpay_signature) {
      return res.status(400).json({
        message: "Invalid payment signature",
        error: "Payment verification failed",
      });
    }

    // Update order status
    const order = await Order.findOne({
      "paymentDetails.razorpay_order_id": razorpay_order_id,
    });
    if (!order) {
      return res.status(404).json({
        message: "Order not found",
        error: "Order not found",
      });
    }
    order.paymentStatus = "paid";
    order.paymentId = razorpay_payment_id;
    order.paymentDetails = {
      ...order.paymentDetails,
      razorpay_payment_id,
      razorpay_signature,
    };
    await order.save();

    res.status(200).json({ message: "Payment verified successfully" });
  } catch (error) {
    console.error("Verify payment error:", {
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
    res.status(400).json({
      message: "Payment verification failed",
      error: error.message,
    });
  }
});

// Get user orders
router.get("/orders", verifyToken, async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user.userId })
      .select(
        "paymentDetails.razorpay_order_id totalAmount paymentStatus orderStatus products"
      )
      .populate("products.productId");
    res.status(200).json({ orders });
  } catch (error) {
    console.error("Get orders error:", {
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });
    res.status(500).json({
      message: "Error fetching orders",
      error: error.message,
    });
  }
});

export default router;
