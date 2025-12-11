import { Router } from "express";
import {
  globalSearch,
  searchUsers,
  searchPages,
  searchHashtags,
  getTrending,
  getSearchHistory,
  clearSearchHistory,
} from "../controllers/search.controller.js";
import { verifyJwt } from "../middleware/auth.middleware.js";

const router = Router();

// Public search routes (optional auth for personalization)
router.route("/global").get(globalSearch);
router.route("/users").get(searchUsers);
router.route("/pages").get(searchPages);
router.route("/hashtags").get(searchHashtags);
router.route("/trending").get(getTrending);

// Protected routes (require authentication)
router.route("/history").get(verifyJwt, getSearchHistory);
router.route("/history").delete(verifyJwt, clearSearchHistory);

export default router;
