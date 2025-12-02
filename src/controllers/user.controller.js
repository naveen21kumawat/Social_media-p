import { User } from "../models/user.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asynHandler.js";
import jwt from "jsonwebtoken";
import crypto from "crypto";
import emailService from "../services/email.service.js";
import smsService from "../services/sms.service.js";
import OTPService from "../services/otp.service.js";
import EmailService from "../services/email.service.js";

// Utility function to generate a 6-digit OTP as string
export function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

export const generateAccessAndRefreshTokens = async (userId) => {
  try {
    const user = await User.findById(userId);

    if (!user) {
      throw new ApiError(404, "User not found");
    }

    const accessToken = await user.generateAccessToken();
    const refreshToken = await user.generateRefreshToken();

    user.refreshToken = refreshToken;

    await user.save({ validateBeforeSave: false });
    return { accessToken, refreshToken };
  } catch (error) {
    console.error("Token generation error:", error);
    throw new ApiError(
      500,
      error?.message ||
        "Something went wrong while generating refresh and access tokens"
    );
  }
};

// register user Api (step 1: send OTP)
const registerUser = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, phone, password } = req.body;

  // Validate required fields
  if (!firstName?.trim() || !lastName?.trim() || !password?.trim()) {
    throw new ApiError(400, "First name, last name, and password are required");
  }

  // At least one of email or phone must be provided
  if (!email && !phone) {
    throw new ApiError(400, "Either email or phone number is required");
  }

  // Check if user already exists
  const query = [];
  if (email) query.push({ email });
  if (phone) query.push({ phone });

  const existedUser = await User.findOne({ $or: query });

  if (existedUser) {
    throw new ApiError(409, "User with this email or phone already exists");
  }

  // Generate OTP
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

  // Create user with pending status and OTP
  const user = await User.create({
    firstName,
    lastName,
    email: email || undefined,
    phone: phone || undefined,
    password,
    otp: {
      code: hashedOtp,
      expiresAt: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes
    },
  });

  try {
    // Send OTP via email or SMS based on what's provided
    if (email) {
      await emailService.sendOTPEmail(user.email, otp, "registration");
      return res.status(201).json(
        new ApiResponse(
          201,
          {
            otpSent: true,
            email: user.email,
            userId: user._id,
            method: "email",
          },
          "OTP sent to your email. Please verify within 2 minutes."
        )
      );
    } else if (phone) {
      // Send OTP via SMS
      await smsService.sendOTP(user.phone, otp, "registration");
      return res.status(201).json(
        new ApiResponse(
          201,
          {
            otpSent: true,
            phone: user.phone,
            userId: user._id,
            method: "sms",
          },
          "OTP sent to your phone. Please verify within 2 minutes."
        )
      );
    }
  } catch (error) {
    // If OTP sending fails, delete the user and throw error
    await User.findByIdAndDelete(user._id);
    throw new ApiError(
      500,
      error?.message || "Failed to send OTP. Please try again."
    );
  }
});

// Verify registration OTP (step 2: activate account)
const verifyRegisterOtp = asyncHandler(async (req, res) => {
  const { email, phone, userId, otp } = req.body;
  console.log("Starting");
  if (!otp) {
    throw new ApiError(400, "OTP is required");
  }

  if (!email && !phone && !userId) {
    throw new ApiError(400, "Email, phone, or userId is required");
  }

  const user = userId
    ? await User.findById(userId)
    : await User.findOne({
        $or: [{ email }, { phone }],
      });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  console.log("otppp ----->", user);

  if (!user.otp?.code || !user.otp?.expiresAt) {
    throw new ApiError(400, "No OTP request found for this user");
  }

  if (user.otp.expiresAt.getTime() < Date.now()) {
    user.otp = undefined;
    await user.save({ validateBeforeSave: false });
    throw new ApiError(400, "OTP has expired. Please request a new one.");
  }

  const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

  if (hashedOtp !== user.otp.code) {
    throw new ApiError(400, "Invalid OTP");
  }

  // Activate user account
  user.otp = undefined;
  user.status = "active";
  await user.save({ validateBeforeSave: false });

  const createdUser = await User.findById(user._id).select(
    "-password -refreshToken -otp"
  );

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        createdUser,
        "Account verified and activated successfully"
      )
    );
});

