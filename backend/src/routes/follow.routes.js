import express from "express";
import {
  sendFollowRequest,
  acceptFollowRequest,
  removeFollow,
  removeFollowRequest,
  getFollowStatus,
  followBack,
  getFollowSuggestions,
  totalFollowers,
  totalFollowing
} from "../controllers/follow.controller.js";
import { verifyJwt } from "../middleware/auth.middleware.js";

const router = express.Router();

// All routes require authentication
router.use(verifyJwt);

// Send follow request (auto-approve if public account)
router.post("/request/:targetUserId", sendFollowRequest);

// Accept pending follow request
router.post("/accept/:requestId", acceptFollowRequest);

// remove follow request if pending request exists
router.delete("/remove-request/:requestId", removeFollowRequest);

// Unfollow or remove follower
router.delete("/a/:targetUserId", removeFollow);

// Get follow relationship status
router.get("/status/:targetUserId", getFollowStatus);

// Follow back a user
router.post("/follow-back/:targetUserId", followBack);

// Get follow suggestions
router.get("/suggestions", getFollowSuggestions);

// Get total followers || following
router.route("/total-followers").get(totalFollowers)
router.route("/total-following").get(totalFollowing);

// .get("/total-following", totalFollowing);

export { router as followRoutes };
