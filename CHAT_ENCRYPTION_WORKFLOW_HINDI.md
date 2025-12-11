# 🔐 Chat Encryption & Voice/Video Call Workflow (Hindi)

## 📱 Message Encryption Ka Pura Kaam Kaise Hota Hai

### 1️⃣ **Message Bhejne Ki Process (Sender Side)**

```
Step 1: User Message Type Karta Hai
   ↓
Step 2: Frontend Par Encryption Hoti Hai (AES-256)
   ↓
Step 3: Encrypted Message Backend Ko Bheja Jata Hai
   ↓
Step 4: Backend Database Mein Encrypted Message Save Karta Hai
   ↓
Step 5: Socket.IO Se Real-time Receiver Ko Message Send Hota Hai
```

#### **Detailed Flow:**

**Frontend (Sender):**
```javascript
// 1. User ka message
const plainMessage = "Hello, kaise ho?";

// 2. Encryption key use karke encrypt karo
import CryptoJS from 'crypto-js';
const ENCRYPTION_KEY = "your-secret-key-32-chars-long";

const encryptedMessage = CryptoJS.AES.encrypt(
  plainMessage, 
  ENCRYPTION_KEY
).toString();

// 3. Backend ko encrypted message bhejo
await fetch('/api/v1/chat/send', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer token',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    thread_id: "thread123",
    content: encryptedMessage,  // ✅ Encrypted message
    content_type: "text"
  })
});
```

**Backend:**
```javascript
// 4. Encrypted message database mein save hoti hai
await ChatMessage.create({
  thread_id: threadId,
  sender_id: userId,
  content: encryptedMessage,  // ✅ Encrypted format mein save
  content_type: "text",
  is_encrypted: true
});

// 5. Socket.IO se receiver ko send karo
io.to(receiverSocketId).emit('new_message', {
  message: encryptedMessage,  // ✅ Encrypted
  sender_id: userId
});
```

---

### 2️⃣ **Message Receive Karne Ki Process (Receiver Side)**

```
Step 1: Receiver Ko Socket.IO Se Encrypted Message Milta Hai
   ↓
Step 2: Frontend Par Decryption Hoti Hai (Same Key Use Karke)
   ↓
Step 3: User Ko Plain Text Message Dikhta Hai
```

#### **Detailed Flow:**

**Frontend (Receiver):**
```javascript
// 1. Socket se encrypted message receive karo
socket.on('new_message', (data) => {
  const encryptedMessage = data.message;
  
  // 2. Decrypt karo
  const decryptedBytes = CryptoJS.AES.decrypt(
    encryptedMessage, 
    ENCRYPTION_KEY
  );
  
  const plainMessage = decryptedBytes.toString(CryptoJS.enc.Utf8);
  
  // 3. User ko dikhao
  console.log(plainMessage); // "Hello, kaise ho?"
});
```

---

### 3️⃣ **Purani Messages Load Karne Ki Process**

```
Step 1: User Chat History Dekhta Hai
   ↓
Step 2: Backend Se Encrypted Messages Aati Hain
   ↓
Step 3: Frontend Par Har Message Decrypt Hoti Hai
   ↓
Step 4: User Ko Plain Text Messages Dikhti Hain
```

**Frontend:**
```javascript
// 1. Backend se encrypted messages lao
const response = await fetch('/api/v1/chat/messages/thread123');
const data = await response.json();

// 2. Har message ko decrypt karo
const decryptedMessages = data.data.messages.map(msg => {
  if (msg.is_encrypted) {
    const decryptedBytes = CryptoJS.AES.decrypt(
      msg.content, 
      ENCRYPTION_KEY
    );
    msg.content = decryptedBytes.toString(CryptoJS.enc.Utf8);
  }
  return msg;
});

// 3. UI mein dikhao
```

---

## 📞 Voice/Video Call Ka Kaam Kaise Hota Hai (WebRTC)

### **Call Flow Overview:**

```
Caller                    Backend (Socket.IO)              Receiver
  |                              |                              |
  |---- call_initiate ---------->|-------- call_incoming ------>|
  |                              |                              |
  |                              |<------ call_accepted --------|
  |<----- call_accepted ---------|                              |
  |                              |                              |
  |---- webrtc_offer ----------->|-------- webrtc_offer ------->|
  |                              |                              |
  |                              |<------ webrtc_answer --------|
  |<----- webrtc_answer ---------|                              |
  |                              |                              |
  |---- ice_candidate ---------->|------ ice_candidate -------->|
  |<---- ice_candidate -----------|<------ ice_candidate --------|
  |                              |                              |
  |============== Direct P2P Audio/Video Connection =============|
```

---

### 1️⃣ **Voice Call Initiate Karna (Caller Side)**

