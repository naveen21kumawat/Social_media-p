import { Router } from "express";
import {
  uploadReel,
  deleteReel,
  getReelDetails,
  likeReel,
  unlikeReel,
  commentOnReel,
} from "../controllers/reel.controller.js";
import { verifyJwt } from "../middleware/auth.middleware.js";

const router = Router();

// Reel routes
router.route("/upload").post(verifyJwt, uploadReel);
router.route("/delete/:reelId").delete(verifyJwt, deleteReel);
router.route("/details/:reelId").get(getReelDetails);
router.route("/like/:reelId").post(verifyJwt, likeReel);
router.route("/unlike/:reelId").delete(verifyJwt, unlikeReel);
router.route("/comment/:reelId").post(verifyJwt, commentOnReel);

export default router;
