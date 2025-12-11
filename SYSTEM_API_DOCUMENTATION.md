# 🔧 SYSTEM API DOCUMENTATION

## Overview
System management APIs for app updates, server health monitoring, and maintenance mode control.

## Base URL
```
http://localhost:3333/api/v1/system
```

---

## 📱 PUBLIC APIs (No Auth Required)

### 1. Get App Update Info
**Endpoint:** `GET /system/app-update`

**Description:** Check for app updates and forced update requirements. Returns version info for iOS, Android, and Web platforms.

**Query Parameters:**
- `platform` (optional) - `ios`, `android`, or `web`
- `current_version` (optional) - Current app version (e.g., "1.2.3")

**Example:**
```javascript
GET /api/v1/system/app-update?platform=android&current_version=1.0.0
```

**Response (with platform specified):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "App version info fetched successfully",
  "data": {
    "platform": "android",
    "latest_version": "1.2.5",
    "minimum_version": "1.0.0",
    "current_version": "1.0.0",
    "update_available": true,
    "force_update": false,
    "update_url": "https://play.google.com/store/apps/details?id=com.yourapp",
    "release_notes": "Bug fixes and performance improvements"
  }
}
```

**Response (all platforms):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "App version info fetched successfully",
  "data": {
    "platforms": {
      "ios": {
        "latest_version": "1.2.5",
        "minimum_version": "1.0.0",
        "force_update": false,
        "update_url": "https://apps.apple.com/app/your-app",
        "release_notes": "New features added"
      },
      "android": {
        "latest_version": "1.2.5",
        "minimum_version": "1.0.0",
        "force_update": false,
        "update_url": "https://play.google.com/store/apps/details?id=com.yourapp",
        "release_notes": "Bug fixes"
      },
      "web": {
        "latest_version": "1.2.0",
        "minimum_version": "1.0.0",
        "force_update": false,
        "release_notes": "UI improvements"
      }
    },
    "last_updated": "2025-12-09T10:30:00.000Z"
  }
}
```

**Frontend Usage:**
```javascript
const checkAppUpdate = async () => {
  const currentVersion = "1.0.0";
  const platform = "android";
  
  const response = await fetch(
    `/api/v1/system/app-update?platform=${platform}&current_version=${currentVersion}`
  );
  
  const data = await response.json();
  
  if (data.data.force_update) {
    // Show force update dialog (user can't dismiss)
    showForceUpdateDialog(data.data);
  } else if (data.data.update_available) {
    // Show optional update dialog
    showUpdateDialog(data.data);
  }
};
```

---

### 2. Get Maintenance Status
**Endpoint:** `GET /system/maintenance-status`

**Description:** Check if system is under maintenance (public endpoint).

**Example:**
```javascript
GET /api/v1/system/maintenance-status
```

**Response (Operational):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "System is operational",
  "data": {
    "maintenance_mode": false
  }
}
```

**Response (Under Maintenance):**
```json
{
  "success": true,
  "statusCode": 503,
  "message": "System is under maintenance",
  "data": {
    "maintenance_mode": true,
    "message": "We're performing scheduled maintenance. Please check back at 6 PM.",
    "estimated_end_time": "2025-12-09T18:00:00.000Z"
  }
}
```

---

## 🔒 PROTECTED APIs (Auth Required)

### 3. Get Server Health
**Endpoint:** `GET /system/server-health`

**Description:** Comprehensive server health check including database, storage, memory, and CPU stats.

**Headers:**
```
Authorization: Bearer <access_token>
```

**Example:**
```javascript
GET /api/v1/system/server-health
```

**Response (Healthy):**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Server is healthy",
  "data": {
    "status": "healthy",
    "timestamp": "2025-12-09T10:30:00.000Z",
    "uptime": 86400,
    "environment": "production",
    "server": {
      "platform": "darwin",
      "architecture": "arm64",
      "cpus": 8,
      "total_memory": "16.00 GB",
      "free_memory": "4.25 GB",
      "memory_usage": {
        "rss": "125.50 MB",
        "heap_total": "45.25 MB",
        "heap_used": "32.18 MB"
      },
      "node_version": "v22.11.0"
    },
    "services": {
      "database": {
        "status": "healthy",
        "state": "connected",
        "name": "social_media_db",
        "host": "localhost:27017",
        "stats": {
          "collections": 15,
          "data_size": "234.56 MB",
          "index_size": "45.78 MB"
        }
      },
      "storage": {
        "status": "healthy",
        "uploads_directory": "/path/to/uploads",
        "files_count": 1250
      }
    }
  }
}
```

