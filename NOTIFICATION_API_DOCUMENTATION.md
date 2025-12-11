# 🔔 NOTIFICATION API DOCUMENTATION

## Overview
Complete notification system with Firebase Cloud Messaging (FCM) for push notifications, in-app notifications, email preferences, and real-time Socket.IO updates.

## Base URL
```
http://localhost:3333/api/v1/notifications
```

## Authentication
All endpoints require JWT token in Authorization header:
```
Authorization: Bearer <access_token>
```

---

## 📱 USER-FACING APIs

### 1. Get Notifications List
**Endpoint:** `GET /notifications/list`

**Description:** Get user's notifications with pagination (likes, comments, shares, follows, etc.)

**Query Parameters:**
- `cursor` (optional) - Last notification ID for pagination
- `limit` (optional) - Number of notifications (default: 20, max: 50)
- `type` (optional) - Filter by type: `like`, `comment`, `share`, `follow`, `reel_like`, etc.

**Example:**
```javascript
GET /api/v1/notifications/list?limit=10
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Notifications fetched successfully",
  "data": {
    "notifications": [
      {
        "_id": "notif123",
        "sender_id": {
          "_id": "user123",
          "firstName": "John",
          "lastName": "Doe",
          "username": "johndoe",
          "profilePicture": "https://..."
        },
        "type": "like",
        "title": "New Like",
        "message": "John Doe liked your post",
        "thumbnail": "https://...",
        "action_url": "/post/post123",
        "is_read": false,
        "createdAt": "2025-12-08T10:30:00.000Z"
      }
    ],
    "unreadCount": 5,
    "nextCursor": "notif120",
    "hasMore": true
  }
}
```

---

### 2. Mark Single Notification as Read
**Endpoint:** `PUT /notifications/read/:notificationId`

**Description:** Mark a specific notification as read

**Parameters:**
- `notificationId` (path) - Notification ID

**Example:**
```javascript
PUT /api/v1/notifications/read/notif123
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Notification marked as read",
  "data": {
    "notification": {
      "_id": "notif123",
      "is_read": true,
      "read_at": "2025-12-08T10:35:00.000Z"
    }
  }
}
```

---

### 3. Mark All Notifications as Read
**Endpoint:** `PUT /notifications/read-all`

**Description:** Mark all user's notifications as read

**Example:**
```javascript
PUT /api/v1/notifications/read-all
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "All notifications marked as read",
  "data": {
    "updated": 12
  }
}
```

---

### 4. Get Notification Settings
**Endpoint:** `GET /notifications/settings`

**Description:** Get user's notification preferences

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Settings fetched successfully",
  "data": {
    "settings": {
      "_id": "settings123",
      "user_id": "user123",
      "preferences": {
        "push": {
          "enabled": true,
          "likes": true,
          "comments": true,
          "shares": true,
          "follows": true,
          "mentions": true,
          "live_invites": true
        },
        "email": {
          "enabled": true,
          "likes": false,
          "comments": true,
          "shares": false,
          "follows": true,
          "mentions": true,
          "digest": true
        },
        "in_app": {
          "enabled": true,
          "sound": true,
          "vibration": true
        }
      },
      "do_not_disturb": {
        "enabled": false,
        "start_time": "22:00",
        "end_time": "08:00"
      }
    }
  }
}
```

---

### 5. Update Notification Settings
**Endpoint:** `PUT /notifications/settings/update`

**Description:** Update user's notification preferences

**Body:**
```json
{
  "preferences": {
    "push": {
      "enabled": true,
      "likes": false,
      "comments": true
    },
    "email": {
      "enabled": false
    }
  },
  "do_not_disturb": {
    "enabled": true,
    "start_time": "23:00",
    "end_time": "07:00"
  }
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Notification settings updated successfully",
  "data": {
    "settings": { ... }
  }
}
```

---

### 6. Register Device Token (FCM)
**Endpoint:** `POST /notifications/register-token`

**Description:** Register Firebase Cloud Messaging token for push notifications

**Body:**
```json
{
  "token": "fcm_device_token_here",
  "device_type": "android",
  "device_id": "device_unique_id"
}
```

**Device Types:** `android`, `ios`, `web`

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Device token registered successfully",
  "data": {
    "settings": {
      "fcm_tokens": [
        {
          "token": "fcm_token...",
          "device_type": "android",
          "device_id": "device123",
          "created_at": "2025-12-08T10:30:00.000Z"
        }
      ]
    }
  }
}
```

