import mongoose from "mongoose";

const attemptSchema = new mongoose.Schema({
  username: String,
  subject: String,
  scorePct: Number,
  correct: Number,
  total: Number,
  timestamp: { type: Date, default: Date.now }
});

export default mongoose.model("Attempt", attemptSchema);