**Response (Unhealthy):**
```json
{
  "success": true,
  "statusCode": 503,
  "message": "Server is unhealthy",
  "data": {
    "status": "unhealthy",
    "services": {
      "database": {
        "status": "unhealthy",
        "error": "Connection timeout"
      }
    }
  }
}
```

---

## 👑 ADMIN-ONLY APIs

### 4. Toggle Maintenance Mode
**Endpoint:** `PUT /system/maintenance-mode`

**Description:** Enable or disable maintenance mode with custom message.

**Headers:**
```
Authorization: Bearer <admin_access_token>
```

**Body:**
```json
{
  "enabled": true,
  "message": "We're performing scheduled maintenance. Please check back at 6 PM.",
  "estimated_end_time": "2025-12-09T18:00:00.000Z",
  "allowed_ips": ["192.168.1.100", "10.0.0.1"]
}
```

**Parameters:**
- `enabled` (required) - `true` to enable, `false` to disable
- `message` (optional) - Custom maintenance message
- `estimated_end_time` (optional) - ISO 8601 timestamp
- `allowed_ips` (optional) - Array of IPs that can bypass maintenance

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Maintenance mode enabled",
  "data": {
    "maintenance_mode": {
      "enabled": true,
      "message": "We're performing scheduled maintenance. Please check back at 6 PM.",
      "estimated_end_time": "2025-12-09T18:00:00.000Z",
      "allowed_ips": ["192.168.1.100"],
      "started_at": "2025-12-09T12:00:00.000Z",
      "started_by": "admin_user_id"
    }
  }
}
```

**Example (Enable Maintenance):**
```javascript
await fetch('/api/v1/system/maintenance-mode', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    enabled: true,
    message: "Scheduled maintenance in progress",
    estimated_end_time: "2025-12-09T18:00:00.000Z"
  })
});
```

**Example (Disable Maintenance):**
```javascript
await fetch('/api/v1/system/maintenance-mode', {
  method: 'PUT',
  headers: {
    'Authorization': `Bearer ${adminToken}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    enabled: false
  })
});
```

---

### 5. Update App Version
**Endpoint:** `PUT /system/app-version/update`

**Description:** Update app version information for specific platform (Admin only).

**Headers:**
```
Authorization: Bearer <admin_access_token>
```

**Body:**
```json
{
  "platform": "android",
  "latest_version": "1.3.0",
  "minimum_version": "1.1.0",
  "force_update": false,
  "update_url": "https://play.google.com/store/apps/details?id=com.yourapp",
  "release_notes": "✨ New features:\n- Dark mode\n- Performance improvements\n- Bug fixes"
}
```

**Parameters:**
- `platform` (required) - `ios`, `android`, or `web`
- `latest_version` (required) - Latest version string (e.g., "1.3.0")
- `minimum_version` (optional) - Minimum supported version
- `force_update` (optional) - `true` to force users to update
- `update_url` (optional) - App store/Play store URL
- `release_notes` (optional) - What's new in this version

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "App version updated successfully",
  "data": {
    "platform": "android",
    "version_info": {
      "latest_version": "1.3.0",
      "minimum_version": "1.1.0",
      "force_update": false,
      "update_url": "https://play.google.com/store/apps/details?id=com.yourapp",
      "release_notes": "✨ New features:\n- Dark mode\n- Performance improvements"
    }
  }
}
```

---

## 🛡️ MAINTENANCE MODE BEHAVIOR

When maintenance mode is **enabled**:

1. **All API requests** return 503 status with maintenance message
2. **Except these routes:**
   - `/api/v1/system/maintenance-status`
   - `/api/v1/system/maintenance-mode` (admin only)
   - `/api/v1/system/app-update`
   - `/health`

3. **Allowed IPs** can bypass maintenance (for admin access)

4. **Frontend should:**
   - Check maintenance status on app launch
   - Show maintenance screen to users
   - Poll status endpoint to detect when maintenance ends

---

## 📊 VERSION COMPARISON LOGIC

**How force_update works:**

```javascript
// Example: Current version = 1.0.5, Minimum version = 1.1.0
// Result: force_update = true (user must update)

// Example: Current version = 1.2.0, Latest version = 1.3.0
// Result: update_available = true, force_update = false (optional update)

// Example: Current version = 1.3.0, Latest version = 1.3.0
// Result: update_available = false (up to date)
```

**Version format:** `major.minor.patch` (e.g., "1.2.5")

---

## 🎯 FRONTEND INTEGRATION

### App Launch Flow

```javascript
// 1. Check maintenance status
const checkMaintenance = async () => {
  const response = await fetch('/api/v1/system/maintenance-status');
  const data = await response.json();
  
  if (data.data.maintenance_mode) {
    showMaintenanceScreen(data.data.message, data.data.estimated_end_time);
    return false; // Don't proceed
  }
  return true; // System operational
};

// 2. Check app updates
const checkUpdates = async () => {
  const response = await fetch(
    `/api/v1/system/app-update?platform=android&current_version=${APP_VERSION}`
  );
  const data = await response.json();
  
  if (data.data.force_update) {
    showForceUpdateDialog(data.data); // Can't dismiss
  } else if (data.data.update_available) {
    showOptionalUpdateDialog(data.data); // Can skip
  }
};

// On app launch
const initApp = async () => {
  const isOperational = await checkMaintenance();
  if (!isOperational) return;
  
  await checkUpdates();
  // Continue app initialization...
};
```

### Admin Dashboard

```javascript
// Toggle maintenance
const toggleMaintenance = async (enabled, message, endTime) => {
  await fetch('/api/v1/system/maintenance-mode', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      enabled,
      message,
      estimated_end_time: endTime
    })
  });
};

