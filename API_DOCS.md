# API Documentation - AI Marketing Platform

Complete API reference for the AI Marketing Platform backend.

## Base URL
```
http://localhost:5000/api
```

## Authentication
All protected endpoints require a JWT token in the Authorization header:
```
Authorization: Bearer <token>
```

## Response Format
All responses are JSON:
```json
{
  "message": "Success message",
  "data": {},
  "error": "Error message (if applicable)"
}
```

---

## Authentication Endpoints

### Register User
**POST** `/auth/register`

Creates a new user account.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123",
  "fullName": "John Doe",
  "companyName": "Company Name" // optional
}
```

**Response** (201):
```json
{
  "message": "User registered successfully",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "fullName": "John Doe",
    "plan": "free"
  },
  "token": "eyJhbGc..."
}
```

**Errors**:
- 400: Missing required fields
- 409: Email already registered

---

### Login User
**POST** `/auth/login`

Authenticates a user and returns a JWT token.

**Request Body**:
```json
{
  "email": "user@example.com",
  "password": "password123"
}
```

**Response** (200):
```json
{
  "message": "Login successful",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "fullName": "John Doe",
    "plan": "pro"
  },
  "token": "eyJhbGc..."
}
```

**Errors**:
- 400: Missing email or password
- 401: Invalid credentials

---

### Get User Profile
**GET** `/auth/profile`

**Protected**: Yes

Retrieves the current user's profile information.

**Response** (200):
```json
{
  "user": {
    "id": 1,
    "email": "user@example.com",
    "fullName": "John Doe",
    "companyName": "Company Name",
    "plan": "pro",
    "apiQuotaMonthly": 10000,
    "apiQuotaUsed": 234,
    "subscriptionEndDate": "2025-12-31T23:59:59Z",
    "createdAt": "2025-11-12T10:30:00Z"
  }
}
```

---

### Update User Profile
**PUT** `/auth/profile`

**Protected**: Yes

Updates the user's profile information.

**Request Body**:
```json
{
  "fullName": "Jane Doe",
  "companyName": "New Company"
}
```

**Response** (200):
```json
{
  "message": "Profile updated successfully",
  "user": {
    "id": 1,
    "email": "user@example.com",
    "fullName": "Jane Doe",
    "companyName": "New Company",
    "plan": "pro"
  }
}
```

---

## Website Endpoints

### Add Website
**POST** `/websites`

**Protected**: Yes

Adds a new website to monitor.

**Request Body**:
```json
{
  "domain": "example.com",
  "targetKeywords": "seo, digital marketing, web optimization" // optional
}
```

**Response** (201):
```json
{
  "message": "Website added successfully",
  "website": {
    "id": 5,
    "domain": "example.com",
    "targetKeywords": "seo, digital marketing, web optimization",
    "createdAt": "2025-11-12T10:30:00Z"
  }
}
```

**Errors**:
- 400: Domain is required
- 403: Plan limit reached (free=1, pro=3, enterprise=unlimited)
- 409: Domain already added

---

### List Websites
**GET** `/websites`

**Protected**: Yes

Retrieves all websites for the user.

**Response** (200):
```json
{
  "websites": [
    {
      "id": 1,
      "domain": "example.com",
      "targetKeywords": "seo, marketing",
      "lastAuditDate": "2025-11-11T15:30:00Z",
      "monitoringEnabled": true,
      "createdAt": "2025-11-10T10:00:00Z"
    },
    {
      "id": 2,
      "domain": "another-site.com",
      "targetKeywords": null,
      "lastAuditDate": null,
      "monitoringEnabled": true,
      "createdAt": "2025-11-12T10:00:00Z"
    }
  ]
}
```

---

### Get Website Details
**GET** `/websites/:websiteId`

**Protected**: Yes

Retrieves details for a specific website.

**Parameters**:
- `websiteId` (path): ID of the website

**Response** (200):
```json
{
  "website": {
    "id": 1,
    "domain": "example.com",
    "targetKeywords": "seo, marketing",
    "lastAuditDate": "2025-11-11T15:30:00Z",
    "monitoringEnabled": true,
    "createdAt": "2025-11-10T10:00:00Z"
  }
}
```

**Errors**:
- 404: Website not found

---

### Update Website
**PUT** `/websites/:websiteId`

**Protected**: Yes

Updates website settings.

**Request Body**:
```json
{
  "targetKeywords": "new keywords",
  "monitoringEnabled": false
}
```

**Response** (200):
```json
{
  "message": "Website updated successfully",
  "website": {
    "id": 1,
    "domain": "example.com",
    "targetKeywords": "new keywords",
    "monitoringEnabled": false
  }
}
```

---

### Delete Website
**DELETE** `/websites/:websiteId`

**Protected**: Yes

Deletes a website and all associated data.

**Response** (200):
```json
{
  "message": "Website deleted successfully"
}
```

**Errors**:
- 404: Website not found

---

## SEO Audit Endpoints

### Run SEO Audit
**POST** `/audits/:websiteId/run`

**Protected**: Yes

Performs an SEO audit on the specified website.

**Parameters**:
- `websiteId` (path): ID of the website

**Response** (200):
```json
{
  "message": "Audit completed successfully",
  "report": {
    "id": 1,
    "auditDate": "2025-11-12T14:30:00Z",
    "overallScore": 72,
    "scores": {
      "onPage": 75,
      "technical": 70,
      "content": 71
    },
    "issues": [
      {
        "severity": "critical",
        "issue": "Missing meta descriptions on 12 pages",
        "impact": "Affects click-through rate in search results",
        "fix": "Add unique meta descriptions under 160 characters"
      }
    ],
    "recommendations": [
      {
        "category": "Content",
        "priority": "high",
        "recommendation": "Create content for high-volume keywords",
        "keywords": ["keyword1", "keyword2"],
        "estimatedTraffic": 250
      }
    ],
    "mobileFriendly": true,
    "pageSpeedScore": 65,
    "ssl": true
  },
  "quotaRemaining": 999
}
```

**Errors**:
- 404: Website not found
- 429: Monthly API quota exceeded

---

### Get Audit History
**GET** `/audits/:websiteId/history`

**Protected**: Yes

Retrieves audit history for a website.

**Parameters**:
- `websiteId` (path): ID of the website
- `limit` (query): Max results (default: 10)
- `offset` (query): Results offset (default: 0)

**Response** (200):
```json
{
  "reports": [
    {
      "id": 1,
      "auditDate": "2025-11-12T14:30:00Z",
      "scores": {
        "onPage": 75,
        "technical": 70,
        "content": 71,
        "overall": 72
      },
      "totalIssues": 15,
      "criticalIssues": 3
    },
    {
      "id": 2,
      "auditDate": "2025-11-11T14:30:00Z",
      "scores": {
        "onPage": 74,
        "technical": 68,
        "content": 70,
        "overall": 71
      },
      "totalIssues": 16,
      "criticalIssues": 4
    }
  ]
}
```

---

### Get Audit Report
**GET** `/audits/:websiteId/report/:reportId`

**Protected**: Yes

Retrieves a specific audit report.

**Parameters**:
- `websiteId` (path): ID of the website
- `reportId` (path): ID of the report

**Response** (200):
```json
{
  "report": {
    "id": 1,
    "auditDate": "2025-11-12T14:30:00Z",
    "scores": {
      "onPage": 75,
      "technical": 70,
      "content": 71,
      "overall": 72
    },
    "totalIssues": 15,
    "criticalIssues": 3,
    "recommendations": [...],
    "reportData": {...}
  }
}
```

---

## Keyword Endpoints

### Get Keywords (Research)
**GET** `/keywords/:websiteId/research`

**Protected**: Yes

Performs keyword research for a website.

**Parameters**:
- `websiteId` (path): ID of the website
- `limit` (query): Max keywords to return (default: 20)

**Response** (200):
```json
{
  "keywords": [
    {
      "keyword": "digital marketing",
      "searchVolume": 12500,
      "difficulty": 65,
      "currentPosition": 8,
      "trend": "up",
      "cpc": "1.25"
    },
    {
      "keyword": "seo services",
      "searchVolume": 8900,
      "difficulty": 58,
      "currentPosition": 15,
      "trend": "stable",
      "cpc": "0.95"
    }
  ],
  "cached": false
}
```

---

### Get Website Keywords
**GET** `/keywords/:websiteId`

**Protected**: Yes

Retrieves all keywords being tracked for a website.

**Parameters**:
- `websiteId` (path): ID of the website

**Response** (200):
```json
{
  "keywords": [
    {
      "id": 1,
      "keyword": "digital marketing",
      "searchVolume": 12500,
      "difficulty": 65,
      "currentPosition": 8,
      "trend": "up",
      "lastUpdated": "2025-11-12T10:00:00Z"
    }
  ]
}
```

---

### Add Keyword
**POST** `/keywords/:websiteId`

**Protected**: Yes

Adds a keyword to track.

**Parameters**:
- `websiteId` (path): ID of the website

**Request Body**:
```json
{
  "keyword": "new keyword phrase"
}
```

**Response** (201):
```json
{
  "message": "Keyword added successfully",
  "keyword": {
    "id": 5,
    "keyword": "new keyword phrase",
    "searchVolume": 1240,
    "difficulty": 32
  }
}
```

---

## Health Check

### Health Status
**GET** `/health`

**Protected**: No

Simple health check endpoint.

**Response** (200):
```json
{
  "status": "healthy",
  "timestamp": "2025-11-12T14:30:00Z"
}
```

---

## Error Responses

### Common Error Format
```json
{
  "error": "Error message describing what went wrong"
}
```

### HTTP Status Codes
| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request |
| 401 | Unauthorized (missing/invalid token) |
| 403 | Forbidden (insufficient permissions) |
| 404 | Not Found |
| 409 | Conflict (duplicate entry) |
| 429 | Too Many Requests (quota exceeded) |
| 500 | Internal Server Error |

---

## Rate Limiting

Requests are limited based on user plan:

| Plan | Monthly API Calls | Requests/Hour |
|------|-------------------|----------------|
| Free | 1,000 | 50 |
| Pro | 10,000 | 500 |
| Enterprise | 100,000+ | Unlimited |

---

## Example Usage

### Complete Flow: Register → Add Website → Run Audit

```bash
# 1. Register
curl -X POST http://localhost:5000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "user@example.com",
    "password": "password123",
    "fullName": "John Doe"
  }'

# Save the token from response
TOKEN="eyJhbGc..."

# 2. Add Website
curl -X POST http://localhost:5000/api/websites \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "domain": "example.com",
    "targetKeywords": "seo, marketing"
  }'

# Save website ID from response
WEBSITE_ID=1

# 3. Run Audit
curl -X POST http://localhost:5000/api/audits/$WEBSITE_ID/run \
  -H "Authorization: Bearer $TOKEN"

# 4. Get Keywords
curl -X GET http://localhost:5000/api/keywords/$WEBSITE_ID \
  -H "Authorization: Bearer $TOKEN"
```

---

## Pagination

Endpoints that return lists support pagination:

**Query Parameters**:
- `limit`: Number of results (default: 10, max: 100)
- `offset`: Starting position (default: 0)

**Example**:
```
GET /audits/1/history?limit=20&offset=0
```

---

## Versioning

Current API Version: **v1** (implied)

For future versions: `/api/v2/...`

---

## Support

For API issues or questions:
1. Check this documentation
2. Review error responses
3. Open an issue on GitHub
4. Contact support

---

**Last Updated**: November 2025
**API Version**: 1.0
