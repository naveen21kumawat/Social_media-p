import { Followers } from "../models/followers.model.js";
import { User } from "../models/user.model.js";
import ApiResponse from "../utils/ApiResponse.js";
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asynHandler.js";

// POST /follow/request/:targetUserId - Send follow request
const sendFollowRequest = asyncHandler(async (req, res) => {
  const { targetUserId } = req.params;
  const currentUserId = req.user._id;

  // Validate target user ID
  if (!targetUserId) {
    throw new ApiError(400, "Target user ID is required");
  }

  // Check if trying to follow self
  if (currentUserId.toString() === targetUserId) {
    throw new ApiError(400, "You cannot follow yourself");
  }

  // Check if target user exists
  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    throw new ApiError(404, "Target user not found");
  }

  // Check if target user is active
  if (targetUser.status !== "active") {
    throw new ApiError(403, "Cannot follow this user");
  }

  // Check if already following or request exists
  const existingFollow = await Followers.findOne({
    follower_id: currentUserId,
    following_id: targetUserId,
  });

  if (existingFollow) {
    if (existingFollow.status === "accepted") {
      throw new ApiError(400, "You are already following this user");
    } else {
      throw new ApiError(400, "Follow request already sent");
    }
  }

  // Determine status based on account privacy
  const status = targetUser.isPrivate ? "requested" : "accepted";

  // Create follow relationship
  const followRequest = await Followers.create({
    follower_id: currentUserId,
    following_id: targetUserId,
    status,
  });

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        followRequest,
        autoApproved: !targetUser.isPrivate,
      },
      targetUser.isPrivate
        ? "Follow request sent successfully"
        : "Now following user"
    )
  );
});

// POST /follow/accept/:requestId - Accept follow request
const acceptFollowRequest = asyncHandler(async (req, res) => {
  const { requestId } = req.params;
  const currentUserId = req.user._id;

  // Find the follow request
  const followRequest = await Followers.findById(requestId);

  if (!followRequest) {
    throw new ApiError(404, "Follow request not found");
  }

  // Verify the current user is the target of the request
  if (followRequest.following_id.toString() !== currentUserId.toString()) {
    throw new ApiError(403, "You can only accept requests sent to you");
  }

  // Check if already accepted
  if (followRequest.status === "accepted") {
    throw new ApiError(400, "Follow request already accepted");
  }

  // Update status to accepted
  followRequest.status = "accepted";
  await followRequest.save();

  return res.status(200).json(
    new ApiResponse(
      200,
      { followRequest },
      "Follow request accepted successfully"
    )
  );
});

// DELETE /follow/remove/:targetUserId - Unfollow or remove follower
const removeFollow = asyncHandler(async (req, res) => {
  const { targetUserId } = req.params;
  const { action } = req.query; // action: 'unfollow' or 'remove-follower'
  const currentUserId = req.user._id;

  if (!targetUserId) {
    throw new ApiError(400, "Target user ID is required");
  }

  if (!action || !["unfollow", "remove-follower"].includes(action)) {
    throw new ApiError(
      400,
      "Valid action is required: 'unfollow' or 'remove-follower'"
    );
  }

  let followRecord;

  if (action === "unfollow") {
    // Current user wants to unfollow target user
    followRecord = await Followers.findOneAndDelete({
      follower_id: currentUserId,
      following_id: targetUserId,
    });

    if (!followRecord) {
      throw new ApiError(404, "You are not following this user");
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        { unfollowed: targetUserId },
        "Successfully unfollowed user"
      )
    );
  } else if (action === "remove-follower") {
    // Current user wants to remove target user as a follower
    followRecord = await Followers.findOneAndDelete({
      follower_id: targetUserId,
      following_id: currentUserId,
    });

    if (!followRecord) {
      throw new ApiError(404, "This user is not following you");
    }

    return res.status(200).json(
      new ApiResponse(
        200,
        { removed: targetUserId },
        "Successfully removed follower"
      )
    );
  }
});

// GET /follow/status/:targetUserId - Get follow relationship status
const getFollowStatus = asyncHandler(async (req, res) => {
  const { targetUserId } = req.params;
  const currentUserId = req.user._id;

  if (!targetUserId) {
    throw new ApiError(400, "Target user ID is required");
  }

  // Check if current user follows target
  const following = await Followers.findOne({
    follower_id: currentUserId,
    following_id: targetUserId,
  });

  // Check if target follows current user
  const follower = await Followers.findOne({
    follower_id: targetUserId,
    following_id: currentUserId,
  });

  let status = "not-following";

  if (following && following.status === "accepted" && follower && follower.status === "accepted") {
    status = "follow-back"; // Both follow each other
  } else if (following && following.status === "accepted") {
    status = "following"; // Current user follows target
  } else if (following && following.status === "requested") {
    status = "requested"; // Current user requested to follow target
  } else if (follower && follower.status === "accepted") {
    status = "follower"; // Target follows current user
  }

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        status,
        following: following ? { id: following._id, status: following.status } : null,
        follower: follower ? { id: follower._id, status: follower.status } : null,
      },
      "Follow status retrieved successfully"
    )
  );
});

