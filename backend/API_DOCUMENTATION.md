# Posts, Stories, Reels & Feeds API Documentation

## Base URL
`http://localhost:8000/api/v1`

---

## Posts API

### 1. Upload Post
- **Endpoint**: `POST /post/upload`
- **Auth**: Required
- **Description**: Upload a new feed post with text, images, or video
- **Body**:
  ```json
  {
    "caption": "Your caption here",
    "media": [
      {
        "type": "image",
        "url": "https://example.com/image.jpg",
        "thumbnail": "https://example.com/thumb.jpg",
        "width": 1080,
        "height": 1080
      }
    ],
    "tags": ["userId1", "userId2"],
    "location": {
      "name": "New York",
      "latitude": 40.7128,
      "longitude": -74.0060
    },
    "visibility": "public"
  }
  ```

### 2. Delete Post
- **Endpoint**: `DELETE /post/delete/:postId`
- **Auth**: Required (owner only)
- **Description**: Soft delete a post

### 3. Get Post Details
- **Endpoint**: `GET /post/details/:postId`
- **Auth**: Conditional
- **Description**: Fetch post metadata, media URLs, comments, likes count

### 4. Like Post
- **Endpoint**: `POST /post/like/:postId`
- **Auth**: Required
- **Description**: Like a post (triggers notification)

### 5. Unlike Post
- **Endpoint**: `DELETE /post/unlike/:postId`
- **Auth**: Required
- **Description**: Remove like from a post

### 6. Comment on Post
- **Endpoint**: `POST /post/comment/:postId`
- **Auth**: Required
- **Description**: Add comment to a post, supports replies
- **Body**:
  ```json
  {
    "text": "Your comment here",
    "reply_to_comment_id": "commentId",
    "media": "https://example.com/media.jpg"
  }
  ```

### 7. Delete Comment
- **Endpoint**: `DELETE /post/comment/:commentId`
- **Auth**: Required (owner, post owner, or admin)
- **Description**: Delete a comment

### 8. Share Post
- **Endpoint**: `POST /post/share/:postId`
- **Auth**: Required
- **Description**: Share a post
- **Body**:
  ```json
  {
    "target": "feed",
    "caption": "Check this out!"
  }
  ```

### 9. Save Post
- **Endpoint**: `POST /post/save/:postId`
- **Auth**: Required
- **Description**: Save post to user's collection

### 10. Report Post
- **Endpoint**: `POST /post/report/:postId`
- **Auth**: Required
- **Description**: Report content for moderation
- **Body**:
  ```json
  {
    "reason": "spam",
    "details": "This is spam content",
    "attachments": ["evidence_url"]
  }
  ```

---

## Stories API

### 11. Upload Story
- **Endpoint**: `POST /story/upload`
- **Auth**: Required
- **Description**: Upload story (auto-expires after 24 hours)
- **Body**:
  ```json
  {
    "media": {
      "type": "image",
      "url": "https://example.com/story.jpg",
      "thumbnail": "https://example.com/thumb.jpg",
      "duration": 5
    },
    "reply_settings": "everyone",
    "privacy": "followers"
  }
  ```

### 12. Delete Story
- **Endpoint**: `DELETE /story/delete/:storyId`
- **Auth**: Required (owner only)
- **Description**: Remove story

### 13. Get User Stories
- **Endpoint**: `GET /story/user/:userId`
- **Auth**: Conditional
- **Description**: Get active stories for a user

---

## Reels API

### 14. Upload Reel
- **Endpoint**: `POST /reel/upload`
- **Auth**: Required
- **Description**: Upload reel video
- **Body**:
  ```json
  {
    "media": {
      "url": "https://example.com/reel.mp4",
      "thumbnail": "https://example.com/thumb.jpg",
      "duration": 30,
      "width": 1080,
      "height": 1920
    },
    "caption": "Check out this reel!",
    "music_id": "music123",
    "tags": ["userId1", "userId2"]
  }
  ```

### 15. Delete Reel
- **Endpoint**: `DELETE /reel/delete/:reelId`
- **Auth**: Required (owner only)
- **Description**: Delete reel