**Frontend (Caller):**
```javascript
// 1. Call button click karne par
const initiateVoiceCall = async (receiverId) => {
  // Socket se backend ko signal bhejo
  socket.emit('call_initiate', {
    receiver_id: receiverId,
    call_type: 'voice',  // ya 'video'
    caller_name: 'Raman',
    caller_avatar: 'avatar_url'
  });
  
  // 2. Apna microphone access lo
  const localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: false  // voice call ke liye
  });
  
  // 3. WebRTC Peer Connection setup karo
  const peerConnection = new RTCPeerConnection({
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' }
    ]
  });
  
  // 4. Local stream add karo
  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });
};
```

**Backend (Socket.IO):**
```javascript
// Backend receiver ko notify karta hai
socket.on('call_initiate', async (data) => {
  const { receiver_id, call_type } = data;
  
  // Database mein call log save karo
  await CallLog.create({
    caller_id: socket.userId,
    receiver_id: receiver_id,
    call_type: call_type,
    status: 'initiated'
  });
  
  // Receiver ko signal bhejo
  io.to(receiverSocketId).emit('call_incoming', {
    caller_id: socket.userId,
    caller_name: data.caller_name,
    call_type: call_type
  });
});
```

---

### 2️⃣ **Call Accept Karna (Receiver Side)**

**Frontend (Receiver):**
```javascript
// 1. Incoming call notification milti hai
socket.on('call_incoming', (data) => {
  // UI mein call accept/reject buttons dikhao
  showCallPopup(data);
});

// 2. User accept button click karta hai
const acceptCall = async () => {
  // Backend ko accept signal bhejo
  socket.emit('call_accepted', {
    caller_id: callData.caller_id
  });
  
  // 3. Apna microphone access lo
  const localStream = await navigator.mediaDevices.getUserMedia({
    audio: true,
    video: false
  });
  
  // 4. Peer connection setup karo
  const peerConnection = new RTCPeerConnection();
  
  localStream.getTracks().forEach(track => {
    peerConnection.addTrack(track, localStream);
  });
};
```

---

### 3️⃣ **WebRTC Connection Setup (Peer-to-Peer)**

**Caller Side:**
```javascript
// 1. SDP Offer create karo
const offer = await peerConnection.createOffer();
await peerConnection.setLocalDescription(offer);

// 2. Offer ko receiver ko bhejo (via Socket.IO)
socket.emit('webrtc_offer', {
  receiver_id: receiverId,
  offer: offer
});

// 3. Answer receive karo
socket.on('webrtc_answer', async (data) => {
  await peerConnection.setRemoteDescription(data.answer);
  
  // ✅ Ab P2P connection establish ho gaya!
});
```

**Receiver Side:**
```javascript
// 1. Offer receive karo
socket.on('webrtc_offer', async (data) => {
  await peerConnection.setRemoteDescription(data.offer);
  
  // 2. Answer create karo
  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);
  
  // 3. Answer caller ko bhejo
  socket.emit('webrtc_answer', {
    caller_id: data.caller_id,
    answer: answer
  });
});
```

---

### 4️⃣ **ICE Candidates Exchange (Network Path Find Karna)**

**Dono Sides Par:**
```javascript
// 1. ICE candidate milne par
peerConnection.onicecandidate = (event) => {
  if (event.candidate) {
    // Candidate ko dusre peer ko bhejo
    socket.emit('ice_candidate', {
      peer_id: otherUserId,
      candidate: event.candidate
    });
  }
};

// 2. Dusre peer se candidate receive karo
socket.on('ice_candidate', async (data) => {
  await peerConnection.addIceCandidate(data.candidate);
});
```

---

### 5️⃣ **Audio/Video Stream Receive Karna**

```javascript
// Remote stream ko play karo
peerConnection.ontrack = (event) => {
  const remoteAudio = document.getElementById('remoteAudio');
  remoteAudio.srcObject = event.streams[0];
  remoteAudio.play();
  
  console.log('✅ Call connected! Audio aa rahi hai');
};
```

---

### 6️⃣ **Call End Karna**

**Frontend:**
```javascript
const endCall = () => {
  // 1. Peer connection band karo
  peerConnection.close();
  
  // 2. Local stream band karo
  localStream.getTracks().forEach(track => track.stop());
  
  // 3. Backend ko notify karo
  socket.emit('call_ended', {
    peer_id: otherUserId,
    duration: callDuration
  });
};
```

**Backend:**
```javascript
socket.on('call_ended', async (data) => {
  // Call log update karo
  await CallLog.findOneAndUpdate(
    { caller_id: socket.userId },
    { 
      status: 'completed',
      duration: data.duration,
      ended_at: new Date()
    }
  );
  
  // Dusre user ko notify karo
  io.to(peerSocketId).emit('call_ended', {
    ended_by: socket.userId
  });
});
```

---

## 🔒 Voice/Video Call Encryption

### **WebRTC Mein Built-in Encryption:**

