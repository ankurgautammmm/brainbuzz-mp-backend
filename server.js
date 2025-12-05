import dotenv from "dotenv";
dotenv.config();

import express from "express";
import helmet from "helmet";
import cors from "cors";
import mongoose from "mongoose";
import morgan from "morgan";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

// ----------------------------------------
// GROQ AI IMPORT (CORRECT)
// ----------------------------------------
import Groq from "groq-sdk";

const groq = new Groq({
  apiKey: process.env.GROK_API_KEY,
});

// ----------------------------------------
// MODELS
// ----------------------------------------
import User from "./models/User.js";
import Profile from "./models/Profile.js";
import Attempt from "./models/Attempt.js";

// ----------------------------------------
// MONGODB CONNECTION
// ----------------------------------------
const mongoURI = process.env.MONGO_URI;

if (!mongoURI) {
  console.error("❌ ERROR: MONGO_URI missing in .env");
  process.exit(1);
}

mongoose
  .connect(mongoURI, { useNewUrlParser: true, useUnifiedTopology: true, dbName: "brainbuzz" })
  .then(() => console.log("✔ MongoDB Connected"))
  .catch((err) => console.error("❌ MongoDB Error:", err));

const app = express();
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));

const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET;

// ----------------------------------------
// AUTH MIDDLEWARE
// ----------------------------------------
function auth(req, res, next) {
  const header = req.headers.authorization;
  if (!header) return res.status(401).json({ error: "Missing token" });

  const token = header.split(" ")[1];
  jwt.verify(token, JWT_SECRET, (err, decoded) => {
    if (err) return res.status(401).json({ error: "Invalid token" });

    req.user = decoded;
    next();
  });
}
app.get("/", (req, res) => {
  res.send("BrainBuzz backend is live!");
});
app.get("/test-groq", async (req, res) => {
  try {
    const completion = await groq.chat.completions.create({
  model: "mixtral-8x7b",
  messages: [
    {
      role: "user",
      content: "Say hello"
    }
  ]
});

    res.json(completion.choices[0].message);
  } catch (err) {
    res.json({ error: err.message });
  }
});


// ========================================
// SIGNUP
// ========================================
app.post("/api/signup", async (req, res) => {
  const { username, password } = req.body;

  const exists = await User.findOne({ username });
  if (exists) return res.status(400).json({ error: "Username already exists" });

  const hash = await bcrypt.hash(password, 10);

  await User.create({ username, passwordHash: hash });
  await Profile.create({ username });

  res.json({ ok: true });
});

// ========================================
// LOGIN
// ========================================
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;

  const user = await User.findOne({ username });
  if (!user) return res.status(400).json({ error: "Invalid credentials" });

  const match = await bcrypt.compare(password, user.passwordHash);
  if (!match) return res.status(400).json({ error: "Invalid credentials" });

  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "7d" });

  res.json({ ok: true, token, username });
});

// ========================================
// GET PROFILE
// ========================================
app.get("/api/profile", auth, async (req, res) => {
  const profile = await Profile.findOne({ username: req.user.username });
  res.json(profile);
});

// ========================================
// UPDATE PROFILE
// ========================================
app.put("/api/profile", auth, async (req, res) => {
  await Profile.findOneAndUpdate({ username: req.user.username }, req.body, { new: true });
  res.json({ ok: true });
});

// ========================================
// SAVE QUIZ ATTEMPT
// ========================================
app.post("/api/attempts", auth, async (req, res) => {
  const attempt = await Attempt.create({
    username: req.user.username,
    ...req.body,
  });

  res.json({ ok: true, attempt });
});

// ========================================
// GET ALL ATTEMPTS OF USER
// ========================================
app.get("/api/attempts", auth, async (req, res) => {
  const attempts = await Attempt.find({ username: req.user.username });
  res.json(attempts);
});

// ========================================
// LEADERBOARD
// ========================================
app.get("/api/leaderboard", async (req, res) => {
  const attempts = await Attempt.find();

  const grouped = {};

  attempts.forEach((a) => {
    if (!grouped[a.username]) grouped[a.username] = { played: 0, total: 0, best: 0 };
    grouped[a.username].played++;
    grouped[a.username].total += a.scorePct;
    grouped[a.username].best = Math.max(grouped[a.username].best, a.scorePct);
  });

  const leaderboard = Object.entries(grouped).map(([username, data]) => ({
    username,
    played: data.played,
    avg: +(data.total / data.played).toFixed(2),
    best: data.best,
  }));

  leaderboard.sort((a, b) => b.avg - a.avg);

  res.json(leaderboard);
});

// ========================================
// AI MCQ GENERATOR (WORKING VERSION)
// ========================================
app.get("/api/generate-questions", async (req, res) => {
  const { subject, count = 10, lang = "english" } = req.query;

  const languageNote =
    lang === "hi"
      ? "Hindi"
      : lang === "both"
      ? "English & Hindi"
      : "English";

  const prompt = `
Generate ${count} MCQs on the topic "${subject}".
Return ONLY pure JSON array like:
[
  { "q": "...", "options": ["A","B","C","D"], "answer": "A", "explain": "..." }
]
Language: ${languageNote}
`;

  try {
    const completion = await groq.chat.completions.create({
      model:  "llama3-8b-8192",

      messages: [{ role: "user", content: prompt }],
    });

    const raw = completion.choices[0].message.content;
    let json = raw.match(/(\[.*\])/s);
    json = json ? json[1] : raw;

    res.json(JSON.parse(json));
  } catch (e) {
    console.log("AI Error:", e.message);
    res.json([]);
  }
});

// ----------------------------------------
// START SERVER
// ----------------------------------------
app.listen(PORT, () => console.log(`✔ Server running at http://localhost:${PORT}`));




