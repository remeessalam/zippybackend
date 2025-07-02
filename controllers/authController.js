import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import Admin from "../models/Admin.js";

const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const isValidPassword = (password) => {
  return password.length >= 6;
};

export const login = async (req, res) => {
  try {
    const { email, password, admin } = req.body;

    // Validate input
    if (!email || !password) {
      return res.status(400).json({
        message: "Email and password are required",
        error: "Missing required fields",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        message: "Invalid email format",
        error: "Invalid email",
      });
    }

    // Choose model based on admin flag
    const Model = admin ? Admin : User;

    // Find user/admin
    const user = await Model.findOne({ email }).select("+password");
    if (!user) {
      return res.status(401).json({
        message: "Invalid credentials",
        error: "User not found",
      });
    }

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        status: false,
        message: "Invalid credentials",
        error: "Incorrect password",
      });
    }

    // Verify admin status
    if (admin && !user.isAdmin) {
      return res.status(403).json({
        message: "Access denied, admin privileges required",
        error: "Not an admin",
      });
    }

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, isAdmin: user.isAdmin },
      process.env.JWT_SECRET
    );

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    console.error("Login error:", {
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });

    if (error.name === "MongoServerError") {
      return res.status(500).json({
        message: "Database error occurred",
        error: "Database operation failed",
      });
    }

    res.status(500).json({
      message: "An unexpected error occurred during login",
      error: error.message,
    });
  }
};

export const signup = async (req, res) => {
  try {
    const { name, email, password, admin } = req.body;

    // Validate input
    if (!name || !email || !password) {
      return res.status(400).json({
        message: "Name, email, and password are required",
        error: "Missing required fields",
      });
    }

    if (!isValidEmail(email)) {
      return res.status(400).json({
        message: "Invalid email format",
        error: "Invalid email",
      });
    }

    if (!isValidPassword(password)) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long",
        error: "Invalid password",
      });
    }

    // Choose model based on admin flag
    const Model = admin ? Admin : User;

    // Check for existing user/admin
    const existingUser = await Model.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        message: "Email already exists",
        error: "Duplicate email",
      });
    }

    // Create user/admin
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = new Model({
      name,
      email,
      password: hashedPassword,
      isAdmin: admin || false,
    });
    await user.save();

    // Generate JWT
    const token = jwt.sign(
      { userId: user._id, isAdmin: user.isAdmin },
      process.env.JWT_SECRET
    );

    res.status(201).json({
      message: "Signup successful",
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isAdmin: user.isAdmin,
      },
    });
  } catch (error) {
    console.error("Signup error:", {
      message: error.message,
      stack: process.env.NODE_ENV === "development" ? error.stack : undefined,
    });

    if (error.name === "ValidationError") {
      const errors = Object.values(error.errors).map((err) => err.message);
      return res.status(400).json({
        message: "Validation failed",
        error: errors.join(", "),
      });
    }

    if (error.name === "MongoServerError" && error.code === 11000) {
      return res.status(400).json({
        message: "Email already exists",
        error: "Duplicate email",
      });
    }

    res.status(500).json({
      message: "An unexpected error occurred during signup",
      error: error.message,
    });
  }
};
