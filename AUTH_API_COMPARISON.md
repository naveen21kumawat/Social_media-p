# 🔐 AUTH API COMPARISON & STATUS

## ✅ CURRENT STATUS vs REQUIREMENTS

### **1. POST /auth/register** ✅ EXISTS
**Required:** Create a new user account (mobile/email + password or mobile-only + OTP)  
**Current:** `POST /api/v1/users/register`  
**Status:** ✅ **IMPLEMENTED**  
**Functionality:**
- Accepts: firstName, lastName, email/phone, password
- Sends OTP to email/phone for verification
- Creates user with pending status
- OTP expires in 2 minutes

**Comparison:**
- ✅ Email + password supported
- ✅ Phone + password supported  
- ✅ OTP sent for verification
- ⚠️ Mobile-only + OTP flow exists (verification required)
- ❌ Missing: `category` parameter

---

### **2. POST /auth/send-otp** ❌ MISSING
**Required:** Send one-time password to mobile/email for verification or login  
**Current:** OTP sending is embedded in register/login flows  
**Status:** ❌ **NEEDS STANDALONE ENDPOINT**

**What exists:**
- OTP sent during registration (`/register`)
- OTP sent during login (currently disabled - direct login enabled)
- No standalone `/send-otp` endpoint

**What's needed:**
```javascript
// New endpoint needed
POST /api/v1/auth/send-otp
Body: {
  mobile: "1234567890",
  email: "user@example.com",
  purpose: "register" | "login" | "forgot"
}
```

---

### **3. POST /auth/verify-otp** ⚠️ PARTIALLY EXISTS
**Required:** Verify OTP and issue auth token / activate account  
**Current:** `POST /api/v1/users/verify-register` and `verify-login`  
**Status:** ⚠️ **EXISTS BUT SEPARATE FOR REGISTER/LOGIN**

**What exists:**
- `/verify-register` - Verifies registration OTP, activates account, issues tokens
- `/verify-login` - Currently disabled (direct login active)

**What's needed:**
- Unified `/verify-otp` endpoint with `purpose` parameter
- Should handle: register, login, forgot password verification

---

### **4. POST /auth/login** ✅ EXISTS (Modified)
**Required:** Login with mobile+OTP or email+password; returns access & refresh tokens  
**Current:** `POST /api/v1/users/login`  
**Status:** ✅ **IMPLEMENTED** (Direct login, OTP commented out)

**Functionality:**
- Accepts: email/phone + password
- Returns: accessToken, refreshToken
- Sets httpOnly cookies
- Account locking after 5 failed attempts (30 min lockout)

**Comparison:**
- ✅ Email + password login works
- ✅ Phone + password login works
- ✅ Returns access & refresh tokens
- ⚠️ OTP login flow exists but DISABLED (direct password login active)
- ❌ device_info parameter not captured

**Current behavior:**
```javascript
// Direct login (current)
POST /api/v1/users/login
Body: { email, password }
Response: { user, accessToken, refreshToken }

// OTP login (commented out in code)
// Step 1: POST /login → sends OTP
// Step 2: POST /verify-login → verifies OTP, issues tokens
```

---

### **5. POST /auth/logout** ✅ EXISTS
**Required:** Invalidate user's current token / session  
**Current:** `POST /api/v1/users/logout`  
**Status:** ✅ **FULLY IMPLEMENTED**

**Functionality:**
- Auth: Required (verifyJwt middleware)
- Clears refreshToken from database
- Clears accessToken and refreshToken cookies
- Works with expired tokens

---

### **6. POST /auth/refresh-token** ✅ EXISTS
**Required:** Exchange refresh token for new access token  
**Current:** `POST /api/v1/users/refresh-token`  
**Status:** ✅ **FULLY IMPLEMENTED**

**Functionality:**
- Accepts: refreshToken (from cookie or body)
- Validates token against database
- Issues new access & refresh tokens
- Updates database with new refresh token

---

### **7. POST /auth/change-password** ✅ EXISTS
**Required:** Allow authenticated user to change password  
**Current:** `POST /api/v1/users/change-password`  
**Status:** ✅ **FULLY IMPLEMENTED**

**Functionality:**
- Auth: Required
- Validates: currentPassword, newPassword
- Hashes and saves new password

**Comparison:**
- ✅ Requires current password
- ✅ Protected route
- ✅ Password validation

**Note:** Current params use `currentPassword` instead of `old_password`

---

### **8. POST /auth/forgot-password** ✅ EXISTS
**Required:** Initiate password reset flow via OTP/link  
**Current:** `POST /api/v1/users/forgot-password`  
**Status:** ✅ **IMPLEMENTED** (Uses JWT reset link, not OTP)

**Functionality:**
- Accepts: email or phone
- Generates JWT reset token (15 min expiry)
- Sends email with reset link
- Link format: `http://frontend.com/reset-password?token=xyz`

**Comparison:**
- ✅ Email/phone supported
- ✅ Reset flow initiated
- ⚠️ Uses JWT link instead of OTP
- ❌ No SMS OTP for phone number forgot password

**Additional endpoint:**
- `POST /api/v1/users/reset-password` - Accepts token + newPassword

---

### **9. DELETE /auth/delete-account** ❌ PARTIALLY EXISTS
**Required:** Permanently delete user account and data (with confirmation)  
**Current:** `DELETE /api/v1/users/delete/:id`  
**Status:** ⚠️ **EXISTS BUT DIFFERENT STRUCTURE**

**What exists:**
- `DELETE /api/v1/users/delete/:id` - Deletes user by ID
- Auth: Required
- Simple deletion, no confirmation flow

