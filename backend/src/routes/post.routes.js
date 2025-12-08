import { Router } from "express";
import {
  uploadPost,
  deletePost,
  getPostDetails,
  likePost,
  unlikePost,
  commentOnPost,
  deleteComment,
  sharePost,
  savePost,
  reportPost,
} from "../controllers/post.controller.js";
import { verifyJwt } from "../middleware/auth.middleware.js";
import { uploadMultiple, handleUploadError } from "../middleware/upload.middleware.js";

const router = Router();

// Post routes - uploadMultiple handles up to 10 files (images/videos)
router.route("/upload").post(verifyJwt, uploadMultiple, handleUploadError, uploadPost);

// seaerch posts b title route will be here -
// router.route("/search").get(verifyJwt, getPostDetails);
router.route("/delete/:postId").delete(verifyJwt, deletePost);
router.route("/details/:postId").get(getPostDetails);
router.route("/like/:postId").post(verifyJwt, likePost);
router.route("/unlike/:postId").delete(verifyJwt, unlikePost);
router.route("/comment/:postId").post(verifyJwt, commentOnPost);
router.route("/comment/:commentId").delete(verifyJwt, deleteComment);
router.route("/share/:postId").post(verifyJwt, sharePost);
router.route("/save/:postId").post(verifyJwt, savePost);
router.route("/report/:postId").post(verifyJwt, reportPost);

export default router;
