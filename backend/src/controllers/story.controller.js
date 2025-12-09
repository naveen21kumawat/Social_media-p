import { Story } from "../models/story.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asynHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

// Upload a story
export const uploadStory = asyncHandler(async (req, res) => {
  const { reply_settings, privacy, duration, width, height } = req.body;
  const userId = req.user._id;

  if (!req.file) {
    throw new ApiError(400, "Media file (image/video) is required");
  }

  // Upload media to Cloudinary
  const mediaUpload = await uploadOnCloudinary(req.file.path);

  if (!mediaUpload) {
    throw new ApiError(500, "Failed to upload media to Cloudinary");
  }

  // Determine media type
  const mediaType = mediaUpload.resource_type === "video" ? "video" : "image";

  // Prepare media object
  const media = {
    url: mediaUpload.secure_url,
    type: mediaType,
    thumbnail: mediaUpload.secure_url,
    duration: duration || mediaUpload.duration,
    width: width || mediaUpload.width,
    height: height || mediaUpload.height,
  };

  // Set expiry to 24 hours from now
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);

  const story = await Story.create({
    user_id: userId,
    media,
    reply_settings: reply_settings || "everyone",
    privacy: privacy || "followers",
    expires_at: expiresAt,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, story, "Story uploaded successfully"));
});

// Delete a story
export const deleteStory = asyncHandler(async (req, res) => {
  const { storyId } = req.params;
  const userId = req.user._id;

  const story = await Story.findById(storyId);

  if (!story || story.is_deleted) {
    throw new ApiError(404, "Story not found");
  }

  // Check if user is owner
  if (story.user_id.toString() !== userId.toString()) {
    throw new ApiError(403, "You are not authorized to delete this story");
  }

  story.is_deleted = true;
  await story.save();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Story deleted successfully"));
});

// Get user's active stories
export const getUserStories = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.user?._id;

  const stories = await Story.find({
    user_id: userId,
    is_deleted: false,
    expires_at: { $gt: new Date() },
  })
    .populate("user_id", "firstName lastName username profilePicture")
    .sort({ createdAt: -1 });

  // Check privacy settings
  const filteredStories = stories.filter((story) => {
    if (story.privacy === "public") return true;
    if (!currentUserId) return false;
    if (story.user_id._id.toString() === currentUserId.toString()) return true;
    // TODO: Check if currentUser follows the story owner for 'followers' privacy
    return story.privacy === "public";
  });

  return res
    .status(200)
    .json(new ApiResponse(200, filteredStories, "Stories fetched successfully"));
});
