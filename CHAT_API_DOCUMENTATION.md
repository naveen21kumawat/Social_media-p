# 💬 CHAT / MESSAGING API DOCUMENTATION

## Overview
Complete encrypted chat and messaging system with text encryption, media support, and voice/video calls with end-to-end encryption.

## Base URL
```
http://localhost:3333/api/v1/chat
```

## Authentication
All endpoints require JWT token in Authorization header:
```
Authorization: Bearer <access_token>
```

---

## 📨 MESSAGE APIs

### 1. Create or Get Chat Thread
**Endpoint:** `POST /chat/thread/:receiverId`

**Description:** Create a new chat thread or fetch existing thread between authenticated user and receiver.

**Parameters:**
- `receiverId` (path) - User ID of the receiver

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Thread fetched successfully",
  "data": {
    "_id": "thread123",
    "participants": [
      {
        "_id": "user1",
        "firstName": "John",
        "lastName": "Doe",
        "username": "johndoe",
        "profilePicture": "/uploads/profile.jpg"
      },
      {
        "_id": "user2",
        "firstName": "Jane",
        "lastName": "Smith",
        "username": "janesmith"
      }
    ],
    "lastMessageAt": "2024-12-06T10:30:00.000Z",
    "unreadCount": { "user1": 0, "user2": 3 }
  }
}
```

---

### 2. Send Message
**Endpoint:** `POST /chat/message/send/:threadId`

**Description:** Send encrypted text or media message in a thread with WebSocket push notification.

**Content-Type:** `multipart/form-data`

**Parameters:**
- `threadId` (path) - Thread ID
- `text` (body) - Message text (will be encrypted)
- `media_ids` (body) - Array of media IDs (optional)
- `reply_to` (body) - Message ID to reply to (optional)
- `files` (body) - Media files to upload (optional, max 10 files)

**Example Request:**
```javascript
const formData = new FormData();
formData.append('text', 'Hello! How are you?');
formData.append('files', imageFile);

await fetch('/api/v1/chat/message/send/thread123', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
```

**Response:**
```json
{
  "success": true,
  "statusCode": 201,
  "message": "Message sent successfully",
  "data": {
    "_id": "msg123",
    "threadId": "thread123",
    "senderId": {
      "_id": "user1",
      "firstName": "John",
      "username": "johndoe"
    },
    "receiverId": "user2",
    "messageType": "text",
    "text": "Hello! How are you?",
    "media": [],
    "status": "sent",
    "createdAt": "2024-12-06T10:30:00.000Z"
  }
}
```

**WebSocket Event Emitted:**
```javascript
// To receiver
socket.emit('newMessage', {
  threadId: 'thread123',
  message: { ... }
});

// To sender
socket.emit('messageStatus', {
  messageId: 'msg123',
  status: 'delivered'
});
```

---

### 3. Delete Message
**Endpoint:** `DELETE /chat/message/delete/:messageId`

**Description:** Delete message (soft-delete for self or hard-delete for everyone within 24 hours).

**Parameters:**
- `messageId` (path) - Message ID to delete
- `deleteFor` (body) - 'me' or 'everyone' (default: 'me')

**Example:**
```javascript
await fetch('/api/v1/chat/message/delete/msg123', {
  method: 'DELETE',
  headers: { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ deleteFor: 'everyone' })
});
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Message deleted successfully"
}
```

**Constraints:**
- Can only delete your own messages
- Delete for everyone: Only within 24 hours
- Delete for me: Anytime

---

### 4. Edit Message
**Endpoint:** `PUT /chat/message/edit/:messageId`

**Description:** Edit previously sent message (within 15 minutes).

**Parameters:**
- `messageId` (path) - Message ID to edit
- `text` (body) - New message text

**Example:**
```javascript
await fetch('/api/v1/chat/message/edit/msg123', {
  method: 'PUT',
  headers: { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ text: 'Updated message text' })
});
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Message edited successfully",
  "data": {
    "_id": "msg123",
    "text": "Updated message text",
    "isEdited": true,
    "editedAt": "2024-12-06T10:45:00.000Z"
  }
}
```

**Constraints:**
- Can only edit your own messages
- Must edit within 15 minutes of sending

---

### 5. Get Messages
**Endpoint:** `GET /chat/messages/:threadId`

**Description:** Get paginated and decrypted messages for a thread.

**Parameters:**
- `threadId` (path) - Thread ID
- `limit` (query) - Number of messages (default: 50)
- `cursor` (query) - Last message ID for pagination (optional)
- `since` (query) - Get messages since timestamp (optional)

**Example:**
```javascript
await fetch('/api/v1/chat/messages/thread123?limit=20&cursor=msg100', {
  headers: { 'Authorization': `Bearer ${token}` }
});
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Messages fetched successfully",
  "data": {
    "messages": [
      {
        "_id": "msg123",
        "text": "Hello! How are you?",
        "senderId": { "_id": "user1", "firstName": "John" },
        "messageType": "text",
        "status": "seen",
        "createdAt": "2024-12-06T10:30:00.000Z"
      }
    ],
    "hasMore": true,
    "nextCursor": "msg120"
  }
}
```

---

### 6. Mark Messages as Seen
**Endpoint:** `PUT /chat/messages/seen/:threadId`

**Description:** Mark all messages in thread as seen/read.

**Parameters:**
- `threadId` (path) - Thread ID

**Example:**
```javascript
await fetch('/api/v1/chat/messages/seen/thread123', {
  method: 'PUT',
  headers: { 'Authorization': `Bearer ${token}` }
});
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Messages marked as seen",
  "data": {
    "messagesUpdated": 5
  }
}
```

**WebSocket Event Emitted:**
```javascript
socket.emit('messagesSeen', {
  threadId: 'thread123',
  seenBy: 'user2',
  seenAt: '2024-12-06T10:30:00.000Z'
});
```

---

### 7. Upload Media for Chat
**Endpoint:** `POST /chat/media/upload`

**Description:** Upload media files (images, videos, audio) and get encrypted media tokens.

**Content-Type:** `multipart/form-data`

**Parameters:**
- `files` (body) - Media files (max 10 files, 100MB each)

**Example:**
```javascript
const formData = new FormData();
formData.append('files', imageFile1);
formData.append('files', imageFile2);

