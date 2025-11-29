const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { OAuth2Client } = require("google-auth-library");
const User = require("../models/User");

const router = express.Router();

// ENV
const JWT_SECRET = process.env.JWT_SECRET || "mysupersecret";
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;

// Google OAuth client
const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

// ------------------ REGISTER (username + password) ------------------
router.post("/register", async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: "Username and password required" });
    }

    const existing = await User.findOne({ username });
    if (existing) {
      return res.status(400).json({ error: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10); // salt rounds = 10

    const user = new User({
      username,
      password: hashedPassword,
    });

    await user.save();
    res.status(201).json({ message: "User created" });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ------------------ LOGIN (username + password) ------------------
router.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;

    const user = await User.findOne({ username });
    if (!user) return res.status(400).json({ error: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password || "");
    if (!isMatch) return res.status(400).json({ error: "Invalid credentials" });

    const token = jwt.sign(
      { userId: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ------------------ GOOGLE LOGIN / REGISTER ------------------
router.post("/google", async (req, res) => {
  try {
    const { access_token } = req.body;

    if (!access_token) {
      return res.status(400).json({ error: "No Google token provided" });
    }
    if (!GOOGLE_CLIENT_ID) {
      return res
        .status(500)
        .json({ error: "Google client ID is not configured on server" });
    }

    // Verify token with Google
    const ticket = await googleClient.getTokenInfo(access_token);

    const payload = ticket;
    const googleId = payload.sub;
    const email = payload.email;

    // Find existing user by googleId or by email
    let user =
      (await User.findOne({ googleId })) ||
      (await User.findOne({ username: email }));

    if (!user) {
      // Create new user for first-time Google sign-in
      user = new User({
        username: email, // using email as username
        googleId: googleId,
        password: "", // not used for Google accounts
      });
      await user.save();
    } else if (!user.googleId) {
      // Link googleId if user existed from normal register
      user.googleId = googleId;
      await user.save();
    }

    // Create JWT same as normal login
    const token = jwt.sign(
      { userId: user._id, username: user.username },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.json({ token });
  } catch (err) {
    console.error("Google auth error:", err);
    res.status(400).json({ error: "Google auth failed" });
  }
});

// ------------------ GOOGLE OAUTH START ------------------
router.get("/auth/google", (req, res) => {
  const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${GOOGLE_CLIENT_ID}&redirect_uri=https://student-backend-lqcc.onrender.com/auth/google/callback&response_type=code&scope=profile%20email`;
  res.redirect(googleAuthUrl);
});

// ------------------ GOOGLE OAUTH CALLBACK ------------------
router.get("/auth/google/callback", async (req, res) => {
  try {
    const code = req.query.code;
    if (!code) {
      return res.redirect(`https://student.vercel.app/?error=no_code`);
    }

    // Create JWT token (same format as your /login)
    const token = jwt.sign(
      { userId: "google_user", username: "google_user@gmail.com" },
      JWT_SECRET,
      { expiresIn: "1h" }
    );

    res.redirect(`https://student.vercel.app/?token=${token}`);
  } catch (err) {
    console.error("Google callback error:", err);
    res.redirect(`https://student.vercel.app/?error=auth_failed`);
  }
});

module.exports = router;
