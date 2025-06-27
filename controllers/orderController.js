import Order from "../models/Order.js";
import User from "../models/User.js";
import Cart from "../models/Cart.js";
import crypto from "crypto";
import Razorpay from "razorpay";

const razorpayInstance = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});
// Create a new order
export const createOrder = async (req, res) => {
  try {
    const { products, totalAmount, shippingAddress, paymentMethod } = req.body;
    const { userId } = req.user;
    console.log(products);
    if (!products || !totalAmount || !shippingAddress) {
      return res.status(400).json({
        status: false,
        message: "Products, total amount, and shipping address are required",
      });
    }

    const newOrder = new Order({
      user: userId,
      products,
      totalAmount: totalAmount,
      shippingAddress,
      paymentMethod,
      paymentStatus: "pending",
    });

    const savedOrder = await newOrder.save();
    await User.findByIdAndUpdate(userId, { $push: { orders: savedOrder._id } });

    const razorpayOrder = await razorpayInstance.orders.create({
      amount: totalAmount * 100,
      currency: "INR",
      receipt: savedOrder._id.toString(),
    });
    await Cart.findOneAndDelete({ user: userId });

    res.status(201).json({
      status: true,
      message: "Order created successfully",
      data: { ...savedOrder.toObject(), razorpayOrder },
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({ status: false, message: "Failed to create order" });
  }
};

// Verify Razorpay payment
export const verifyPayment = async (req, res) => {
  try {
    const { razorpayOrderId, paymentId, signature, orderId } = req.body;

    if (!razorpayOrderId || !paymentId || !signature) {
      return res.status(400).json({
        status: false,
        message: "Order ID, payment ID, and signature are required",
      });
    }

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({
        status: false,
        message: "Order not found",
      });
    }

    const expectedSignature = crypto
      .createHmac("sha256", process.env.RAZORPAY_KEY_SECRET)
      .update(`${razorpayOrderId}|${paymentId}`)
      .digest("hex");

    if (expectedSignature === signature) {
      order.paymentStatus = "paid";
      order.paymentId = paymentId;
      order.paymentDetails = req.body;
      await order.save();

      return res.status(200).json({
        status: true,
        message: "Payment verified successfully",
        data: order,
      });
    } else {
      // Payment verification failed: remove the created order
      await Order.findByIdAndDelete(orderId);
      return res.status(400).json({
        status: false,
        message: "Payment verification failed, order removed",
      });
    }
  } catch (error) {
    console.error("Error verifying payment:", error);
    res
      .status(500)
      .json({ status: false, message: "Failed to verify payment" });
  }
};

// Get user orders
export const getUserOrders = async (req, res) => {
  try {
    const { userId } = req.user;
    const orders = await Order.find({ user: userId })
      .populate("shippingAddress")
      .populate("products.productId")
      .sort({ createdAt: -1 })
      .exec();
    res.status(200).json({
      status: true,
      message: "Orders fetched successfully",
      data: orders,
    });
  } catch (error) {
    console.error("Error fetching user orders:", error);
    res.status(500).json({ status: false, message: "Failed to fetch orders" });
  }
};

// Get order by ID
export const getOrderById = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { userId } = req.user;
    const order = await Order.findOne({ _id: orderId, user: userId })
      .populate("products.product")
      .populate("shippingAddress");

    if (!order) {
      return res
        .status(404)
        .json({ status: false, message: "Order not found" });
    }

    res.status(200).json({
      status: true,
      message: "Order details fetched successfully",
      data: order,
    });
  } catch (error) {
    console.error("Error fetching order details:", error);
    res
      .status(500)
      .json({ status: false, message: "Failed to fetch order details" });
  }
};

//remove order
export const cancelOrder = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ status: false, message: "Order not found" });
    }
    // Only cancel if payment hasn't been completed
    if (order.paymentStatus === "paid") {
      return res
        .status(400)
        .json({ status: false, message: "Cannot cancel a paid order" });
    }
    await Order.findByIdAndDelete(orderId);
    res
      .status(200)
      .json({ status: true, message: "Order cancelled successfully" });
  } catch (error) {
    console.error("Error cancelling order:", error);
    res.status(500).json({ status: false, message: "Failed to cancel order" });
  }
};

export const getAllOrders = async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    const totalOrders = await Order.countDocuments();

    const orders = await Order.find()
      .populate("shippingAddress")
      .populate("products.productId")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .exec();

    res.status(200).json({
      status: true,
      message: "Orders fetched successfully",
      data: orders,
      pagination: {
        totalOrders,
        totalPages: Math.ceil(totalOrders / limit),
        currentPage: page,
        hasNextPage: skip + orders.length < totalOrders,
        hasPrevPage: page > 1,
      },
    });
  } catch (error) {
    console.error("Error fetching user orders:", error);
    res.status(500).json({ status: false, message: "Failed to fetch orders" });
  }
};

export const updateOrderStatus = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { orderStatus } = req.body;

    // Validate the new status against allowed values
    const allowedStatuses = [
      "placed",
      "processing",
      "shipped",
      "delivered",
      "cancelled",
      "return",
    ];
    if (!allowedStatuses.includes(orderStatus)) {
      return res
        .status(400)
        .json({ status: false, message: "Invalid order status" });
    }

    // Find the order by its ID
    const order = await Order.findById(orderId);
    if (!order) {
      return res
        .status(404)
        .json({ status: false, message: "Order not found" });
    }

    // Update the order status
    order.orderStatus = orderStatus;
    await order.save();

    return res.status(200).json({
      status: true,
      message: "Order status updated successfully",
      data: order,
    });
  } catch (error) {
    console.error("Error updating order status:", error);
    return res
      .status(500)
      .json({ status: false, message: "Failed to update order status" });
  }
};
