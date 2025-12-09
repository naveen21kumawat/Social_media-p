import { Router } from "express";
import {
  uploadStory,
  deleteStory,
  getUserStories,
} from "../controllers/story.controller.js";
import { verifyJwt } from "../middleware/auth.middleware.js";
import { uploadSingle, handleUploadError } from "../middleware/upload.middleware.js";

const router = Router();

// Story routes
router.route("/upload").post(verifyJwt, uploadSingle, handleUploadError, uploadStory);
router.route("/delete/:storyId").delete(verifyJwt, deleteStory);
router.route("/user/:userId").get(getUserStories);

export default router;
