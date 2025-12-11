# 👑 ADMIN PANEL API DOCUMENTATION

## Overview
Complete admin panel APIs for user management, content moderation, reports handling, analytics, and global notifications.

## Base URL
```
http://localhost:3333/api/v1/admin
```

## Authentication
Admin endpoints require JWT token with admin role:
```
Authorization: Bearer <admin_access_token>
```

---

## 🔓 PUBLIC API

### 1. Admin Login
**Endpoint:** `POST /admin/login`

**Description:** Admin authentication - returns admin token

**Body:**
```json
{
  "email": "admin@example.com",
  "password": "admin_password"
}
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Admin logged in successfully",
  "data": {
    "admin": {
      "_id": "admin_id",
      "firstName": "Admin",
      "lastName": "User",
      "email": "admin@example.com",
      "userType": "admin",
      "status": "active"
    },
    "accessToken": "eyJhbGciOiJIUzI1...",
    "refreshToken": "eyJhbGciOiJIUzI1..."
  }
}
```

---

## 📊 DASHBOARD & ANALYTICS

### 2. Get Admin Dashboard
**Endpoint:** `GET /admin/dashboard`

**Description:** Comprehensive admin overview with user stats, content metrics, reports, and storage info

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Dashboard data fetched successfully",
  "data": {
    "users": {
      "total": 15420,
      "active": 14250,
      "banned": 120,
      "verified": 3450,
      "new_today": 85,
      "new_this_week": 620
    },
    "content": {
      "posts": 45230,
      "reels": 12450,
      "active_stories": 1250,
      "recent_posts": 3420
    },
    "reports": {
      "pending": 45,
      "resolved": 1230
    },
    "storage": {
      "total_uploads": 58930,
      "estimated_size": "Calculate from Cloudinary"
    }
  }
}
```

---

### 12. Get Analytics
**Endpoint:** `GET /admin/analytics`

**Description:** Deep analytics with retention, DAU/MAU, engagement metrics

**Query Parameters:**
- `period` (optional) - `7d`, `30d`, `90d`, `1y` (default: 7d)

**Example:**
```javascript
GET /api/v1/admin/analytics?period=30d
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Analytics fetched successfully",
  "data": {
    "period": "30d",
    "date_range": {
      "start": "2024-11-09T00:00:00.000Z",
      "end": "2024-12-09T10:30:00.000Z"
    },
    "users": {
      "new_users": 1850,
      "active_users": 8420,
      "total_users": 15420,
      "dau": 8420,
      "mau": 12350,
      "retention_rate": "68.15%"
    },
    "content": {
      "new_posts": 12450,
      "new_reels": 3250,
      "total_content": 15700
    },
    "engagement": {
      "posts_per_user": "0.81",
      "reels_per_user": "0.21"
    },
    "admin": {
      "total_actions": 285
    }
  }
}
```

---

## 👥 USER MANAGEMENT

### 3. Get Users List
**Endpoint:** `GET /admin/users`

**Description:** Paginated user list with filters

**Query Parameters:**
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 20)
- `status` (optional) - `active`, `inactive`, `banned`, `blocked`
- `isVerified` (optional) - `true` or `false`
- `search` (optional) - Search by name, username, email
- `sort` (optional) - Sort field (default: -createdAt)

**Example:**
```javascript
GET /api/v1/admin/users?page=1&limit=20&status=active&search=john
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Users fetched successfully",
  "data": {
    "users": [
      {
        "_id": "user123",
        "firstName": "John",
        "lastName": "Doe",
        "username": "johndoe",
        "email": "john@example.com",
        "status": "active",
        "isVerified": true,
        "createdAt": "2025-01-15T10:30:00.000Z",
        "lastActive": "2025-12-09T08:20:00.000Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 771,
      "total_users": 15420,
      "per_page": 20,
      "has_more": true
    }
  }
}
```

---

### 4. Verify User
**Endpoint:** `PUT /admin/user/verify/:userId`

**Description:** Mark user or business as verified (blue checkmark)

**Parameters:**
- `userId` (path) - User ID to verify

**Example:**
```javascript
PUT /api/v1/admin/user/verify/user123
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "User verified successfully",
  "data": {
    "user": {
      "_id": "user123",
      "firstName": "John",
      "lastName": "Doe",
      "isVerified": true
    }
  }
}
```

---

### 5. Ban User
**Endpoint:** `PUT /admin/user/ban/:userId`

**Description:** Temporarily ban or suspend a user

**Parameters:**
- `userId` (path) - User ID to ban

**Body:**
```json
{
  "reason": "Violation of community guidelines - spam posting",
  "duration": 7
}
```

**Parameters:**
- `reason` (required) - Ban reason
- `duration` (optional) - Ban duration in days (omit for permanent)

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "User banned successfully",
  "data": {
    "user": {
      "_id": "user123",
      "status": "banned",
      "banReason": "Violation of community guidelines - spam posting",
      "banUntil": "2025-12-16T10:30:00.000Z"
    }
  }
}
```

