import { Post } from "../models/post.model.js";
import { Like } from "../models/like.model.js";
import { Comment } from "../models/comment.model.js";
import { Save } from "../models/save.model.js";
import { Report } from "../models/report.model.js";
import ApiError from "../utils/ApiError.js";
import ApiResponse from "../utils/ApiResponse.js";
import asyncHandler from "../utils/asynHandler.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";

// Upload a new post
export const uploadPost = asyncHandler(async (req, res) => {
  const { caption, tags, location, visibility } = req.body;
  const userId = req.user._id; // User who is uploading the post

  // Get uploaded files from multer (temporary local files)
  const files = req.files;

  if (!files || files.length === 0) {
    throw new ApiError(
      400,
      "At least one media file (image/video) is required"
    );
  }

  // Upload each file to Cloudinary and get URLs
  const mediaUploadPromises = files.map(async (file) => {
    const fileType = file.mimetype.startsWith("image/") ? "image" : "video";

    // Upload to Cloudinary
    const cloudinaryResponse = await uploadOnCloudinary(file.path);

    if (!cloudinaryResponse) {
      throw new ApiError(500, `Failed to upload ${fileType}`);
    }

    return {
      type: fileType,
      url: cloudinaryResponse.secure_url, // Cloudinary URL
      thumbnail:
        cloudinaryResponse.thumbnail_url || cloudinaryResponse.secure_url,
      width: cloudinaryResponse.width,
      height: cloudinaryResponse.height,
      duration: cloudinaryResponse.duration || null, // For videos
      public_id: cloudinaryResponse.public_id, // Store for deletion later
    };
  });

  // Wait for all uploads to complete
  const media = await Promise.all(mediaUploadPromises);

  // Parse tags if it's a JSON string
  let parsedTags = tags;
  if (typeof tags === "string") {
    try {
      parsedTags = JSON.parse(tags);
    } catch (error) {
      parsedTags = tags.split(",").map((tag) => tag.trim());
    }
  }

  // Parse location if it's a JSON string
  let parsedLocation = location;
  if (typeof location === "string" && location.trim() !== "") {
    try {
      parsedLocation = JSON.parse(location);
    } catch (error) {
      parsedLocation = { name: location };
    }
  }

  // Create post in database with user_id (who uploaded this)
  const post = await Post.create({
    user_id: userId, // This tracks who uploaded the post
    caption: caption || "",
    media, // Array of Cloudinary URLs with metadata
    tags: parsedTags || [],
    location: parsedLocation || null,
    visibility: visibility || "public",
  });

  // Populate user details to show who created this post
  await post.populate("user_id", "firstName lastName username profilePicture");

  return res
    .status(201)
    .json(
      new ApiResponse(201, post, "Post uploaded successfully to Cloudinary")
    );
});

// Delete a post
export const deletePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const userId = req.user._id;

  const post = await Post.findById(postId);

  if (!post || post.is_deleted) {
    throw new ApiError(404, "Post not found");
  }

  // Check if user is owner
  if (post.user_id.toString() !== userId.toString()) {
    throw new ApiError(403, "You are not authorized to delete this post");
  }

  post.is_deleted = true;
  await post.save();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Post deleted successfully"));
});

// Get post details
export const getPostDetails = asyncHandler(async (req, res) => {
  const { postId } = req.params;

  const post = await Post.findOne({ _id: postId, is_deleted: false })
    .populate("user_id", "firstName lastName username profilePicture")
    .populate("tags", "firstName lastName username");

  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  // Check visibility
  const userId = req.user?._id;
  if (
    post.visibility === "private" &&
    post.user_id._id.toString() !== userId?.toString()
  ) {
    throw new ApiError(403, "You don't have access to this post");
  }

  // Get comments for this post
  const comments = await Comment.find({
    target_type: "post",
    target_id: postId,
    is_deleted: false,
    reply_to_comment_id: null,
  })
    .populate("user_id", "firstName lastName username profilePicture")
    .sort({ createdAt: -1 })
    .limit(10);

  const postData = post.toObject();
  postData.comments = comments;

  // Check if current user liked this post
  if (userId) {
    const liked = await Like.findOne({
      user_id: userId,
      target_type: "post",
      target_id: postId,
    });
    postData.is_liked = !!liked;
  }

  return res
    .status(200)
    .json(new ApiResponse(200, postData, "Post details fetched successfully"));
});

