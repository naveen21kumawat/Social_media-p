import { Story } from "../models/story.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asynHandler.js";
import { uploadOnCloudinary, delteOnCloudinray } from "../utils/cloudinary.js";

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

  // Prepare media object with cloudinary public_id for deletion
  const media = {
    url: mediaUpload.secure_url,
    type: mediaType,
    thumbnail: mediaUpload.secure_url,
    duration: duration || mediaUpload.duration,
    width: width || mediaUpload.width,
    height: height || mediaUpload.height,
    public_id: mediaUpload.public_id, // Store for Cloudinary deletion
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

  // Delete media from Cloudinary
  if (story.media?.public_id) {
    try {
      await delteOnCloudinray(story.media.public_id);
      console.log(`Deleted story media from Cloudinary: ${story.media.public_id}`);
    } catch (error) {
      console.error("Error deleting from Cloudinary:", error);
      // Continue with story deletion even if Cloudinary fails
    }
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
  const currentUserId = req.user._id;

  console.log(`Fetching stories for userId: ${userId}, currentUser: ${currentUserId}`);

  const stories = await Story.find({
    user_id: userId,
    is_deleted: false,
    expires_at: { $gt: new Date() },
  })
    .populate("user_id", "firstName lastName username profilePicture profileImage avatar")
    .sort({ createdAt: -1 });

  console.log(`Found ${stories.length} stories for user ${userId}`);

  // Check privacy settings and transform data
  const filteredStories = stories
    .filter((story) => {
      if (story.privacy === "public") return true;
      if (!currentUserId) return false;
      if (story.user_id._id.toString() === currentUserId.toString()) return true;
      // For now, allow followers privacy stories when viewing user's stories (TODO: Implement proper follow check)
      if (story.privacy === "followers") return true;
      return false;
    })
    .map((story) => ({
      _id: story._id,
      user: {
        _id: story.user_id._id,
        fullName: `${story.user_id.firstName || ""} ${story.user_id.lastName || ""}`.trim(),
        username: story.user_id.username,
        profilePicture: story.user_id.profilePicture || story.user_id.profileImage || story.user_id.avatar,
      },
      media: story.media,
      views_count: story.views_count || 0,
      createdAt: story.createdAt,
      expires_at: story.expires_at,
      reply_settings: story.reply_settings,
      privacy: story.privacy,
    }));

  console.log(`Returning ${filteredStories.length} filtered stories`);

  return res
    .status(200)
    .json(new ApiResponse(200, { stories: filteredStories }, "Stories fetched successfully"));
});

// Get all active stories (feed)
export const getAllStories = asyncHandler(async (req, res) => {
  const currentUserId = req.user._id;
  const { page = 1, limit = 20 } = req.query;

  const pageNum = parseInt(page);
  const limitNum = parseInt(limit);
  const skip = (pageNum - 1) * limitNum;

  // Get all non-expired, non-deleted stories
  const stories = await Story.find({
    is_deleted: false,
    expires_at: { $gt: new Date() },
  })
    .populate("user_id", "firstName lastName username profilePicture profileImage avatar")
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limitNum);

  // Filter by privacy and group by user
  const filteredStories = stories
    .filter((story) => {
      if (story.privacy === "public") return true;
      if (story.user_id._id.toString() === currentUserId.toString()) return true;
      // For now, allow followers privacy stories (TODO: Implement proper follow check)
      if (story.privacy === "followers") return true;
      return false;
    })
    .map((story) => ({
      _id: story._id,
      user: {
        _id: story.user_id._id,
        fullName: `${story.user_id.firstName || ""} ${story.user_id.lastName || ""}`.trim(),
        username: story.user_id.username,
        profilePicture: story.user_id.profilePicture || story.user_id.profileImage || story.user_id.avatar,
      },
      media: story.media,
      views_count: story.views_count || 0,
      createdAt: story.createdAt,
      expires_at: story.expires_at,
      reply_settings: story.reply_settings,
      privacy: story.privacy,
    }));

  // Group stories by user
  const groupedByUser = filteredStories.reduce((acc, story) => {
    const userId = story.user._id.toString();
    if (!acc[userId]) {
      acc[userId] = {
        user: story.user,
        stories: [],
      };
    }
    acc[userId].stories.push(story);
    return acc;
  }, {});

  const storiesFeed = Object.values(groupedByUser);

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { stories: storiesFeed, total: storiesFeed.length },
        "Stories feed fetched successfully"
      )
    );
});

// Cleanup expired stories (to be called by cron job)
export const cleanupExpiredStories = asyncHandler(async (req, res) => {
  try {
    // Find all expired stories that haven't been deleted yet
    const expiredStories = await Story.find({
      expires_at: { $lt: new Date() },
      is_deleted: false,
    });

    console.log(`Found ${expiredStories.length} expired stories to clean up`);

    let deletedCount = 0;
    let cloudinaryDeletedCount = 0;

    for (const story of expiredStories) {
      // Delete from Cloudinary
      if (story.media?.public_id) {
        try {
          await delteOnCloudinray(story.media.public_id);
          cloudinaryDeletedCount++;
          console.log(`Deleted expired story media: ${story.media.public_id}`);
        } catch (error) {
          console.error(`Failed to delete from Cloudinary: ${story.media.public_id}`, error);
        }
      }

      // Mark as deleted in database
      story.is_deleted = true;
      await story.save();
      deletedCount++;
    }

    const message = `Cleaned up ${deletedCount} expired stories (${cloudinaryDeletedCount} from Cloudinary)`;
    console.log(message);

    return res
      ? res.status(200).json(new ApiResponse(200, { deletedCount, cloudinaryDeletedCount }, message))
      : { deletedCount, cloudinaryDeletedCount };
  } catch (error) {
    console.error("Error cleaning up expired stories:", error);
    if (res) {
      throw new ApiError(500, "Failed to cleanup expired stories");
    }
  }
});

// Auto-cleanup function that runs periodically (call this from index.js)
export const startStoryCleanupJob = () => {
  // Run cleanup every hour
  setInterval(async () => {
    console.log("🧹 Running story cleanup job...");
    try {
      await cleanupExpiredStories();
    } catch (error) {
      console.error("Story cleanup job failed:", error);
    }
  }, 60 * 60 * 1000); // Every 1 hour

  // Run immediately on startup
  setTimeout(async () => {
    console.log("🧹 Running initial story cleanup...");
    try {
      await cleanupExpiredStories();
    } catch (error) {
      console.error("Initial story cleanup failed:", error);
    }
  }, 5000); // 5 seconds after startup
};