**What's needed:**
```javascript
// Improved endpoint needed
DELETE /api/v1/auth/delete-account
Body: {
  confirm: true,
  reason: "optional reason",
  password: "user password for verification"
}
```

**Current issues:**
- ❌ No confirmation parameter
- ❌ No reason tracking
- ❌ No password verification before deletion
- ❌ Uses ID in URL instead of current user
- ⚠️ No cascading delete of user data (posts, comments, etc.)

---

## 📋 SUMMARY TABLE

| # | Endpoint | Required | Current Route | Status |
|---|----------|----------|---------------|--------|
| 1 | POST /auth/register | ✅ | POST /users/register | ✅ Exists (missing category) |
| 2 | POST /auth/send-otp | ✅ | - | ❌ **MISSING** |
| 3 | POST /auth/verify-otp | ✅ | POST /users/verify-register | ⚠️ Separate endpoints |
| 4 | POST /auth/login | ✅ | POST /users/login | ✅ Exists (OTP disabled) |
| 5 | POST /auth/logout | ✅ | POST /users/logout | ✅ Fully working |
| 6 | POST /auth/refresh-token | ✅ | POST /users/refresh-token | ✅ Fully working |
| 7 | POST /auth/change-password | ✅ | POST /users/change-password | ✅ Fully working |
| 8 | POST /auth/forgot-password | ✅ | POST /users/forgot-password | ✅ Exists (JWT not OTP) |
| 9 | DELETE /auth/delete-account | ✅ | DELETE /users/delete/:id | ⚠️ Needs improvement |

---

## 🔧 WHAT NEEDS TO BE FIXED/ADDED

### **Priority 1: Critical Missing Features**

1. **❌ Standalone `/send-otp` endpoint**
   - Purpose: Register, Login, Forgot Password
   - Should handle email AND phone
   - Rate limiting needed

2. **❌ Unified `/verify-otp` endpoint**
   - Currently split between verify-register and verify-login
   - Should accept `purpose` parameter

3. **⚠️ Enable OTP login flow**
   - Currently disabled in favor of direct password login
   - Code exists but commented out

4. **❌ Improved `/delete-account` endpoint**
   - Add confirmation parameter
   - Add reason tracking
   - Require password verification
   - Use current user (not ID param)
   - Implement cascading delete

### **Priority 2: Enhancements**

5. **⚠️ Add device_info tracking**
   - Capture device information during login
   - Track multiple sessions
   - Enable remote logout

6. **⚠️ Add category parameter to registration**
   - User type/category selection during signup

7. **⚠️ SMS OTP for forgot password**
   - Currently only supports email reset links
   - Add SMS OTP option for phone numbers

8. **⚠️ Create `/auth` route prefix**
   - Currently using `/users` prefix
   - Better to have dedicated `/auth` routes

---

## 🎯 RECOMMENDED ACTIONS

### **Option 1: Quick Fix (Keep Current Structure)**
✅ Add missing standalone endpoints:
- `POST /api/v1/auth/send-otp`
- `POST /api/v1/auth/verify-otp` (unified)
- Improve `DELETE /api/v1/auth/delete-account`

### **Option 2: Restructure (Recommended)**
1. Create new `/auth` route group
2. Move all auth endpoints from `/users` to `/auth`
3. Implement all missing features
4. Add proper validation and security

### **Option 3: Hybrid Approach**
- Keep current working endpoints
- Add only missing critical features
- Gradually migrate to `/auth` prefix

---

## 📝 CURRENT ROUTE MAPPING

```javascript
// Current Structure
/api/v1/users/register              → Should be /auth/register
/api/v1/users/verify-register       → Should be /auth/verify-otp
/api/v1/users/login                 → Should be /auth/login  
/api/v1/users/verify-login          → Should be /auth/verify-otp
/api/v1/users/logout                → Should be /auth/logout ✅
/api/v1/users/refresh-token         → Should be /auth/refresh-token ✅
/api/v1/users/forgot-password       → Should be /auth/forgot-password ✅
/api/v1/users/reset-password        → Should be /auth/reset-password
/api/v1/users/change-password       → Should be /auth/change-password ✅
/api/v1/users/delete/:id            → Should be /auth/delete-account
```

---

## 🔍 CODE REVIEW NOTES

### **Issues Found:**

1. **OTP Login Disabled:**
   ```javascript
   // Line ~330: OTP login flow is commented out
   // Direct password login is active instead
   ```

2. **verifyLoginOtp Stubbed:**
   ```javascript
   // Line ~475: Returns 501 error
   const verifyLoginOtp = asyncHandler(async (req, res) => {
     throw new ApiError(501, "OTP login is currently disabled");
   });
   ```

3. **No Device Tracking:**
   - Login doesn't capture device_info
   - No session management for multiple devices

4. **Delete User Issues:**
   - Requires ID parameter (should use req.user)
   - No confirmation flow
   - No password verification
   - No cascading delete

---

## ✅ CONCLUSION

**Overall Status:** 70% Complete

**Working Well:**
- ✅ Registration with OTP
- ✅ Password-based login
- ✅ Logout functionality
- ✅ Token refresh
- ✅ Change password
- ✅ Forgot password (email)

**Needs Work:**
- ❌ Standalone send-otp endpoint
- ❌ Unified verify-otp endpoint
- ⚠️ OTP login flow (disabled)
- ⚠️ Delete account improvements
- ⚠️ Device info tracking
- ⚠️ Route prefix standardization

**Recommendation:** Implement the missing endpoints and improve delete-account flow. Consider creating a dedicated `auth.routes.js` file for better organization.
