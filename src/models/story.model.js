import mongoose from "mongoose";

const storySchema = new mongoose.Schema(
  {
    user_id: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    media: {
      type: {
        type: String,
        enum: ["image", "video"],
        required: true,
      },
      url: {
        type: String,
        required: true,
      },
      thumbnail: String,
      duration: Number,
      width: Number,
      height: Number,
      public_id: String, // Cloudinary public_id for deletion
    },
    reply_settings: {
      type: String,
      enum: ["everyone", "followers", "off"],
      default: "everyone",
    },
    privacy: {
      type: String,
      enum: ["public", "followers", "close_friends"],
      default: "followers",
    },
    views_count: {
      type: Number,
      default: 0,
    },
    expires_at: {
      type: Date,
      required: true,
      index: true,
    },
    is_deleted: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Auto-expire after 24 hours
storySchema.index({ expires_at: 1 }, { expireAfterSeconds: 0 });
storySchema.index({ user_id: 1, createdAt: -1 });

export const Story = mongoose.model("Story", storySchema);