### 16. Get Reel Details
- **Endpoint**: `GET /reel/details/:reelId`
- **Auth**: Conditional
- **Description**: Get reel metadata, comments, likes, playback URLs

### Like Reel
- **Endpoint**: `POST /reel/like/:reelId`
- **Auth**: Required
- **Description**: Like a reel

### Unlike Reel
- **Endpoint**: `DELETE /reel/unlike/:reelId`
- **Auth**: Required
- **Description**: Remove like from reel

### Comment on Reel
- **Endpoint**: `POST /reel/comment/:reelId`
- **Auth**: Required
- **Description**: Add comment to a reel
- **Body**:
  ```json
  {
    "text": "Great reel!",
    "reply_to_comment_id": "commentId",
    "media": "optional_media_url"
  }
  ```

---

## Feeds API

### 17. Get Home Feed
- **Endpoint**: `GET /feed/home`
- **Auth**: Required
- **Description**: Get personalized home feed with cursor pagination
- **Query Params**:
  - `cursor`: Last post ID for pagination
  - `limit`: Number of posts (default: 20)
  - `filter`: "photos" | "videos" | undefined

### 18. Get Reels Feed
- **Endpoint**: `GET /feed/reels`
- **Auth**: Required
- **Description**: Get reels feed for vertical swipe experience
- **Query Params**:
  - `cursor`: Last reel ID for pagination
  - `limit`: Number of reels (default: 15)

### 19. Get Stories Feed
- **Endpoint**: `GET /feed/stories`
- **Auth**: Required
- **Description**: Get stories aggregated from followed users

### 20. Get User Posts
- **Endpoint**: `GET /feed/posts/:userId`
- **Auth**: Conditional
- **Description**: Get posts by a specific user
- **Query Params**:
  - `cursor`: Last post ID for pagination
  - `limit`: Number of posts (default: 20)

---

## Database Models

### Post Model
- user_id (ref: User)
- caption
- media[] (type, url, thumbnail, dimensions, duration)
- tags[] (ref: User)
- location (name, latitude, longitude)
- visibility (public/followers/private)
- likes_count, comments_count, shares_count, saves_count
- is_deleted

### Story Model
- user_id (ref: User)
- media (type, url, thumbnail, duration)
- reply_settings (everyone/followers/off)
- privacy (public/followers/close_friends)
- views_count
- expires_at (24 hours auto-delete)
- is_deleted

### Reel Model
- user_id (ref: User)
- caption
- media (url, thumbnail, duration, dimensions)
- music_id
- tags[] (ref: User)
- likes_count, comments_count, shares_count, views_count
- is_deleted

### Like Model
- user_id (ref: User)
- target_type (post/reel/comment)
- target_id
- Unique index on (user_id, target_type, target_id)

### Comment Model
- user_id (ref: User)
- target_type (post/reel)
- target_id
- text
- reply_to_comment_id (ref: Comment)
- media
- likes_count, replies_count
- is_deleted

### Save Model
- user_id (ref: User)
- target_type (post/reel)
- target_id
- collection_name

### Report Model
- user_id (ref: User)
- target_type (post/reel/story/comment/user)
- target_id
- reason (spam/inappropriate/harassment/etc.)
- details
- attachments[]
- status (pending/reviewed/resolved/dismissed)

---

## Response Format

### Success Response
```json
{
  "statusCode": 200,
  "data": { ... },
  "message": "Success message",
  "success": true
}
```

### Error Response
```json
{
  "statusCode": 400,
  "data": null,
  "message": "Error message",
  "success": false,
  "errors": []
}
```

---

## Notes

1. **Authentication**: Most endpoints require JWT token in headers or cookies
2. **File Upload**: Media URLs should be uploaded to cloud storage first (AWS S3, Cloudinary, etc.)
3. **Pagination**: Uses cursor-based pagination for better performance
4. **Soft Deletes**: Posts, stories, reels use `is_deleted` flag instead of hard deletion
5. **Notifications**: Like/comment actions should trigger real-time notifications (TODO)
6. **Privacy**: Stories and posts respect privacy settings (public/followers/private)
7. **Auto-Expiry**: Stories automatically expire after 24 hours via MongoDB TTL index
