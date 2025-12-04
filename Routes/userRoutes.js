import express from "express";
import User from "../models/User.js";

const router = express.Router();

// Save or update user profile
router.post("/profile", async (req, res) => {
  try {
    const { username, ...rest } = req.body;

    const user = await User.findOneAndUpdate(
      { username },
      rest,
      { new: true, upsert: true }
    );

    res.json({ message: "Profile saved", user });
  } catch (err) {
    res.status(500).json(err);
  }
});

export default router;