// login user Api (step 1: credentials + send OTP)
const loginUser = asyncHandler(async (req, res) => {
  const { email, phone, password } = req.body;

  if (!email && !phone) {
    throw new ApiError(400, "Email or phone is required");
  }

  if (!password) {
    throw new ApiError(400, "Password is required");
  }

  const user = await User.findOne({
    $or: [{ email }, { phone }],
  }).select("+password");

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  // Check if account is locked
  if (user.isLocked()) {
    throw new ApiError(
      423,
      "Account is temporarily locked. Please try again later."
    );
  }

  // Check if user is active
  if (user.status !== "active") {
    throw new ApiError(
      403,
      "Account is not active. Please contact administrator."
    );
  }

  const isMatch = await user.isPasswordCorrect(password);

  if (!isMatch) {
    // Increment login attempts
    user.loginAttempts += 1;
    if (user.loginAttempts >= 5) {
      user.lockUntil = new Date(Date.now() + 30 * 60 * 1000); // Lock for 30 minutes
    }
    await user.save({ validateBeforeSave: false });
    throw new ApiError(401, "Invalid user credentials");
  }

  // Generate OTP and send email
  const otp = Math.floor(100000 + Math.random() * 900000).toString();
  console.log("Login OTP ------->", otp);
  const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

  user.otp = {
    code: hashedOtp,
    expiresAt: new Date(Date.now() + 2 * 60 * 1000), // 2 minutes
  };
  user.loginAttempts = 0;
  user.lockUntil = undefined;

  await user.save({ validateBeforeSave: false });

  try {
    // Send OTP via email or SMS based on what user has
    if (user.email && email) {
      await emailService.sendOTPEmail(user.email, otp, "login");
      return res.status(200).json(
        new ApiResponse(
          200,
          {
            otpSent: true,
            email: user.email,
            userId: user._id,
            method: "email",
          },
          "OTP sent to your registered email"
        )
      );
    } else if (user.phone && phone) {
      await smsService.sendOTP(user.phone, otp, "login");
      return res.status(200).json(
        new ApiResponse(
          200,
          {
            otpSent: true,
            phone: user.phone,
            userId: user._id,
            method: "sms",
          },
          "OTP sent to your registered phone"
        )
      );
    }
  } catch (error) {
    user.otp = undefined;
    await user.save({ validateBeforeSave: false });
    throw new ApiError(
      500,
      error?.message || "Failed to send OTP. Please try again."
    );
  }
});

// login user Api (step 2: verify OTP + issue tokens)
const verifyLoginOtp = asyncHandler(async (req, res) => {
  const { email, phone, userId, otp } = req.body;

  if (!otp) {
    throw new ApiError(400, "OTP is required");
  }

  if (!email && !phone && !userId) {
    throw new ApiError(400, "Email, phone, or userId is required");
  }

  const user = userId
    ? await User.findById(userId)
    : await User.findOne({
        $or: [{ email }, { phone }],
      });

  if (!user) {
    throw new ApiError(404, "User does not exist");
  }

  if (!user.otp?.code || !user.otp?.expiresAt) {
    throw new ApiError(400, "No OTP request found for this user");
  }

  if (user.otp.expiresAt.getTime() < Date.now()) {
    user.otp = undefined;
    await user.save({ validateBeforeSave: false });
    throw new ApiError(400, "OTP has expired. Please request a new one.");
  }

  const hashedOtp = crypto.createHash("sha256").update(otp).digest("hex");

  if (hashedOtp !== user.otp.code) {
    throw new ApiError(400, "Invalid OTP");
  }

  user.otp = undefined;
  user.lastLogin = new Date();

  await user.save({ validateBeforeSave: false });

  const { accessToken, refreshToken } = await generateAccessAndRefreshTokens(
    user._id
  );

  const loggedInUser = await User.findById(user._id).select(
    "-password -refreshToken -otp"
  );

  const cookieOptions = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
  };

  return res
    .status(200)
    .cookie("accessToken", accessToken, cookieOptions)
    .cookie("refreshToken", refreshToken, cookieOptions)
    .json(
      new ApiResponse(
        200,
        {
          user: loggedInUser,
          accessToken,
          refreshToken,
        },
        "User logged in successfully"
      )
    );
});

// logout user Api
const logOutUser = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  // Decode without verify (ignore expiration)
  let decodedToken;
  try {
    decodedToken = jwt.decode(incomingRefreshToken);
  } catch (error) {
    decodedToken = null;
  }

  if (decodedToken?._id) {
    await User.findByIdAndUpdate(decodedToken._id, {
      $unset: { refreshToken: 1 },
    });
  }

  const cookieOptions = {
    httpOnly: true,
    sameSite: "strict",
    secure: process.env.NODE_ENV === "production",
  };

  return res
    .status(200)
    .clearCookie("accessToken", cookieOptions)
    .clearCookie("refreshToken", cookieOptions)
    .json(new ApiResponse(200, {}, "user logged Out"));
});

// Get current user
const getCurrentUser = asyncHandler(async (req, res) => {
  return res
    .status(200)
    .json(new ApiResponse(200, req.user, "User fetched successfully"));
});

