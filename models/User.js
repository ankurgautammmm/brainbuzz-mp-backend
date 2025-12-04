import mongoose from "mongoose";

const UserSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  passwordHash: { type: String, required: true },

  fullName: String,
  email: String,
  phone: String,
  classYear: String,
  dob: String,
  age: Number,
}, { timestamps: true });

export default mongoose.model("User", UserSchema);