---

### 7. Unregister Device Token
**Endpoint:** `DELETE /notifications/unregister-token`

**Description:** Remove FCM token (logout or app uninstall)

**Body:**
```json
{
  "token": "fcm_device_token_here"
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Device token unregistered successfully"
}
```

---

## 🔧 INTERNAL APIs (Called by Other Services)

### 8. Create Like Notification
**Endpoint:** `POST /notifications/like/:postId`

**Description:** Create notification when user likes a post (called internally by post like API)

**Parameters:**
- `postId` (path) - Post ID that was liked

**Response:**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Like notification created"
}
```

**Auto Actions:**
- ✅ Create notification in database
- ✅ Send push notification via FCM
- ✅ Send real-time notification via Socket.IO
- ✅ Check user preferences before sending

---

### 9. Create Comment Notification
**Endpoint:** `POST /notifications/comment/:postId`

**Description:** Create notification for comment event

**Parameters:**
- `postId` (path) - Post ID that was commented on

**Body:**
```json
{
  "commentText": "Great photo! 😍"
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Comment notification created"
}
```

---

### 10. Create Share Notification
**Endpoint:** `POST /notifications/share/:postId`

**Description:** Create notification when post is shared

**Parameters:**
- `postId` (path) - Post ID that was shared

**Response:**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Share notification created"
}
```

---

### 11. Create Reel Notification
**Endpoint:** `POST /notifications/reel/:reelId`

**Description:** Create notification for reel engagement (like/comment)

**Parameters:**
- `reelId` (path) - Reel ID

**Body:**
```json
{
  "action": "like",
  "commentText": "Amazing reel!"
}
```

**Actions:** `like`, `comment`

**Response:**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Reel notification created"
}
```

---

### 12. Create Follow Notification
**Endpoint:** `POST /notifications/follow/:userId`

**Description:** Create notification when user follows another user

**Parameters:**
- `userId` (path) - User ID who was followed

**Response:**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Follow notification created"
}
```

---

## 🔥 FIREBASE SETUP

### Step 1: Get Firebase Service Account

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Select your project (or create new)
3. Go to **Project Settings** → **Service Accounts**
4. Click **Generate New Private Key**
5. Download the JSON file

### Step 2: Add to Environment Variables

Add to `.env`:
```bash
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account","project_id":"your-project","private_key_id":"...","private_key":"-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n","client_email":"...","client_id":"...","auth_uri":"https://accounts.google.com/o/oauth2/auth","token_uri":"https://oauth2.googleapis.com/token","auth_provider_x509_cert_url":"https://www.googleapis.com/oauth2/v1/certs","client_x509_cert_url":"..."}'
```

**Important:** The entire JSON must be on ONE line as a string!

---

## 📡 WEBSOCKET EVENTS

### Listen for New Notifications

```javascript
socket.on('newNotification', (data) => {
  console.log('New notification:', data.notification);
  // Update UI, show badge, play sound
});
```

**Event Data:**
```json
{
  "notification": {
    "_id": "notif123",
    "type": "like",
    "title": "New Like",
    "message": "John Doe liked your post",
    "sender_id": {
      "firstName": "John",
      "username": "johndoe"
    },
    "thumbnail": "https://...",
    "is_read": false
  }
}
```

---

## 🎯 NOTIFICATION TYPES

| Type | Description | Trigger |
|------|-------------|---------|
| `like` | Post liked | User likes a post |
| `comment` | Post commented | User comments on post |
| `share` | Post shared | User shares a post |
| `follow` | New follower | User follows another user |
| `follow_request` | Follow request | User requests to follow (private account) |
| `follow_accepted` | Follow accepted | Private user accepts follow request |
| `reel_like` | Reel liked | User likes a reel |
| `reel_comment` | Reel commented | User comments on reel |
| `story_view` | Story viewed | User views a story |
| `mention` | User mentioned | User tagged in post/comment |
| `tag` | User tagged | User tagged in photo |
| `live_invite` | Live invite | User invited to live stream |

---

## 🔒 NOTIFICATION PREFERENCES

### Push Notifications (Mobile/Web)
```json
{
  "push": {
    "enabled": true,
    "likes": true,
    "comments": true,
    "shares": true,
    "follows": true,
    "mentions": true,
    "live_invites": true
  }
}
```