// Refresh access token
const refreshAccessToken = asyncHandler(async (req, res) => {
  const incomingRefreshToken =
    req.cookies?.refreshToken || req.body?.refreshToken;

  if (!incomingRefreshToken) {
    throw new ApiError(401, "Unauthorized request");
  }

  try {
    const decodedToken = jwt.verify(
      incomingRefreshToken,
      process.env.REFRESH_TOKEN_SECRET
    );

    const user = await User.findById(decodedToken?._id).select("+refreshToken");

    if (!user) {
      throw new ApiError(401, "Invalid refresh token");
    }

    if (incomingRefreshToken !== user.refreshToken) {
      throw new ApiError(401, "Refresh token is expired or used");
    }

    const { accessToken, refreshToken: newRefreshToken } =
      await generateAccessAndRefreshTokens(user._id);

    const cookieOptions = {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
    };

    return res
      .status(200)
      .cookie("accessToken", accessToken, cookieOptions)
      .cookie("refreshToken", newRefreshToken, cookieOptions)
      .json(
        new ApiResponse(
          200,
          { accessToken, refreshToken: newRefreshToken },
          "Access token refreshed"
        )
      );
  } catch (error) {
    throw new ApiError(401, error?.message || "Invalid refresh token");
  }
});

// Forgot Password - Send Reset Token (JWT)
const forgotPassword = asyncHandler(async (req, res) => {
  const { email, phone } = req.body;

  if (!email && !phone) {
    throw new ApiError(400, "Email or phone is required");
  }

  const user = await User.findOne({
    $or: [{ email }, { phone }],
  });

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Generate JWT reset token (valid for 15 minutes)
  const resetToken = jwt.sign({ userId: user._id }, process.env.RESET_SECRET, {
    expiresIn: "15m",
  });

  // Send reset link via email with clickable button
  if (
    typeof EmailService.isConfigured === "function" &&
    !EmailService.isConfigured()
  ) {
    throw new ApiError(500, "Email service not configured");
  }
  const resetUrl = `${
    process.env.FRONTEND_URL || "http://localhost:4444"
  }/api/v1/users/reset-password?token=${resetToken}`;
  await EmailService.sendPasswordResetEmail(user.email, resetUrl);

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        message: "Password reset link sent to your email",
        // resetToken, // For testing; in production, do not send token in response
        expiresIn: 900,
      },
      "Password reset link sent"
    )
  );
});

const resetPassword = asyncHandler(async (req, res) => {
  const { token } = req.query;
  const { newPassword } = req.body;

  if (!token) {
    throw new ApiError(400, "Reset token is required");
  }

  if (!newPassword) {
    throw new ApiError(400, "New password is required");
  }

  if (newPassword.length < 6) {
    throw new ApiError(400, "Password must be at least 6 characters long");
  }

  // Verify the JWT token
  let decoded;
  try {
    decoded = jwt.verify(token, process.env.RESET_SECRET);
  } catch (error) {
    throw new ApiError(400, "Invalid or expired reset token");
  }

  const user = await User.findById(decoded.userId).select("+password");
  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Save new password
  user.password = newPassword;
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password reset successfully"));
});

const changePassword = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { currentPassword, newPassword } = req.body;

  if (!currentPassword || !newPassword) {
    throw new ApiError(400, "Current and new passwords are required");
  }

  const user = await User.findById(userId).select("+password");

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  const isMatch = await user.isPasswordCorrect(currentPassword);
  if (!isMatch) {
    throw new ApiError(401, "Current password is incorrect");
  }

  user.password = newPassword;
  await user.save();

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "Password changed successfully"));
});

const deleteUser = asyncHandler(async (req, res) => {
  const userId = req.params.id;

  const user = await User.findByIdAndDelete(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  return res
    .status(200)
    .json(new ApiResponse(200, {}, "User deleted successfully"));
});


const updateProfile = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { firstName, lastName, bio, profile_type, coverPhoto } = req.body;
 
  // to do
  // image will upload into s3 buket or something else then extract the url and save into db

  const user = await User.findById(userId);

  if (!user) {
    throw new ApiError(404, "User not found");
  }

  // Update fields if provided
  if (firstName) user.firstName = firstName;
  if (lastName) user.lastName = lastName;
  if (bio !== undefined) user.bio = bio;
  if (profile_type) user.profile_type = profile_type;
  if (coverPhoto) user.coverPhoto = coverPhoto;

  await user.save();

  const updatedUser = await User.findById(userId).select(
    "-password -refreshToken -otp"
  );

  return res
    .status(200)
    .json(new ApiResponse(200, updatedUser, "Profile updated successfully"));
});

export {
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
  updateProfile,
};
