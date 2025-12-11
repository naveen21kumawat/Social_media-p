import { Reel } from "../models/reel.model.js";
import { Like } from "../models/like.model.js";
import { Comment } from "../models/comment.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asynHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

// Upload a reel
export const uploadReel = asyncHandler(async (req, res) => {
  const { caption, music_id, tags, thumbnail, duration, width, height } = req.body;
  const userId = req.user?._id;

  if (!req.file) {
    throw new ApiError(400, "Video file is required");
  }

  // Upload video to Cloudinary
  const videoUpload = await uploadOnCloudinary(req.file.path);

  if (!videoUpload) {
    throw new ApiError(500, "Failed to upload video to Cloudinary");
  }

  // Prepare media object
  const media = {
    url: videoUpload.secure_url,
    thumbnail: thumbnail || videoUpload.secure_url.replace(/\.[^.]+$/, '.jpg'), // Auto-generate thumbnail
    duration: duration || videoUpload.duration,
    width: width || videoUpload.width,
    height: height || videoUpload.height,
  };

  const reel = await Reel.create({
    user_id: userId,
    media,
    caption,
    music_id,
    tags: tags ? JSON.parse(tags) : [],
  });

  return res
    .status(201)
    .json(new ApiResponse(201, reel, "Reel uploaded successfully"));
});

// Delete a reel
export const deleteReel = asyncHandler(async (req, res) => {
  const { reelId } = req.params;
  const userId = req.user._id;

  const reel = await Reel.findById(reelId);

  if (!reel || reel.is_deleted) {
    throw new ApiError(404, "Reel not found");
  }

  // Check if user is owner
  if (reel.user_id.toString() !== userId.toString()) {
    throw new ApiError(403, "You are not authorized to delete this reel");
  }

  reel.is_deleted = true;
  await reel.save();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Reel deleted successfully"));
});

// Get reel details
export const getReelDetails = asyncHandler(async (req, res) => {
  const { reelId } = req.params;

  const reel = await Reel.findOne({ _id: reelId, is_deleted: false })
    .populate("user_id", "firstName lastName username profilePicture")
    .populate("tags", "firstName lastName username");

  if (!reel) {
    throw new ApiError(404, "Reel not found");
  }

  // Get comments for this reel
  const comments = await Comment.find({
    target_type: "reel",
    target_id: reelId,
    is_deleted: false,
    reply_to_comment_id: null,
  })
    .populate("user_id", "firstName lastName username profilePicture")
    .sort({ createdAt: -1 })
    .limit(10);

  const reelData = reel.toObject();
  reelData.comments = comments;

  // Check if current user liked this reel
  const userId = req.user?._id;
  if (userId) {
    const liked = await Like.findOne({
      user_id: userId,
      target_type: "reel",
      target_id: reelId,
    });
    reelData.is_liked = !!liked;
  }

  return res
    .status(200)
    .json(new ApiResponse(200, reelData, "Reel details fetched successfully"));
});

// Like a reel
export const likeReel = asyncHandler(async (req, res) => {
  const { reelId } = req.params;
  const userId = req.user._id;

  const reel = await Reel.findOne({ _id: reelId, is_deleted: false });

  if (!reel) {
    throw new ApiError(404, "Reel not found");
  }

  // Check if already liked
  const existingLike = await Like.findOne({
    user_id: userId,
    target_type: "reel",
    target_id: reelId,
  });

  if (existingLike) {
    throw new ApiError(400, "You already liked this reel");
  }

  await Like.create({
    user_id: userId,
    target_type: "reel",
    target_id: reelId,
  });

  // Increment likes count
  reel.likes_count += 1;
  await reel.save();

  return res
    .status(200)
    .json(new ApiResponse(200, { likes_count: reel.likes_count }, "Reel liked successfully"));
});

// Unlike a reel
export const unlikeReel = asyncHandler(async (req, res) => {
  const { reelId } = req.params;
  const userId = req.user._id;

  const like = await Like.findOneAndDelete({
    user_id: userId,
    target_type: "reel",
    target_id: reelId,
  });

  if (!like) {
    throw new ApiError(404, "Like not found");
  }

  // Decrement likes count
  const reel = await Reel.findById(reelId);
  if (reel && reel.likes_count > 0) {
    reel.likes_count -= 1;
    await reel.save();
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Reel unliked successfully"));
});

// Add comment to a reel
export const commentOnReel = asyncHandler(async (req, res) => {
  const { reelId } = req.params;
  const { text, reply_to_comment_id, media } = req.body;
  const userId = req.user._id;

  if (!text || text.trim().length === 0) {
    throw new ApiError(400, "Comment text is required");
  }

  const reel = await Reel.findOne({ _id: reelId, is_deleted: false });

  if (!reel) {
    throw new ApiError(404, "Reel not found");
  }

  if (reply_to_comment_id) {
    const parentComment = await Comment.findById(reply_to_comment_id);
    if (!parentComment) {
      throw new ApiError(404, "Parent comment not found");
    }
  }

  const comment = await Comment.create({
    user_id: userId,
    target_type: "reel",
    target_id: reelId,
    text,
    reply_to_comment_id,
    media,
  });

  // Increment comment count
  reel.comments_count += 1;
  await reel.save();

  if (reply_to_comment_id) {
    await Comment.findByIdAndUpdate(reply_to_comment_id, {
      $inc: { replies_count: 1 },
    });
  }

  const populatedComment = await Comment.findById(comment._id).populate(
    "user_id",
    "firstName lastName username profilePicture"
  );

  return res
    .status(201)
    .json(new ApiResponse(201, populatedComment, "Comment added successfully"));
});
