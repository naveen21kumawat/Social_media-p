import express from 'express';
import { registerUser, loginUser } from '../controllers/user.controller.js';
import { verifyJwt as verifyRoute } from "../middleware/auth.middleware.js"; // use this to protect routes

const router = express.Router();


// unprotected routes
router.route("/register").post(registerUser);
router.route("/login").post(loginUser);


// protected routes

export { router as userRoutes };


