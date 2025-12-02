import express from "express";
import {
  sendFollowRequest,
  acceptFollowRequest,
  removeFollow,
  getFollowStatus,
  followBack,
  getFollowSuggestions,
} from "../controllers/follow.controller.js";
import { verifyJwt } from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(verifyJwt);

// Send follow request (auto-approve if public account)
router.post("/request/:targetUserId", sendFollowRequest);

// Accept pending follow request
router.post("/accept/:requestId", acceptFollowRequest);

// Unfollow or remove follower
router.delete("/remove/:targetUserId", removeFollow);

// Get follow relationship status
router.get("/status/:targetUserId", getFollowStatus);

// Follow back a user
router.post("/follow-back/:targetUserId", followBack);

// Get follow suggestions
router.get("/suggestions", getFollowSuggestions);

export { router as followRoutes };
