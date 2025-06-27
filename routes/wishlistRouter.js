import express from "express";
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
} from "../controllers/wishlistController.js";

const router = express.Router();

router.get("/", getWishlist);

router.post("/add", addToWishlist);

router.delete("/remove/:productId", removeFromWishlist);

export default router;