// POST /follow/follow-back/:targetUserId - Follow back a user
const followBack = asyncHandler(async (req, res) => {
  const { targetUserId } = req.params;
  const currentUserId = req.user._id;

  if (!targetUserId) {
    throw new ApiError(400, "Target user ID is required");
  }

  // Check if target user exists
  const targetUser = await User.findById(targetUserId);
  if (!targetUser) {
    throw new ApiError(404, "Target user not found");
  }

  // Verify that target user follows current user
  const isFollower = await Followers.findOne({
    follower_id: targetUserId,
    following_id: currentUserId,
    status: "accepted",
  });

  if (!isFollower) {
    throw new ApiError(400, "This user is not following you");
  }

  // Check if already following back
  const alreadyFollowing = await Followers.findOne({
    follower_id: currentUserId,
    following_id: targetUserId,
  });

  if (alreadyFollowing) {
    if (alreadyFollowing.status === "accepted") {
      throw new ApiError(400, "You are already following this user");
    } else {
      throw new ApiError(400, "Follow request already sent");
    }
  }

  // Create follow back relationship (auto-approve since they follow us)
  const status = targetUser.isPrivate ? "requested" : "accepted";

  const followBack = await Followers.create({
    follower_id: currentUserId,
    following_id: targetUserId,
    status,
  });

  return res.status(201).json(
    new ApiResponse(
      201,
      {
        followBack,
        autoApproved: !targetUser.isPrivate,
      },
      targetUser.isPrivate
        ? "Follow request sent successfully"
        : "Successfully followed back"
    )
  );
});

// GET /follow/suggestions - Get follow suggestions
const getFollowSuggestions = asyncHandler(async (req, res) => {
  const currentUserId = req.user._id;
  const { limit = 10, cursor } = req.query;

  // Get users current user is already following
  const following = await Followers.find({
    follower_id: currentUserId,
    status: "accepted",
  }).select("following_id");

  const followingIds = following.map((f) => f.following_id);
  followingIds.push(currentUserId); // Exclude self

  // Build query
  const query = {
    _id: { $nin: followingIds },
    status: "active",
  };

  if (cursor) {
    query._id = { ...query._id, $lt: cursor };
  }

  // Get mutual followers (people who follow users that current user follows)
  const mutualFollowers = await Followers.aggregate([
    {
      $match: {
        following_id: { $in: followingIds.slice(0, -1) }, // Exclude self from followingIds
        status: "accepted",
      },
    },
    {
      $group: {
        _id: "$follower_id",
        mutualCount: { $sum: 1 },
      },
    },
    {
      $match: {
        _id: { $nin: followingIds },
      },
    },
    { $sort: { mutualCount: -1 } },
    { $limit: parseInt(limit) },
  ]);

  const mutualFollowerIds = mutualFollowers.map((m) => m._id);

  // Get suggested users (prioritize mutual followers)
  let suggestions = await User.find({
    _id: { $in: mutualFollowerIds },
  })
    .select("firstName lastName email phone avatar profileImage bio isPrivate")
    .limit(parseInt(limit));

  // If not enough mutual followers, add random active users
  if (suggestions.length < parseInt(limit)) {
    const remaining = parseInt(limit) - suggestions.length;
    const additionalUsers = await User.find({
      ...query,
      _id: { $nin: [...followingIds, ...mutualFollowerIds] },
    })
      .select("firstName lastName email phone avatar profileImage bio isPrivate")
      .limit(remaining)
      .sort({ createdAt: -1 });

    suggestions = [...suggestions, ...additionalUsers];
  }

  // Add mutual connection count
  suggestions = suggestions.map((user) => {
    const mutual = mutualFollowers.find(
      (m) => m._id.toString() === user._id.toString()
    );
    return {
      ...user.toObject(),
      mutualConnectionsCount: mutual ? mutual.mutualCount : 0,
    };
  });

  const nextCursor =
    suggestions.length > 0
      ? suggestions[suggestions.length - 1]._id
      : null;

  return res.status(200).json(
    new ApiResponse(
      200,
      {
        suggestions,
        nextCursor,
        hasMore: suggestions.length === parseInt(limit),
      },
      "Follow suggestions retrieved successfully"
    )
  );
});

export {
  sendFollowRequest,
  acceptFollowRequest,
  removeFollow,
  getFollowStatus,
  followBack,
  getFollowSuggestions,
};