### Email Notifications
```json
{
  "email": {
    "enabled": true,
    "likes": false,
    "comments": true,
    "shares": false,
    "follows": true,
    "mentions": true,
    "digest": true
  }
}
```

### In-App Settings
```json
{
  "in_app": {
    "enabled": true,
    "sound": true,
    "vibration": true
  }
}
```

### Do Not Disturb
```json
{
  "do_not_disturb": {
    "enabled": true,
    "start_time": "22:00",
    "end_time": "08:00"
  }
}
```

---

## 🚀 INTEGRATION EXAMPLE

### Post Like Flow

**Backend (post.controller.js):**
```javascript
import { notifyPostLike } from "../services/notification.service.js";

export const likePost = asyncHandler(async (req, res) => {
  const { postId } = req.params;
  const userId = req.user._id;
  
  // Like the post
  const like = await Like.create({ post_id: postId, user_id: userId });
  
  // Get post details
  const post = await Post.findById(postId);
  
  // Create notification (auto sends push + socket)
  await notifyPostLike(
    postId,
    post.user_id, // Post owner
    userId, // Who liked
    post.media[0]?.url // Thumbnail
  );
  
  return res.status(200).json(new ApiResponse(200, like, "Post liked"));
});
```

### Frontend (React/Next.js)

```javascript
import { useEffect } from 'react';
import io from 'socket.io-client';

const socket = io('http://localhost:3333', {
  auth: { token: localStorage.getItem('accessToken') }
});

// Listen for notifications
useEffect(() => {
  socket.on('newNotification', (data) => {
    // Show toast notification
    showToast(data.notification.message);
    
    // Update notification badge
    updateNotificationCount(prev => prev + 1);
    
    // Play sound
    if (notificationSound) {
      new Audio('/notification.mp3').play();
    }
  });
  
  return () => socket.off('newNotification');
}, []);

// Register FCM token
const registerForPushNotifications = async (fcmToken) => {
  await fetch('/api/v1/notifications/register-token', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      token: fcmToken,
      device_type: 'web',
      device_id: navigator.userAgent
    })
  });
};
```

---

## ⚡ FEATURES

✅ **Push Notifications** - Firebase Cloud Messaging for iOS/Android/Web  
✅ **Real-time** - Socket.IO for instant in-app notifications  
✅ **Email Notifications** - Configurable email preferences  
✅ **Granular Control** - Per-notification-type preferences  
✅ **Do Not Disturb** - Time-based notification silencing  
✅ **Multi-device** - Support multiple FCM tokens per user  
✅ **Auto Cleanup** - Old read notifications auto-delete after 30 days  
✅ **Smart Filtering** - Respects user preferences before sending  
✅ **Thumbnail Support** - Rich notifications with images  
✅ **Deep Links** - Direct navigation to content  

---

## 📊 DATABASE MODELS

### Notification
- `recipient_id` - Who receives notification
- `sender_id` - Who triggered notification
- `type` - Notification type (like, comment, etc.)
- `reference_id` - Related post/reel/user ID
- `title` - Notification title
- `message` - Notification message
- `thumbnail` - Image thumbnail
- `is_read` - Read status
- `action_url` - Deep link

### NotificationSettings
- `user_id` - User
- `fcm_tokens[]` - Device tokens for push
- `preferences` - Push/email/in-app settings
- `do_not_disturb` - DND schedule

---

## 🔐 SECURITY

- All endpoints require JWT authentication
- Internal endpoints should be called only by authenticated services
- FCM tokens encrypted in transit
- User preferences respected before sending notifications
- Rate limiting recommended for notification creation

---

## Environment Variables Required

```bash
# Firebase (for push notifications)
FIREBASE_SERVICE_ACCOUNT='{"type":"service_account",...}'

# JWT (already configured)
ACCESS_TOKEN_SECRET=your-secret

# Server
PORT=3333
```

---

## 📝 NOTES

1. **Firebase is optional** - System works without it (no push notifications)
2. **Socket.IO required** - For real-time in-app notifications
3. **Call internal endpoints** from other controllers (like, comment, follow)
4. **Don't spam** - Check if notification already exists before creating duplicates
5. **Batch notifications** - Consider batching for popular posts to avoid spam

Your notification system is production-ready! 🎉
