import Wishlist from "../models/WishList.js";

export const getWishlist = async (req, res) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user._id }).populate(
      "items.product"
    );
    if (!wishlist)
      return res.status(404).json({ message: "Wishlist not found" });
    res.status(200).json(wishlist);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const addToWishlist = async (req, res) => {
  const { productId } = req.body;
  try {
    let wishlist = await Wishlist.findOne({ user: req.user._id });
    if (!wishlist) {
      wishlist = new Wishlist({
        user: req.user._id,
        items: [{ product: productId }],
      });
    } else {
      // Check if product already exists in wishlist
      const exists = wishlist.items.some(
        (item) => item.product.toString() === productId
      );
      if (exists) {
        return res.status(400).json({ message: "Product already in wishlist" });
      }
      wishlist.items.push({ product: productId });
    }
    await wishlist.save();
    res.status(200).json(wishlist);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const removeFromWishlist = async (req, res) => {
  const { productId } = req.params;
  try {
    let wishlist = await Wishlist.findOne({ user: req.user._id });
    if (!wishlist)
      return res.status(404).json({ message: "Wishlist not found" });

    wishlist.items = wishlist.items.filter(
      (item) => item.product.toString() !== productId
    );
    await wishlist.save();
    res.status(200).json(wishlist);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};