// Like a post
export const likePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const userId = req.user._id;

  const post = await Post.findOne({ _id: postId, is_deleted: false });

  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  // Check if already liked
  const existingLike = await Like.findOne({
    user_id: userId,
    target_type: "post",
    target_id: postId,
  });

  if (existingLike) {
    throw new ApiError(400, "You already liked this post");
  }

  // Create like
  await Like.create({
    user_id: userId,
    target_type: "post",
    target_id: postId,
  });

  // Increment likes count
  post.likes_count += 1;
  await post.save();

  // TODO: Trigger notification to post owner

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { likes_count: post.likes_count },
        "Post liked successfully"
      )
    );
});

// Unlike a post
export const unlikePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const userId = req.user._id;

  const like = await Like.findOneAndDelete({
    user_id: userId,
    target_type: "post",
    target_id: postId,
  });

  if (!like) {
    throw new ApiError(404, "Like not found");
  }

  // Decrement likes count
  const post = await Post.findById(postId);
  if (post && post.likes_count > 0) {
    post.likes_count -= 1;
    await post.save();
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Post unliked successfully"));
});

// Add comment to a post
export const commentOnPost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { text, reply_to_comment_id, media } = req.body;
  const userId = req.user._id;

  if (!text || text.trim().length === 0) {
    throw new ApiError(400, "Comment text is required");
  }

  const post = await Post.findOne({ _id: postId, is_deleted: false });

  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  // If replying to a comment, verify it exists
  if (reply_to_comment_id) {
    const parentComment = await Comment.findById(reply_to_comment_id);
    if (!parentComment) {
      throw new ApiError(404, "Parent comment not found");
    }
  }

  const comment = await Comment.create({
    user_id: userId,
    target_type: "post",
    target_id: postId,
    text,
    reply_to_comment_id,
    media,
  });

  // Increment comment count
  post.comments_count += 1;
  await post.save();

  // If it's a reply, increment replies count on parent
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

// Delete a comment
export const deleteComment = asyncHandler(async (req, res) => {
  const { commentId } = req.params;
  const userId = req.user._id;

  const comment = await Comment.findById(commentId);

  if (!comment || comment.is_deleted) {
    throw new ApiError(404, "Comment not found");
  }

  // Check if user is comment owner or post owner
  const post = await Post.findById(comment.target_id);
  const isOwner = comment.user_id.toString() === userId.toString();
  const isPostOwner = post?.user_id.toString() === userId.toString();

  if (!isOwner && !isPostOwner) {
    throw new ApiError(403, "You are not authorized to delete this comment");
  }

  comment.is_deleted = true;
  await comment.save();

  // Decrement comment count
  if (post && post.comments_count > 0) {
    post.comments_count -= 1;
    await post.save();
  }

  // If it's a reply, decrement parent's replies count
  if (comment.reply_to_comment_id) {
    await Comment.findByIdAndUpdate(comment.reply_to_comment_id, {
      $inc: { replies_count: -1 },
    });
  }

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Comment deleted successfully"));
});

// Share a post
export const sharePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { target, caption } = req.body;
  const userId = req.user._id;

  const post = await Post.findOne({ _id: postId, is_deleted: false });

  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  // Increment shares count
  post.shares_count += 1;
  await post.save();

  // TODO: Implement actual sharing logic based on target (feed/story/external)
  // For now, just increment the counter

  return res
    .status(200)
    .json(
      new ApiResponse(
        200,
        { shares_count: post.shares_count },
        "Post shared successfully"
      )
    );
});

// Save a post
export const savePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const userId = req.user._id;

  const post = await Post.findOne({ _id: postId, is_deleted: false });

  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  // Check if already saved
  const existingSave = await Save.findOne({
    user_id: userId,
    target_type: "post",
    target_id: postId,
  });

  if (existingSave) {
    throw new ApiError(400, "Post already saved");
  }

  await Save.create({
    user_id: userId,
    target_type: "post",
    target_id: postId,
  });

  // Increment saves count
  post.saves_count += 1;
  await post.save();

  return res
    .status(200)
    .json(new ApiResponse(200, null, "Post saved successfully"));
});

// Report a post
export const reportPost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const { reason, details, attachments } = req.body;
  const userId = req.user._id;

  if (!reason) {
    throw new ApiError(400, "Reason is required");
  }

  const post = await Post.findOne({ _id: postId, is_deleted: false });

  if (!post) {
    throw new ApiError(404, "Post not found");
  }

  const report = await Report.create({
    user_id: userId,
    target_type: "post",
    target_id: postId,
    reason,
    details,
    attachments,
  });

  return res
    .status(201)
    .json(new ApiResponse(201, report, "Post reported successfully"));
});
