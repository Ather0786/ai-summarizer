
const express = require("express");
const cors = require("cors");
require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/user");
const Summary = require("./models/summary");
const { connectRabbitMQ } = require("./config/rabbitmq");
const session = require("express-session");
const passport = require("passport");
const GoogleStrategy = require("passport-google-oauth20").Strategy;
const { getChannel } = require("./config/rabbitmq");
const { GoogleGenAI } = require("@google/genai");
const { MongoStore } = require("connect-mongo");
const { startWorker } = require("./worker");
const app = express();
const PORT = process.env.PORT || 5000;

// Gemini configuration
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
});

// Middleware
app.use(cors({
  origin: process.env.CLIENT_URL || "http://localhost:5173",
  credentials: true,
}));

app.use(express.json());
app.set("trust proxy", 1);
// Session configuration
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,

    store: MongoStore.create({
      mongoUrl: process.env.MONGO_URI,
      collectionName: "sessions",
      ttl: 14 * 24 * 60 * 60,
    }),

    cookie: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    },
  })
);

// Passport configuration
app.use(passport.initialize());
app.use(passport.session());

// Store MongoDB user ID in the session
passport.serializeUser((user, done) => {
  console.log("Saving user ID in session:", user._id);

  done(null, user._id);
});

// Retrieve user from MongoDB using session ID
passport.deserializeUser(async (id, done) => {
  try {
    console.log("Finding user using session ID:", id);

    const user = await User.findById(id);

    done(null, user);
  } catch (error) {
    console.error("Error retrieving user:", error);
    done(error);
  }
});

// Google OAuth strategy
passport.use(
  new GoogleStrategy(
    {
      clientID: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      callbackURL: process.env.GOOGLE_CALLBACK_URL,
    },

    async (accessToken, refreshToken, profile, done) => {
      try {
        console.log("Google authentication successful");

        const email = profile.emails?.[0]?.value;

        if (!email) {
          console.log("Google account did not provide an email");
          return done(null, false);
        }

        console.log("Checking whether user exists:", email);

        // Search for existing user
        let user = await User.findOne({
          googleId: profile.id,
        });

        if (user) {
          console.log("Existing user found:", user.email);
        } else {
          console.log("New user detected. Creating account...");

          // Create new user
          user = await User.create({
            googleId: profile.id,
            name: profile.displayName,
            email: email,
            picture: profile.photos?.[0]?.value,
          });

          console.log("New user saved in MongoDB:", user._id);

          // Get RabbitMQ channel
          const channel = getChannel();

          // Prepare welcome email message
          const message = {
            name: user.name,
            email: user.email,
          };

          // Publish message to RabbitMQ
          channel.sendToQueue(
            "welcome_emails",
            Buffer.from(JSON.stringify(message)),
            {
              persistent: true,
            }
          );

          console.log("Welcome email message sent to RabbitMQ");
        }

        return done(null, user);

      } catch (error) {
        console.error("Google authentication/database error:", error);
        return done(error);
      }
    }
  )
);

console.log("Creating Express server...");

// Home route
app.get("/", (req, res) => {
  console.log("GET / request received");

  res.json({
    message: "Summarizer backend is running",
  });
});

// Start Google authentication
app.get(
  "/auth/google",
  passport.authenticate("google", {
    scope: ["profile", "email"],
  })
);

// Google OAuth callback
app.get(
  "/auth/google/callback",
  passport.authenticate("google", {
    failureRedirect: `${process.env.CLIENT_URL || "http://localhost:5173"}/?login=failed`,
  }),
  (req, res) => {
    console.log("Google login completed");
    console.log("Logged-in user:", req.user.email);

    res.redirect(`${process.env.CLIENT_URL || "http://localhost:5173"}/?login=success`);
  }
);

// Check logged-in user
app.get("/auth/user", (req, res) => {
  console.log("GET /auth/user request received");

  if (!req.isAuthenticated()) {
    return res.status(401).json({
      loggedIn: false,
    });
  }

  res.json({
    loggedIn: true,
    user: req.user,
  });
});