---

### 6. Delete User Permanently
**Endpoint:** `DELETE /admin/user/delete/:userId`

**Description:** Permanently remove user and all associated data

**⚠️ WARNING:** This action is irreversible!

**Parameters:**
- `userId` (path) - User ID to delete

**Example:**
```javascript
DELETE /api/v1/admin/user/delete/user123
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "User and associated data deleted permanently"
}
```

**What gets deleted:**
- User account
- All posts
- All reels
- All stories
- All reports by user
- All notifications

---

## 📝 CONTENT MODERATION

### 7. Get Content
**Endpoint:** `GET /admin/content`

**Description:** List all content (posts/reels/stories) for moderation

**Query Parameters:**
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 20)
- `type` (required) - `post`, `reel`, or `story`
- `status` (optional) - `active`, `deleted`
- `reported` (optional) - `true` or `false`

**Example:**
```javascript
GET /api/v1/admin/content?type=post&page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Content fetched successfully",
  "data": {
    "content": [
      {
        "_id": "post123",
        "user_id": {
          "_id": "user123",
          "firstName": "John",
          "lastName": "Doe",
          "username": "johndoe",
          "email": "john@example.com"
        },
        "caption": "Beautiful sunset!",
        "media": [
          {
            "type": "image",
            "url": "https://cloudinary.com/..."
          }
        ],
        "likes_count": 250,
        "comments_count": 45,
        "is_deleted": false,
        "createdAt": "2025-12-09T10:30:00.000Z"
      }
    ],
    "type": "post",
    "pagination": {
      "current_page": 1,
      "total_pages": 2262,
      "total_items": 45230,
      "per_page": 20
    }
  }
}
```

---

### 8. Remove Content
**Endpoint:** `DELETE /admin/content/remove/:contentId`

**Description:** Remove flagged or violating content

**Parameters:**
- `contentId` (path) - Content ID to remove

**Body:**
```json
{
  "type": "post",
  "reason": "Contains inappropriate content"
}
```

**Parameters:**
- `type` (required) - `post`, `reel`, or `story`
- `reason` (optional) - Removal reason

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Content removed successfully"
}
```

---

## 🚨 REPORTS MANAGEMENT

### 9. Get Reports
**Endpoint:** `GET /admin/reports`

**Description:** View user-generated reports/complaints

**Query Parameters:**
- `page` (optional) - Page number (default: 1)
- `limit` (optional) - Items per page (default: 20)
- `status` (optional) - `pending`, `resolved`, `dismissed`, `escalated`
- `type` (optional) - `post`, `user`, `reel`, `story`, `comment`

**Example:**
```javascript
GET /api/v1/admin/reports?status=pending&page=1
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Reports fetched successfully",
  "data": {
    "reports": [
      {
        "_id": "report123",
        "reporter_id": {
          "_id": "user456",
          "firstName": "Jane",
          "lastName": "Smith",
          "username": "janesmith",
          "email": "jane@example.com"
        },
        "reported_type": "post",
        "reported_item_id": {
          "_id": "post789",
          "caption": "Reported content..."
        },
        "reason": "Harassment",
        "description": "This post contains abusive language",
        "status": "pending",
        "createdAt": "2025-12-09T09:15:00.000Z"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 3,
      "total_reports": 45,
      "per_page": 20
    }
  }
}
```

---

### 10. Resolve Report
**Endpoint:** `PUT /admin/reports/resolve/:reportId`

**Description:** Resolve or escalate a report with admin notes

**Parameters:**
- `reportId` (path) - Report ID to resolve

**Body:**
```json
{
  "action": "resolved",
  "notes": "Content removed and user warned. First violation."
}
```

**Parameters:**
- `action` (required) - `resolved`, `dismissed`, or `escalated`
- `notes` (optional) - Admin notes/decision

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Report resolved successfully",
  "data": {
    "report": {
      "_id": "report123",
      "status": "resolved",
      "admin_notes": "Content removed and user warned. First violation.",
      "resolved_by": "admin_id",
      "resolved_at": "2025-12-09T10:30:00.000Z"
    }
  }
}
```

---

## 🔔 GLOBAL NOTIFICATIONS

### 11. Send Global Notification
**Endpoint:** `POST /admin/notification/send-global`

**Description:** Broadcast notification to entire userbase or filtered segment

