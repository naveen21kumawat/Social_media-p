# 🔍 SEARCH API DOCUMENTATION

## Overview
Complete search functionality across users, posts, pages, hashtags with trending analytics.

## Base URL
```
http://localhost:3333/api/v1/search
```

---

## 🌐 PUBLIC SEARCH APIs

### 1. Global Search (Unified)
**Endpoint:** `GET /search/global`

**Description:** Search across all content types - users, posts, pages, hashtags in one request

**Auth:** Optional (Better results with authentication)

**Query Parameters:**
- `query` (required) - Search term (min 2 characters)
- `type` (optional) - Filter by type: `users`, `posts`, `pages`, `hashtags`
- `limit` (optional) - Results per type (default: 10, max: 50)
- `cursor` (optional) - Pagination cursor

**Example:**
```
GET /api/v1/search/global?query=john&limit=5
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Global search completed successfully",
  "data": {
    "query": "john",
    "results": {
      "users": [
        {
          "_id": "user123",
          "firstName": "John",
          "lastName": "Doe",
          "username": "johndoe",
          "avatar": "avatar_url",
          "isVerified": true,
          "profile_type": "personal",
          "bio": "Software Developer"
        }
      ],
      "posts": [
        {
          "_id": "post123",
          "caption": "John's awesome post #coding",
          "user_id": {
            "firstName": "John",
            "username": "johndoe"
          },
          "likes_count": 150,
          "comments_count": 25
        }
      ],
      "pages": [
        {
          "_id": "page123",
          "firstName": "John's",
          "lastName": "Business",
          "username": "johnsbiz",
          "profile_type": "business",
          "isVerified": false
        }
      ],
      "hashtags": [
        {
          "_id": "hashtag123",
          "name": "johnwick",
          "usage_count": 1250,
          "trending_score": 85.5
        }
      ],
      "total_results": 15
    },
    "pagination": {
      "limit": 5,
      "cursor": null
    }
  }
}
```

---

### 2. Search Users
**Endpoint:** `GET /search/users`

**Description:** Search for users by name, username

**Auth:** Optional

**Query Parameters:**
- `query` (required) - Search term (min 2 characters)
- `limit` (optional) - Results per page (default: 20, max: 50)
- `page` (optional) - Page number (default: 1)

**Example:**
```
GET /api/v1/search/users?query=john&page=1&limit=20
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Users search completed successfully",
  "data": {
    "query": "john",
    "users": [
      {
        "_id": "user123",
        "firstName": "John",
        "lastName": "Doe",
        "username": "johndoe",
        "avatar": "https://cloudinary.com/...",
        "isVerified": true,
        "profile_type": "personal",
        "bio": "Software Developer | Tech Enthusiast"
      },
      {
        "_id": "user456",
        "firstName": "Johnny",
        "lastName": "Smith",
        "username": "johnnysmith",
        "avatar": "https://cloudinary.com/...",
        "isVerified": false,
        "profile_type": "personal",
        "bio": "Photographer"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 5,
      "total_users": 95,
      "per_page": 20,
      "has_more": true
    }
  }
}
```

---

### 3. Search Pages (Business Accounts)
**Endpoint:** `GET /search/pages`

**Description:** Search business pages and creator accounts

**Auth:** Optional

**Query Parameters:**
- `query` (required) - Search term (min 2 characters)
- `limit` (optional) - Results per page (default: 20, max: 50)
- `page` (optional) - Page number (default: 1)

**Example:**
```
GET /api/v1/search/pages?query=restaurant&limit=10
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Pages search completed successfully",
  "data": {
    "query": "restaurant",
    "pages": [
      {
        "_id": "page123",
        "firstName": "The Grand",
        "lastName": "Restaurant",
        "username": "thegrandrest",
        "avatar": "https://cloudinary.com/...",
        "coverPhoto": "https://cloudinary.com/...",
        "isVerified": true,
        "profile_type": "business",
        "bio": "Fine dining experience since 1995 🍽️"
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 3,
      "total_pages": 28,
      "per_page": 10,
      "has_more": true
    }
  }
}
```