await fetch('/api/v1/chat/media/upload', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${token}` },
  body: formData
});
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Media uploaded successfully",
  "data": {
    "media": [
      {
        "media_id": "image-123456.jpg",
        "type": "image",
        "url": "/uploads/image-123456.jpg",
        "token": "encrypted_access_token",
        "filename": "photo.jpg",
        "size": 245678
      }
    ]
  }
}
```

---

## 📞 CALL APIs

### 8. Request Audio/Video Call
**Endpoint:** `POST /chat/call/request/:receiverId`

**Description:** Initiate audio/video call request with end-to-end encryption key.

**Parameters:**
- `receiverId` (path) - User ID to call
- `callType` (body) - 'audio' or 'video' (default: 'audio')

**Example:**
```javascript
await fetch('/api/v1/chat/call/request/user2', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ callType: 'video' })
});
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Call initiated successfully",
  "data": {
    "callId": "call_1701234567890_abc123",
    "callType": "video",
    "status": "ringing",
    "encryptionKey": "base64_encoded_session_key"
  }
}
```

**WebSocket Event Emitted:**
```javascript
socket.emit('incomingCall', {
  callId: 'call_123',
  callType: 'video',
  caller: {
    _id: 'user1',
    firstName: 'John',
    username: 'johndoe'
  },
  encryptionKey: 'base64_key'
});
```

---

### 9. End Call
**Endpoint:** `POST /chat/call/end/:callId`

**Description:** End call and persist call logs with statistics.

**Parameters:**
- `callId` (path) - Call ID to end
- `duration` (body) - Call duration in seconds (optional, auto-calculated)
- `quality` (body) - Call quality metrics (optional)
- `endReason` (body) - 'normal', 'busy', 'declined', 'no_answer', 'network_error', 'timeout'

**Example:**
```javascript
await fetch('/api/v1/chat/call/end/call_123', {
  method: 'POST',
  headers: { 
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    duration: 180,
    quality: {
      avgBitrate: 256,
      packetLoss: 0.5,
      jitter: 20,
      latency: 45
    },
    endReason: 'normal'
  })
});
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Call ended successfully",
  "data": {
    "callId": "call_123",
    "callType": "video",
    "callerId": "user1",
    "receiverId": "user2",
    "status": "ended",
    "duration": 180,
    "startedAt": "2024-12-06T10:30:00.000Z",
    "endedAt": "2024-12-06T10:33:00.000Z",
    "quality": {
      "avgBitrate": 256,
      "packetLoss": 0.5
    }
  }
}
```

---

## 🔒 ENCRYPTION DETAILS

### Message Text Encryption
- **Algorithm:** AES-256
- **Library:** crypto-js
- **Process:** 
  1. Plain text → Encrypt with ENCRYPTION_KEY → Store as `encryptedContent`
  2. Retrieve `encryptedContent` → Decrypt → Return plain text

### Media URL Encryption
- **Purpose:** Secure media access with time-limited tokens
- **Token Format:** `encrypted(mediaUrl|timestamp)`
- **Expiry:** 60 minutes (configurable)

### Call Encryption
- **Session Key:** Unique per call, generated with `generateSessionKey()`
- **Usage:** WebRTC stream encryption (DTLS-SRTP)
- **Key Exchange:** Sent via secure WebSocket during call initiation

---

## 🔌 WEBSOCKET EVENTS

### Connection
```javascript
const socket = io('http://localhost:3333', {
  auth: { token: accessToken }
});
```

### Events to Listen

**newMessage** - Receive new messages
```javascript
socket.on('newMessage', (data) => {
  console.log('New message:', data.message);
});
```

**messageStatus** - Message delivery/read status
```javascript
socket.on('messageStatus', (data) => {
  console.log('Message status:', data.status);
});
```

**messagesSeen** - Messages marked as seen
```javascript
socket.on('messagesSeen', (data) => {
  console.log('Messages seen by:', data.seenBy);
});
```

**userTyping** - User typing indicator
```javascript
socket.on('userTyping', (data) => {
  console.log(`${data.userId} is typing:`, data.isTyping);
});
```

**incomingCall** - Incoming audio/video call
```javascript
socket.on('incomingCall', (data) => {
  console.log('Incoming call from:', data.caller);
  console.log('Call type:', data.callType);
  console.log('Encryption key:', data.encryptionKey);
});
```

**callOffer/callAnswer** - WebRTC signaling
```javascript
socket.on('callOffer', (data) => {
  // Handle WebRTC offer
});

socket.on('callAnswer', (data) => {
  // Handle WebRTC answer
});
```

### Events to Emit

**joinThread** - Join thread room
```javascript
socket.emit('joinThread', threadId);
```

**typing** - Notify typing
```javascript
socket.emit('typing', { threadId, receiverId });
```

**stopTyping** - Stop typing
```javascript
socket.emit('stopTyping', { threadId, receiverId });
```

**messageDelivered** - Acknowledge delivery
```javascript
socket.emit('messageDelivered', { messageId });
```

---

## 🎥 WEBRTC CALL FLOW

### 1. Call Initiation
```javascript
// Caller initiates call
POST /api/v1/chat/call/request/:receiverId

// Receiver gets socket event
socket.on('incomingCall', (data) => {
  // Show incoming call UI
  // Use data.encryptionKey for WebRTC encryption
});
```

### 2. WebRTC Signaling
```javascript
// Caller creates offer
const offer = await peerConnection.createOffer();
socket.emit('callOffer', { callId, receiverId, offer, encryptionKey });

// Receiver gets offer
socket.on('callOffer', async (data) => {
  await peerConnection.setRemoteDescription(data.offer);
  const answer = await peerConnection.createAnswer();
  socket.emit('callAnswer', { callId, callerId, answer });
});

// ICE candidates exchange
peerConnection.onicecandidate = (event) => {
  if (event.candidate) {
    socket.emit('iceCandidate', { callId, receiverId, candidate: event.candidate });
  }
};
```

### 3. End Call
```javascript
POST /api/v1/chat/call/end/:callId
```

---

## 📱 FRONTEND INTEGRATION EXAMPLE

```javascript
// Initialize socket connection
import io from 'socket.io-client';

const socket = io('http://localhost:3333', {
  auth: { token: localStorage.getItem('accessToken') }
});

// Join thread
socket.emit('joinThread', threadId);

// Send message
const sendMessage = async (threadId, text) => {
  const response = await fetch(`/api/v1/chat/message/send/${threadId}`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ text })
  });
  return response.json();
};

// Listen for new messages
socket.on('newMessage', (data) => {
  addMessageToUI(data.message);
});

// Mark messages as seen
const markAsSeen = async (threadId) => {
  await fetch(`/api/v1/chat/messages/seen/${threadId}`, {
    method: 'PUT',
    headers: { 'Authorization': `Bearer ${token}` }
  });
};
```

---

## ⚠️ IMPORTANT NOTES

1. **Encryption Key:** Change `ENCRYPTION_KEY` in production!
2. **Message Limits:** Max 10 media files per message
3. **File Size:** Max 100MB per file
4. **Edit Time:** 15 minutes window to edit messages
5. **Delete Time:** 24 hours window to delete for everyone
6. **Call Encryption:** Uses unique session keys per call
7. **Token Expiry:** Media tokens expire after 60 minutes

---

## 🔐 SECURITY FEATURES

✅ End-to-end message encryption (AES-256)  
✅ Encrypted media URLs with expiry  
✅ Secure WebSocket connections  
✅ WebRTC call encryption with session keys  
✅ JWT authentication for all endpoints  
✅ Protection against unauthorized access  
✅ Message deletion policies  

---

## Environment Variables Required

```bash
ENCRYPTION_KEY=your-super-secret-encryption-key-change-in-production-2024
ACCESS_TOKEN_SECRET=your-jwt-secret
PORT=3333
CORS_ORIGIN=http://localhost:3000
```
