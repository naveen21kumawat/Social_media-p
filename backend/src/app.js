import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import errorMiddleware from "./middleware/error.middleware.js";
const app = express();

app.use(cors({
  origin: true, // Allow all origins in development/production
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  exposedHeaders: ["set-cookie"],
  preflightContinue: false,
  optionsSuccessStatus: 204
}));

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ extended: true, limit: "16kb" }));
app.use(cookieParser());
app.use(express.static("public"));

// home route
app.get("",(req,res) => res.json({msg:"API Is Running"}))

// routes
import { userRoutes } from "./routes/user.routes.js";
import { healthRoutes } from "./routes/health.routes.js";
import { followRoutes } from "./routes/follow.routes.js";
import postRoutes from "./routes/post.routes.js";
import storyRoutes from "./routes/story.routes.js";
import reelRoutes from "./routes/reel.routes.js";
import feedRoutes from "./routes/feed.routes.js";

// routes register
app.use("/api/v1/users", userRoutes);
app.use("/api/v1/follow", followRoutes);
app.use("/api/v1/post", postRoutes);
app.use("/api/v1/story", storyRoutes);
app.use("/api/v1/reel", reelRoutes);
app.use("/api/v1/feed", feedRoutes);
app.use(healthRoutes);

//  404 route
app.use((req, res, next) => {
  res.status(404).json({
    success: false,
    message: "Route not found",
  });
});

// Global error middleware (last)
app.use(errorMiddleware);

export { app as Server };