---

### 4. Search Hashtags
**Endpoint:** `GET /search/hashtags`

**Description:** Search hashtags with trending stats and usage count

**Auth:** Optional

**Query Parameters:**
- `query` (required) - Hashtag name (min 1 character)
- `limit` (optional) - Results per page (default: 20, max: 50)
- `page` (optional) - Page number (default: 1)

**Example:**
```
GET /api/v1/search/hashtags?query=love&limit=15
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Hashtags search completed successfully",
  "data": {
    "query": "love",
    "hashtags": [
      {
        "_id": "hashtag123",
        "name": "love",
        "usage_count": 125000,
        "trending_score": 950.5,
        "last_used_at": "2025-12-10T08:30:00.000Z",
        "posts_count": 125000,
        "related_hashtags": ["loveit", "lovelife", "lovestory"]
      },
      {
        "_id": "hashtag456",
        "name": "loveislove",
        "usage_count": 45000,
        "trending_score": 320.8,
        "last_used_at": "2025-12-10T07:15:00.000Z",
        "posts_count": 45000
      }
    ],
    "pagination": {
      "current_page": 1,
      "total_pages": 2,
      "total_hashtags": 25,
      "per_page": 15,
      "has_more": true
    }
  }
}
```

---

### 5. Get Trending Content
**Endpoint:** `GET /search/trending`

**Description:** Get trending topics, hashtags, posts, and users

**Auth:** No (Publicly cacheable)

**Query Parameters:**
- `limit` (optional) - Results per category (default: 10, max: 50)
- `timeframe` (optional) - Time period: `1h`, `6h`, `24h`, `7d`, `30d` (default: 24h)

**Example:**
```
GET /api/v1/search/trending?timeframe=24h&limit=10
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Trending data fetched successfully",
  "data": {
    "timeframe": "24h",
    "trending_hashtags": [
      {
        "_id": "hashtag123",
        "name": "viral",
        "usage_count": 15000,
        "trending_score": 1250.5,
        "last_used_at": "2025-12-10T10:00:00.000Z",
        "posts_count": 15000
      },
      {
        "_id": "hashtag456",
        "name": "trending",
        "usage_count": 12000,
        "trending_score": 980.3,
        "posts_count": 12000
      }
    ],
    "trending_posts": [
      {
        "_id": "post123",
        "caption": "This is going viral! #viral #trending",
        "user_id": {
          "firstName": "John",
          "lastName": "Doe",
          "username": "johndoe",
          "avatar": "avatar_url",
          "isVerified": true
        },
        "media": [
          {
            "type": "image",
            "url": "https://cloudinary.com/..."
          }
        ],
        "likes_count": 5000,
        "comments_count": 850,
        "createdAt": "2025-12-09T15:30:00.000Z"
      }
    ],
    "trending_users": [
      {
        "_id": "user123",
        "firstName": "Influencer",
        "lastName": "One",
        "username": "influencer1",
        "avatar": "avatar_url",
        "isVerified": true,
        "profile_type": "personal",
        "bio": "Content Creator 🎥"
      }
    ],
    "trending_topics": [
      {
        "topic": "viral",
        "posts_count": 15000,
        "trending_score": 1250.5
      },
      {
        "topic": "trending",
        "posts_count": 12000,
        "trending_score": 980.3
      }
    ],
    "generated_at": "2025-12-10T10:30:00.000Z"
  }
}
```

---

## 🔒 PROTECTED SEARCH APIs (Require Authentication)

### 6. Get Search History
**Endpoint:** `GET /search/history`

**Description:** Get user's recent search history

**Auth:** Required

**Query Parameters:**
- `limit` (optional) - Number of results (default: 20)