**Body:**
```json
{
  "title": "🎉 New Feature Released!",
  "message": "Check out our new dark mode feature. Enable it in settings now!",
  "segment": "all",
  "action_url": "/settings/appearance"
}
```

**Parameters:**
- `title` (required) - Notification title
- `message` (required) - Notification message
- `segment` (optional) - `all`, `verified`, `new` (users from last 7 days)
- `action_url` (optional) - Deep link/URL

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Global notification sent successfully",
  "data": {
    "sent_to": 15420,
    "segment": "all"
  }
}
```

---

## 🔐 ADMIN MIDDLEWARE

The admin routes use a custom middleware that checks:
1. Valid JWT authentication
2. User has `userType: "admin"`

**Middleware code:**
```javascript
const adminAuth = [
  verifyJwt,
  (req, res, next) => {
    if (req.user.userType !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Access denied. Admin privileges required."
      });
    }
    next();
  }
];
```

---

## 📋 ADMIN ACTION LOGGING

All admin actions are automatically logged in the `AdminLog` collection:

**Logged Actions:**
- `user_verify` - User verification
- `user_ban` - User ban/suspension
- `user_delete` - User deletion
- `content_remove` - Content removal
- `report_resolve` - Report resolution
- `global_notification` - Global notification sent
- `maintenance_toggle` - Maintenance mode toggle
- `app_version_update` - App version update

**Log Structure:**
```javascript
{
  admin_id: ObjectId,
  action: String,
  target_type: String,
  target_id: ObjectId,
  details: Object,
  ip_address: String,
  user_agent: String,
  createdAt: Date
}
```

---

## 🎯 FRONTEND INTEGRATION

### Admin Dashboard Example

```javascript
// Login
const adminLogin = async (email, password) => {
  const response = await fetch('/api/v1/admin/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });
  
  const data = await response.json();
  
  if (data.success) {
    localStorage.setItem('adminToken', data.data.accessToken);
    return data.data;
  }
};

// Get Dashboard
const getDashboard = async () => {
  const response = await fetch('/api/v1/admin/dashboard', {
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
    }
  });
  
  return await response.json();
};

// Ban User
const banUser = async (userId, reason, duration) => {
  const response = await fetch(`/api/v1/admin/user/ban/${userId}`, {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${localStorage.getItem('adminToken')}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ reason, duration })
  });
  
  return await response.json();
};

// Get Reports
const getReports = async (page = 1, status = 'pending') => {
  const response = await fetch(
    `/api/v1/admin/reports?page=${page}&status=${status}`,
    {
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('adminToken')}`
      }
    }
  );
  
  return await response.json();
};
```

---

## 🗄️ DATABASE MODELS

### AdminLog Model
```javascript
{
  admin_id: ObjectId (User),
  action: String (enum),
  target_type: String,
  target_id: ObjectId,
  details: Mixed,
  ip_address: String,
  user_agent: String,
  timestamps: true
}
```

### Updated User Model Fields
```javascript
{
  status: ["active", "inactive", "suspended", "blocked", "banned"],
  isVerified: Boolean,
  banReason: String,
  banUntil: Date,
  lastActive: Date,
  username: String
}
```

---

## ⚡ FEATURES

✅ **Admin Authentication** - Secure admin login with JWT  
✅ **Dashboard Overview** - Real-time stats and metrics  
✅ **User Management** - Verify, ban, delete users  
✅ **Content Moderation** - Review and remove posts/reels/stories  
✅ **Reports System** - Handle user complaints  
✅ **Global Notifications** - Broadcast to all/segmented users  
✅ **Deep Analytics** - DAU/MAU, retention, engagement  
✅ **Action Logging** - Complete audit trail  
✅ **Role-Based Access** - Admin-only endpoints  
✅ **Pagination** - All list endpoints support pagination  

---

## 🔒 SECURITY NOTES

1. **Admin Creation:** Create admin users manually in database with `userType: "admin"`
2. **Strong Passwords:** Enforce strong admin passwords
3. **IP Whitelisting:** Consider IP restrictions for admin panel
4. **2FA Recommended:** Add two-factor authentication for admin accounts
5. **Action Logging:** All actions are logged with IP and user agent
6. **Delete Carefully:** User deletion is permanent and irreversible

---

## 📊 ANALYTICS METRICS

**DAU (Daily Active Users):** Users active in last 24 hours  
**MAU (Monthly Active Users):** Users active in last 30 days  
**Retention Rate:** (DAU / MAU) × 100  
**Engagement:** Posts/Reels per user  

---

## Environment Variables

```bash
# No additional variables required
# Uses existing JWT and database config
```

Your complete admin panel is ready! 👑🚀
