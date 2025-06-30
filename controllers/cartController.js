import Cart from "../models/Cart.js";

export const getCart = async (req, res) => {
  try {
    const cart = await Cart.findOne({ user: req.user.userId }).populate(
      "items.product"
    );
    if (!cart) return res.status(404).json({ message: "Cart not found" });
    res.json(cart);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const addToCart = async (req, res) => {
  const { productId, quantity } = req.body;
  // console.log(req);
  try {
    let cart = await Cart.findOne({ user: req.user.userId });
    if (!cart) {
      cart = new Cart({
        user: req.user.userId,
        items: [{ product: productId, quantity: quantity || 1 }],
      });
    } else {
      const itemIndex = cart.items.findIndex(
        (item) => item.product.toString() === productId
      );
      if (itemIndex > -1) {
        cart.items[itemIndex].quantity += quantity || 1;
      } else {
        cart.items.push({ product: productId, quantity: quantity || 1 });
      }
    }
    await cart.save();
    await cart.populate("items.product");

    res.status(200).json({ status: true, cart });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const updateCartItem = async (req, res) => {
  const { productId, quantity } = req.body;
  try {
    let cart = await Cart.findOne({ user: req.user.userId });
    if (!cart) return res.status(404).json({ message: "Cart not found" });

    const itemIndex = cart.items.findIndex(
      (item) => item.product.toString() === productId
    );
    if (itemIndex > -1) {
      cart.items[itemIndex].quantity = quantity;
      await cart.save();
      res.status(200).json(cart);
    } else {
      res.status(404).json({ message: "Product not found in cart" });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

export const removeFromCart = async (req, res) => {
  const { productId } = req.params;
  try {
    let cart = await Cart.findOne({ user: req.user.userId });
    if (!cart)
      return res.status(404).json({ status: false, message: "Cart not found" });

    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId
    );
    await cart.save();
    await cart.populate("items.product");
    res.status(200).json({ status: true, cart });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};

export const clearCart = async (req, res) => {
  try {
    let cart = await Cart.findOne({ user: req.user.userId });
    if (!cart) {
      return res.status(404).json({ status: false, message: "Cart not found" });
    }

    cart.items = [];
    await cart.save();
    res
      .status(200)
      .json({ status: true, message: "Cart cleared successfully", cart });
  } catch (err) {
    res.status(500).json({ status: false, message: err.message });
  }
};