**Example:**
```
GET /api/v1/search/history?limit=10
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Search history fetched successfully",
  "data": {
    "history": [
      {
        "_id": "hist123",
        "user_id": "user123",
        "query": "john doe",
        "search_type": "users",
        "results_count": 15,
        "createdAt": "2025-12-10T09:30:00.000Z"
      },
      {
        "_id": "hist456",
        "query": "coding tips",
        "search_type": "posts",
        "results_count": 42,
        "createdAt": "2025-12-10T08:15:00.000Z"
      }
    ]
  }
}
```

---

### 7. Clear Search History
**Endpoint:** `DELETE /search/history`

**Description:** Delete all search history for current user

**Auth:** Required

**Example:**
```
DELETE /api/v1/search/history
Authorization: Bearer <token>
```

**Response:**
```json
{
  "success": true,
  "statusCode": 200,
  "message": "Search history cleared successfully",
  "data": null
}
```

---

## 📊 FEATURES

✅ **Global Unified Search** - Search everything in one API  
✅ **Type Filtering** - Filter by users, posts, pages, hashtags  
✅ **Trending Analytics** - Real-time trending calculation  
✅ **Search History** - Track user searches (authenticated)  
✅ **Hashtag Stats** - Usage count and trending scores  
✅ **Pagination** - All endpoints support pagination  
✅ **Rate Limiting Ready** - Can add rate limits for public endpoints  
✅ **Flexible Timeframes** - Trending data for 1h to 30d  

---

## 🎯 FRONTEND INTEGRATION

### Search Implementation Example

```javascript
// Global Search
const globalSearch = async (query) => {
  const response = await fetch(
    `/api/v1/search/global?query=${encodeURIComponent(query)}&limit=10`,
    {
      headers: {
        'Authorization': `Bearer ${token}` // Optional
      }
    }
  );
  return await response.json();
};

// Search Users
const searchUsers = async (query, page = 1) => {
  const response = await fetch(
    `/api/v1/search/users?query=${encodeURIComponent(query)}&page=${page}&limit=20`
  );
  return await response.json();
};

// Get Trending
const getTrending = async (timeframe = '24h') => {
  const response = await fetch(
    `/api/v1/search/trending?timeframe=${timeframe}&limit=10`
  );
  return await response.json();
};

// Search with Debounce
import { debounce } from 'lodash';

const debouncedSearch = debounce(async (query) => {
  if (query.length < 2) return;
  
  const results = await globalSearch(query);
  setSearchResults(results.data.results);
}, 300);

// Usage in React Component
const SearchBar = () => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  
  useEffect(() => {
    if (query) {
      debouncedSearch(query);
    }
  }, [query]);
  
  return (
    <input
      type="text"
      value={query}
      onChange={(e) => setQuery(e.target.value)}
      placeholder="Search users, posts, hashtags..."
    />
  );
};
```

---

## 🗄️ DATABASE MODELS

### Hashtag Model
```javascript
{
  name: String (unique, indexed),
  usage_count: Number,
  last_used_at: Date,
  trending_score: Number,
  related_hashtags: [String],
  timestamps: true
}
```

### SearchHistory Model
```javascript
{
  user_id: ObjectId (User),
  query: String,
  search_type: String,
  results_count: Number,
  timestamps: true
}
```

---

## ⚡ PERFORMANCE TIPS

1. **Caching:** Cache trending results for 5-10 minutes
2. **Indexing:** Ensure text indexes on User.firstName, User.username, Post.caption
3. **Rate Limiting:** Add rate limits for public search endpoints
4. **Debouncing:** Implement frontend debouncing (300ms recommended)
5. **Pagination:** Always use pagination for large result sets

---

## 🔍 SEARCH ALGORITHM

### Trending Score Calculation:
```javascript
trending_score = usage_count / max(hours_since_last_use, 1)
```

This ensures:
- Recently used hashtags rank higher
- Frequently used hashtags get bonus points
- Stale hashtags drop in ranking

---

## Environment Variables

No additional environment variables required. Uses existing database connection.

Your complete search system is ready! 🔍🚀
