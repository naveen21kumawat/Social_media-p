import { Post } from "../models/post.model.js";
import { Reel } from "../models/reel.model.js";
import { Story } from "../models/story.model.js";
import { Followers } from "../models/followers.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asynHandler.js";

// Get home feed
export const getHomeFeed = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { cursor, limit = 20, filter } = req.query;

  // Get list of users the current user follows
  const following = await Followers.find({
    follower_id: userId,
    status: "accepted",
  }).select("following_id");

  const followingIds = following.map((f) => f.following_id);
  followingIds.push(userId); // Include own posts

  const query = {
    user_id: { $in: followingIds },
    is_deleted: false,
    visibility: { $in: ["public", "followers"] },
  };

  // Add cursor-based pagination
  if (cursor) {
    query._id = { $lt: cursor };
  }

  // Apply filters if provided
  if (filter === "photos") {
    query["media.type"] = "image";
  } else if (filter === "videos") {
    query["media.type"] = "video";
  }

  const posts = await Post.find(query)
    .populate("user_id", "firstName lastName username profilePicture")
    .populate("tags", "firstName lastName username")
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

  const nextCursor = posts.length > 0 ? posts[posts.length - 1]._id : null;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        posts,
        nextCursor,
        hasMore: posts.length === parseInt(limit),
      },
      "Home feed fetched successfully"
    )
  );
});

// Get reels feed
export const getReelsFeed = asyncHandler(async (req, res) => {
  const userId = req.user._id;
  const { cursor, limit = 15 } = req.query;

  // Get list of users the current user follows
  const following = await Followers.find({
    follower_id: userId,
    status: "accepted",
  }).select("following_id");

  const followingIds = following.map((f) => f.following_id);
  followingIds.push(userId);

  const query = {
    user_id: { $in: followingIds },
    is_deleted: false,
  };

  if (cursor) {
    query._id = { $lt: cursor };
  }

  const reels = await Reel.find(query)
    .populate("user_id", "firstName lastName username profilePicture")
    .populate("tags", "firstName lastName username")
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

  const nextCursor = reels.length > 0 ? reels[reels.length - 1]._id : null;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        reels,
        nextCursor,
        hasMore: reels.length === parseInt(limit),
      },
      "Reels feed fetched successfully"
    )
  );
});

// Get stories feed (aggregated from following)
export const getStoriesFeed = asyncHandler(async (req, res) => {
  const userId = req.user._id;

  // Get list of users the current user follows
  const following = await Followers.find({
    follower_id: userId,
    status: "accepted",
  }).select("following_id");

  const followingIds = following.map((f) => f.following_id);
  followingIds.push(userId);

  // Get active stories from followed users
  const stories = await Story.aggregate([
    {
      $match: {
        user_id: { $in: followingIds },
        is_deleted: false,
        expires_at: { $gt: new Date() },
      },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $group: {
        _id: "$user_id",
        stories: { $push: "$$ROOT" },
        latestStory: { $first: "$$ROOT" },
      },
    },
    {
      $lookup: {
        from: "users",
        localField: "_id",
        foreignField: "_id",
        as: "user",
      },
    },
    {
      $unwind: "$user",
    },
    {
      $project: {
        user_id: "$_id",
        user: {
          _id: "$user._id",
          firstName: "$user.firstName",
          lastName: "$user.lastName",
          username: "$user.username",
          profilePicture: "$user.profilePicture",
        },
        stories: 1,
        latestStoryTime: "$latestStory.createdAt",
      },
    },
    {
      $sort: { latestStoryTime: -1 },
    },
  ]);

  return res
    .status(200)
    .json(new ApiResponse(200, stories, "Stories feed fetched successfully"));
});

// Get posts by specific user
export const getUserPosts = asyncHandler(async (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.user?._id;
  const { cursor, limit = 20 } = req.query;

  const query = {
    user_id: userId,
    is_deleted: false,
  };

  // If not the owner, only show public or followers posts
  if (!currentUserId || userId !== currentUserId.toString()) {
    query.visibility = "public";
    // TODO: Add check if currentUser follows userId, then show 'followers' posts too
  }

  if (cursor) {
    query._id = { $lt: cursor };
  }

  const posts = await Post.find(query)
    .populate("user_id", "firstName lastName username profilePicture")
    .populate("tags", "firstName lastName username")
    .sort({ createdAt: -1 })
    .limit(parseInt(limit));

  const nextCursor = posts.length > 0 ? posts[posts.length - 1]._id : null;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        posts,
        nextCursor,
        hasMore: posts.length === parseInt(limit),
      },
      "User posts fetched successfully"
    )
  );
});
