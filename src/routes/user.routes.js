import express from "express";
import {
  registerUser,
  verifyRegisterOtp,
  loginUser,
  verifyLoginOtp,
  logOutUser,
  getCurrentUser,
  refreshAccessToken,
  forgotPassword,
  resetPassword,
  changePassword,
  deleteUser,
} from "../controllers/user.controller.js";
import { verifyJwt as verifyRoute } from "../middleware/auth.middleware.js"; // use this to protect routes

const router = express.Router();

// unprotected routes
router.route("/register").post(registerUser);
router.route("/verify-register").post(verifyRegisterOtp);
router.route("/login").post(loginUser);
router.route("/verify-login").post(verifyLoginOtp);
router.route("/refresh-token").post(refreshAccessToken);
router.route("/forgot-password").post(forgotPassword);
router.route("/reset-password").post(resetPassword);

// protected routes
router.route("/logout").post(verifyRoute, logOutUser);
router.route("/current-user").get(verifyRoute, getCurrentUser);
router.route("/change-password").post(verifyRoute, changePassword);
router.route("/delete/:id").delete(verifyRoute, deleteUser);

export { router as userRoutes };
