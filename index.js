import "dotenv/config";
import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import { errorHandler } from "./middleware/errorHandler.js";
import productRoutes from "./routes/productRoutes.js";
const app = express();

app.use(cors({ origin: "*" }));
app.use(express.json());

app.get("/", (req, res) => {
  res.send("Shopque backend is running on port 8080");
});
// Routes
app.use("/api/products", productRoutes);

app.use(errorHandler);

console.log("refresh");
// Error Handling Middleware

// MongoDB Connection
const PORT = process.env.PORT || 8080;
mongoose
  .connect(process.env.MONGO_URI, {
    serverSelectionTimeoutMS: 30000,
    socketTimeoutMS: 45000,
  })
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
    console.log("MongoDB connected");
  })
  .catch((err) => console.error("MongoDB connection error:", err));

// app.use(serverless(app)); // Ensure this is the last middleware

export default app;
