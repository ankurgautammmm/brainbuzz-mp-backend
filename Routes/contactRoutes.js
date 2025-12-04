import express from "express";
import Contact from "../models/Contact.js";

const router = express.Router();

router.post("/send", async (req, res) => {
  try {
    const contact = new Contact(req.body);
    await contact.save();
    res.json({ message: "Message stored", contact });
  } catch (err) {
    res.status(500).json(err);
  }
});

export default router;
