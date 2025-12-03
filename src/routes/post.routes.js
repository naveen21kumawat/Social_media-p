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

const router = Router();

// Post routes
router.route("/upload").post(verifyJwt, uploadPost);
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