// Update app version
const updateAppVersion = async (platform, version, releaseNotes) => {
  await fetch('/api/v1/system/app-version/update', {
    method: 'PUT',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      platform,
      latest_version: version,
      release_notes: releaseNotes
    })
  });
};

// Check server health
const checkHealth = async () => {
  const response = await fetch('/api/v1/system/server-health', {
    headers: { 'Authorization': `Bearer ${adminToken}` }
  });
  const data = await response.json();
  
  displayHealthDashboard(data.data);
};
```

---

## 🔐 SECURITY NOTES

1. **Admin Endpoints:** Only users with `role: "admin"` can access
2. **Health Endpoint:** Requires authentication to prevent info leakage
3. **Maintenance Mode:** System-wide block except allowed IPs
4. **Version Info:** Public to allow update checks before login

---

## 🗄️ DATABASE MODEL

**SystemConfig Schema:**
```javascript
{
  key: String (unique),        // "app_version", "maintenance_mode"
  value: Mixed,                 // Configuration object
  description: String,          // Human-readable description
  updated_by: ObjectId (User),  // Admin who last updated
  timestamps: true
}
```

**Example Documents:**

**App Version:**
```json
{
  "key": "app_version",
  "value": {
    "ios": { "latest_version": "1.2.5", "force_update": false },
    "android": { "latest_version": "1.2.5", "force_update": false },
    "web": { "latest_version": "1.2.0", "force_update": false }
  },
  "updated_by": "admin_id"
}
```

**Maintenance Mode:**
```json
{
  "key": "maintenance_mode",
  "value": {
    "enabled": true,
    "message": "Scheduled maintenance",
    "estimated_end_time": "2025-12-09T18:00:00.000Z",
    "allowed_ips": ["192.168.1.100"]
  },
  "updated_by": "admin_id"
}
```

---

## ⚡ FEATURES

✅ **App Update Management** - Version control for iOS/Android/Web  
✅ **Forced Updates** - Require users to update for critical fixes  
✅ **Maintenance Mode** - System-wide maintenance with custom messages  
✅ **IP Whitelisting** - Allow admin access during maintenance  
✅ **Health Monitoring** - Real-time server and database stats  
✅ **Public Endpoints** - Check updates and maintenance without auth  
✅ **Admin Controls** - Secure version and maintenance management  

---

## Environment Variables

```bash
# No additional variables required
# Uses existing JWT and database config
```

Your system management APIs are ready! 🚀
