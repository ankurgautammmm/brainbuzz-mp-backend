import mongoose from "mongoose";

const ProfileSchema = new mongoose.Schema({
  username: { type: String, unique: true },
  fullName: String,
  email: String,
  avatar: String,
});

export default mongoose.model("Profile", ProfileSchema);
