import mongoose from "mongoose";

const addressSchema = new mongoose.Schema({
  name: String,
  mobile: String,
  address: String,
  area: String,
  city: String,
  zip: String,
  state: String,
  defaultAddress: Boolean,
});

const Address = mongoose.model("Address", addressSchema);

export default Address;