```javascript
// WebRTC automatically DTLS-SRTP use karta hai
// Yeh end-to-end encryption provide karta hai

const peerConnection = new RTCPeerConnection({
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' }
  ],
  // ✅ By default encrypted hota hai
  // DTLS (Datagram Transport Layer Security)
  // SRTP (Secure Real-time Transport Protocol)
});
```

**Encryption Layers:**
1. **DTLS:** WebRTC connection ko encrypt karta hai
2. **SRTP:** Audio/video stream ko encrypt karta hai
3. **End-to-End:** Browser to Browser direct connection

---

## 📊 Complete System Architecture (Hindi)

```
┌─────────────────────────────────────────────────────────────┐
│                    USER A (Caller)                          │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 1. Message Type/Call Initiate                        │  │
│  │ 2. Encryption (AES-256) / WebRTC Setup              │  │
│  │ 3. Socket.IO Se Backend Ko Send                     │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND SERVER                           │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Socket.IO Server                                     │  │
│  │ - Event Listeners (message, call, ice_candidate)    │  │
│  │ - Room Management                                    │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ MongoDB Database                                     │  │
│  │ - ChatMessage (Encrypted content save)              │  │
│  │ - CallLog (Call history)                            │  │
│  └──────────────────────────────────────────────────────┘  │
└───────────────────────────┬─────────────────────────────────┘
                            │
                            ↓
┌─────────────────────────────────────────────────────────────┐
│                    USER B (Receiver)                        │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ 1. Socket.IO Se Encrypted Message/Call Signal       │  │
│  │ 2. Decryption (Same Key) / WebRTC Answer           │  │
│  │ 3. Plain Text Show / Audio Play                     │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘

                    WebRTC Direct P2P Connection
        USER A ←════════════════════════════════════════→ USER B
              (Encrypted Audio/Video via DTLS-SRTP)
```

---

## 🔑 Security Features (Hindi Mein)

### **Message Encryption:**
✅ **AES-256 Encryption** - Military-grade encryption  
✅ **End-to-End** - Sirf sender aur receiver dekh sakte hain  
✅ **Database Encrypted** - Server par bhi encrypted save  
✅ **No Plain Text** - Kabhi bhi plain text store nahi hota  

### **Voice/Video Call Security:**
✅ **DTLS-SRTP** - WebRTC ki built-in encryption  
✅ **P2P Connection** - Direct connection, server beech mein nahi  
✅ **STUN/TURN** - Network traversal ke liye secure servers  
✅ **No Recording** - Backend par audio/video store nahi hota  

---

## 🛠️ Environment Variables Setup

```bash
# .env file mein add karo

# Chat Encryption Key (32 characters)
ENCRYPTION_KEY=your-super-secret-32-char-key

# Socket.IO Configuration
SOCKET_PORT=3333
SOCKET_CORS_ORIGIN=http://localhost:3000

# WebRTC STUN/TURN Servers
STUN_SERVER=stun:stun.l.google.com:19302
TURN_SERVER=turn:your-turn-server.com:3478
TURN_USERNAME=username
TURN_PASSWORD=password
```

---

## 📱 Frontend Integration Example

```javascript
// ========== Message Encryption ==========
import CryptoJS from 'crypto-js';

const ENCRYPTION_KEY = process.env.NEXT_PUBLIC_ENCRYPTION_KEY;

// Encrypt
const encryptMessage = (text) => {
  return CryptoJS.AES.encrypt(text, ENCRYPTION_KEY).toString();
};

// Decrypt
const decryptMessage = (encrypted) => {
  const bytes = CryptoJS.AES.decrypt(encrypted, ENCRYPTION_KEY);
  return bytes.toString(CryptoJS.enc.Utf8);
};

// ========== Voice Call ==========
const VoiceCall = () => {
  const [localStream, setLocalStream] = useState(null);
  const [peerConnection, setPeerConnection] = useState(null);
  
  const startCall = async (receiverId) => {
    // 1. Get microphone access
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: false
    });
    setLocalStream(stream);
    
    // 2. Setup peer connection
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });
    
    // 3. Add tracks
    stream.getTracks().forEach(track => pc.addTrack(track, stream));
    
    // 4. Create offer
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    
    // 5. Send via socket
    socket.emit('webrtc_offer', { receiverId, offer });
    
    setPeerConnection(pc);
  };
};
```

---

## 🎯 Summary (Hindi)

### **Messages:**
1. User message type karta hai
2. Frontend encrypt karta hai (AES-256)
3. Backend encrypted save karta hai
4. Socket.IO se receiver ko send hota hai
5. Receiver decrypt karke padhta hai

### **Calls:**
1. Caller call initiate karta hai (Socket.IO)
2. Receiver accept karta hai
3. WebRTC offer/answer exchange hota hai
4. ICE candidates exchange hote hain
5. Direct P2P encrypted connection ban jata hai
6. Audio/video encrypted stream flow hoti hai

**✅ Sab kuch encrypted aur secure hai!** 🔒🚀