// Logout
app.get("/auth/logout", (req, res, next) => {
  console.log("Logout requested");

  req.logout((err) => {
    if (err) {
      return next(err);
    }

    req.session.destroy(() => {
      res.clearCookie("connect.sid");
      res.json({
        message: "Logged out successfully",
      });
    });
  });
});

// Gemini summarization route
app.post("/api/summarize", async (req, res) => {
  console.log("POST /api/summarize request received");

  try {
    // Check whether user is logged in
    if (!req.isAuthenticated()) {
      console.log("User is not authenticated");

      return res.status(401).json({
        error: "Please login first",
      });
    }

    const { text } = req.body;

    console.log("Text received from frontend");
    console.log("Text length:", text?.length);

    if (!text || text.trim() === "") {
      console.log("Error: Empty text received");

      return res.status(400).json({
        error: "Text is required",
      });
    }

    console.log("Sending text to Gemini...");

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-lite",
      contents: `Summarize the following text clearly and concisely:

${text}`,
    });

    console.log("Gemini response received");

    const summary = response.text;

    console.log("Summary generated successfully");
    console.log("Summary length:", summary?.length);

    // Save summary in MongoDB
    console.log("Saving summary to MongoDB...");

    const savedSummary = await Summary.create({
      user: req.user._id,
      originalText: text,
      summary: summary,
    });

    console.log("Summary saved successfully:", savedSummary._id);

    res.json({
      summary: summary,
    });

  } catch (error) {
    console.error("Summarization error:", error);

    res.status(500).json({
      error: "Failed to generate summary",
    });
  }
});
app.get("/api/history", async (req, res) => {
  console.log("GET /api/history request received");

  try {
    // Check authentication
    if (!req.isAuthenticated()) {
      console.log("User is not authenticated");

      return res.status(401).json({
        error: "Please login first",
      });
    }

    console.log("Fetching summaries for:", req.user.email);

    // Find summaries belonging to logged-in user
    const summaries = await Summary.find({
      user: req.user._id,
    }).sort({ createdAt: -1 });

    console.log("Summaries fetched:", summaries.length);

    res.json({
      summaries: summaries,
    });

  } catch (error) {
    console.error("History fetching error:", error);

    res.status(500).json({
      error: "Failed to fetch summary history",
    });
  }
});
// Creating  the backend DELETE route
app.delete("/api/history/:id", async (req, res) => {
  console.log("DELETE /api/history request received");
  console.log("Summary ID:", req.params.id);

  try {
    // Check whether the user is logged in
    if (!req.isAuthenticated()) {
      console.log("User is not authenticated");
      return res.status(401).json({ error: "Please login first" });
    }

    // Validate the MongoDB ID
    if (!mongoose.isValidObjectId(req.params.id)) {
      console.log("Invalid summary ID");
      return res.status(400).json({ error: "Invalid summary ID" });
    }

    console.log("Deleting summary for:", req.user.email);

    // Delete only if this summary belongs to the logged-in user
    const deletedSummary = await Summary.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });

    if (!deletedSummary) {
      console.log("Summary not found");
      return res.status(404).json({ error: "Summary not found" });
    }

    console.log("Summary deleted successfully:", deletedSummary._id);

    res.json({ message: "Summary deleted successfully" });

  } catch (error) {
    console.error("Summary deletion error:", error);
    res.status(500).json({ error: "Failed to delete summary" });
  }
});

mongoose.connect(process.env.MONGO_URI)
  .then(async () => {
    console.log("MongoDB Atlas connected successfully");

    await connectRabbitMQ();
    console.log("RabbitMQ publisher connected successfully");

    // Start the email worker
    startWorker();

    console.log("Email worker initialization started");

    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })
  .catch((error) => {
    console.error("Server startup failed:", error);
  });