# MiniCRM API Documentation

**Base URL:** `/api`

**Authentication:** All endpoints (except webhooks) require a valid Clerk session token in the `Authorization` header.

```
Authorization: Bearer <clerk_session_token>
```

---

## Pagination

All list endpoints support server-side pagination using offset/limit parameters. Paginated responses include metadata about the total count and whether more results are available.

### Query Parameters

| Parameter | Type   | Default | Description                       |
| --------- | ------ | ------- | --------------------------------- |
| offset    | number | 0       | Number of items to skip           |
| limit     | number | 20      | Maximum number of items (max 100) |

### Response Format

All paginated endpoints return responses in the following format:

```json
{
  "data": [...],
  "total": 150,
  "offset": 0,
  "limit": 20,
  "hasMore": true
}
```

| Field   | Type    | Description                                  |
| ------- | ------- | -------------------------------------------- |
| data    | array   | Array of items for the current page          |
| total   | number  | Total number of items matching the query     |
| offset  | number  | Number of items skipped                      |
| limit   | number  | Maximum number of items requested            |
| hasMore | boolean | Whether there are more items after this page |

---

## Table of Contents

- [Authentication](#authentication)
- [Pagination](#pagination)
- [Companies](#companies)
- [Contacts](#contacts)
- [Interactions](#interactions)
- [Notes](#notes)
- [Notifications](#notifications)
- [Stats (Dashboard)](#stats-dashboard)
- [Threads](#threads)
- [Assistant (Chat)](#assistant-chat)

---

## Authentication

### Get Current User

Retrieves the authenticated user's profile.

```
GET /api/auth/me
```

**Response:** `200 OK`

```json
{
	"id": "user_xxx",
	"email": "user@example.com",
	"firstName": "John",
	"lastName": "Doe",
	"imageUrl": "https://...",
	"createdAt": "2024-01-01T00:00:00.000Z",
	"updatedAt": "2024-01-01T00:00:00.000Z"
}
```

**Errors:**

- `401 Unauthorized` - Not authenticated

---

### Clerk Webhook

Handles Clerk webhook events for user synchronization. This endpoint is called by Clerk and does not require user authentication.

```
POST /api/auth/webhooks/clerk
```

**Headers:**

```
svix-id: <webhook_id>
svix-timestamp: <timestamp>
svix-signature: <signature>
```

**Supported Events:**

- `user.created`
- `user.updated`
- `user.deleted`

**Response:** `200 OK`

```json
{
	"received": true
}
```

---

## Companies

All company endpoints require authentication.

### List Companies

```
GET /api/companies
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|--------|---------------------|
| offset | number | Number of items to skip (default: 0) |
| limit | number | Maximum number of items (default: 20, max: 200) |
| sortBy | string | Sort field: `name` or `createdAt` (default: `updatedAt` desc) |
| sortOrder | string | Sort order: `asc` or `desc` (default: `asc`) |
| query | string | Search query - matches against name, industry, description, and website (case-insensitive) |

**Response:** `200 OK`

```json
{
  "data": [
    {
      "id": "abc123",
      "userId": "user_xxx",
      "name": "Acme Corp",
      "website": "https://acme.com",
      "industry": "Technology",
      "address": "123 Main St",
      "description": "A technology company",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "contacts": [...]
    }
  ],
  "total": 25,
  "offset": 0,
  "limit": 20,
  "hasMore": true
}
```

---

### Get Company

```
GET /api/companies/:id
```

**Response:** `200 OK`

```json
{
  "id": "abc123",
  "userId": "user_xxx",
  "name": "Acme Corp",
  "website": "https://acme.com",
  "industry": "Technology",
  "address": "123 Main St",
  "description": "A technology company",
  "createdAt": "2024-01-01T00:00:00.000Z",
  "updatedAt": "2024-01-01T00:00:00.000Z",
  "contacts": [...],
  "notes": [...]
}
```

**Errors:**

- `404 Not Found` - Company not found

---

### Create Company

```
POST /api/companies
```

**Request Body:**

```json
{
	"name": "Acme Corp",
	"website": "https://acme.com",
	"industry": "Technology",
	"address": "123 Main St",
	"description": "A technology company"
}
```

| Field       | Type   | Required | Description         |
| ----------- | ------ | -------- | ------------------- |
| name        | string | Yes      | Company name        |
| website     | string | No       | Valid URL           |
| industry    | string | No       | Industry category   |
| address     | string | No       | Physical address    |
| description | string | No       | Company description |

**Response:** `201 Created`

**Errors:**

- `400 Bad Request` - Validation error

---

### Update Company

```
PUT /api/companies/:id
```

**Request Body:** Same as Create (all fields optional)

**Response:** `200 OK`

**Errors:**

- `400 Bad Request` - Validation error
- `404 Not Found` - Company not found

---

### Delete Company

```
DELETE /api/companies/:id
```

**Response:** `204 No Content`

**Errors:**

- `404 Not Found` - Company not found

---

## Contacts

### List Contacts

```
GET /api/contacts
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|--------|---------------------|
| companyId | string | Filter by company ID |
| offset | number | Number of items to skip (default: 0) |
| limit | number | Maximum number of items (default: 20, max: 200) |
| sortBy | string | Sort field: `name`, `createdAt`, or `lastInteractionAt` (default: `updatedAt` desc) |
| sortOrder | string | Sort order: `asc` or `desc` (default: `asc`) |
| query | string | Search query - matches against firstName, lastName, email, phone, and jobTitle (case-insensitive) |

**Response:** `200 OK`

```json
{
  "data": [
    {
      "id": "abc123",
      "userId": "user_xxx",
      "firstName": "Jane",
      "lastName": "Smith",
      "email": "jane@acme.com",
      "phone": "+1234567890",
      "jobTitle": "CEO",
      "companyId": "company_xxx",
      "createdAt": "2024-01-01T00:00:00.000Z",
      "updatedAt": "2024-01-01T00:00:00.000Z",
      "company": {...},
      "lastInteractionAt": "2024-01-15T10:00:00.000Z"
    }
  ],
  "total": 45,
  "offset": 0,
  "limit": 20,
  "hasMore": true
}
```

---

### Get Contact

```
GET /api/contacts/:id
```

**Response:** `200 OK`

```json
{
  "id": "abc123",
  "firstName": "Jane",
  "lastName": "Smith",
  "email": "jane@acme.com",
  "phone": "+1234567890",
  "jobTitle": "CEO",
  "companyId": "company_xxx",
  "company": {...},
  "interactions": [...],
  "notes": [...],
  "notifications": [...]
}
```

**Errors:**

- `404 Not Found` - Contact not found

---

### Create Contact

```
POST /api/contacts
```

**Request Body:**

```json
{
	"firstName": "Jane",
	"lastName": "Smith",
	"email": "jane@acme.com",
	"phone": "+1234567890",
	"jobTitle": "CEO",
	"companyId": "company_xxx"
}
```

| Field     | Type   | Required | Description           |
| --------- | ------ | -------- | --------------------- |
| firstName | string | Yes      | First name            |
| lastName  | string | No       | Last name             |
| email     | string | No       | Valid email address   |
| phone     | string | No       | Phone number          |
| jobTitle  | string | No       | Job title             |
| companyId | string | No       | Associated company ID |

**Response:** `201 Created`

**Errors:**

- `400 Bad Request` - Validation error

---

### Update Contact

```
PUT /api/contacts/:id
```

**Request Body:** Same as Create (all fields optional except firstName if provided)

**Response:** `200 OK`

**Errors:**

- `400 Bad Request` - Validation error
- `404 Not Found` - Contact not found

---

### Delete Contact

```
DELETE /api/contacts/:id
```

**Response:** `204 No Content`

**Errors:**

- `404 Not Found` - Contact not found

---

## Interactions

### List Interactions

```
GET /api/interactions
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|--------|---------------------|
| contactId | string | Filter by contact ID |
| offset | number | Number of items to skip (default: 0) |
| limit | number | Maximum number of items (default: 20, max: 100) |

**Response:** `200 OK`

```json
{
  "data": [
    {
      "id": "abc123",
      "userId": "user_xxx",
      "contactId": "contact_xxx",
      "type": "call",
      "summary": "Discussed new project",
      "outcome": "Agreed to next steps",
      "sentiment": "positive",
      "occurredAt": "2024-01-15T10:00:00.000Z",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "contact": {...}
    }
  ],
  "total": 78,
  "offset": 0,
  "limit": 20,
  "hasMore": true
}
```

---

### Get Interaction

```
GET /api/interactions/:id
```

**Response:** `200 OK`

```json
{
  "id": "abc123",
  "contactId": "contact_xxx",
  "type": "call",
  "summary": "Discussed new project",
  "outcome": "Agreed to next steps",
  "sentiment": "positive",
  "occurredAt": "2024-01-15T10:00:00.000Z",
  "contact": {...},
  "notes": [...],
  "notifications": [...]
}
```

**Errors:**

- `404 Not Found` - Interaction not found

---

### Create Interaction

```
POST /api/interactions
```

**Request Body:**

```json
{
	"contactId": "contact_xxx",
	"type": "call",
	"summary": "Discussed new project",
	"outcome": "Agreed to next steps",
	"sentiment": "positive",
	"occurredAt": "2024-01-15T10:00:00.000Z"
}
```

| Field      | Type   | Required | Description                         |
| ---------- | ------ | -------- | ----------------------------------- |
| contactId  | string | Yes      | Contact ID                          |
| type       | enum   | Yes      | `call`, `email`, `meeting`, `other` |
| summary    | string | No       | Summary of interaction              |
| outcome    | string | No       | Outcome or result                   |
| sentiment  | enum   | No       | `positive`, `neutral`, `negative`   |
| occurredAt | string | Yes      | ISO 8601 datetime                   |

**Response:** `201 Created`

**Errors:**

- `400 Bad Request` - Validation error

---

### Update Interaction

```
PUT /api/interactions/:id
```

**Request Body:** Same as Create (contactId not updatable)

**Response:** `200 OK`

**Errors:**

- `400 Bad Request` - Validation error
- `404 Not Found` - Interaction not found

---

### Delete Interaction

```
DELETE /api/interactions/:id
```

**Response:** `204 No Content`

**Errors:**

- `404 Not Found` - Interaction not found

---

## Notes

### List Notes

```
GET /api/notes
```

**Query Parameters:**
| Parameter | Type | Description |
|---------------|--------|---------------------|
| contactId | string | Filter by contact ID |
| companyId | string | Filter by company ID |
| interactionId | string | Filter by interaction ID |
| query | string | Full-text search query |
| offset | number | Number of items to skip (default: 0) |
| limit | number | Maximum number of items (default: 20, max: 100) |

**Response:** `200 OK`

```json
{
  "data": [
    {
      "id": "abc123",
      "userId": "user_xxx",
      "content": "Important meeting notes...",
      "contactId": "contact_xxx",
      "companyId": null,
      "interactionId": "interaction_xxx",
      "createdAt": "2024-01-15T10:30:00.000Z",
      "updatedAt": "2024-01-15T10:30:00.000Z",
      "contact": {...},
      "company": null,
      "interaction": {...}
    }
  ],
  "total": 120,
  "offset": 0,
  "limit": 20,
  "hasMore": true
}
```

---

### Get Note

```
GET /api/notes/:id
```

**Response:** `200 OK`

**Errors:**

- `404 Not Found` - Note not found

---

### Create Note

```
POST /api/notes
```

**Request Body:**

```json
{
	"content": "Important meeting notes...",
	"contactId": "contact_xxx",
	"companyId": null,
	"interactionId": "interaction_xxx"
}
```

| Field         | Type   | Required | Description               |
| ------------- | ------ | -------- | ------------------------- |
| content       | string | Yes      | Note content              |
| contactId     | string | No       | Associated contact ID     |
| companyId     | string | No       | Associated company ID     |
| interactionId | string | No       | Associated interaction ID |

**Response:** `201 Created`

**Errors:**

- `400 Bad Request` - Validation error

---

### Update Note

```
PUT /api/notes/:id
```

**Request Body:** Same as Create

**Response:** `200 OK`

**Errors:**

- `400 Bad Request` - Validation error
- `404 Not Found` - Note not found

---

### Delete Note

```
DELETE /api/notes/:id
```

**Response:** `204 No Content`

**Errors:**

- `404 Not Found` - Note not found

---

## Notifications

### List Notifications

```
GET /api/notifications
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|---------|---------------------|
| contactId | string | Filter by contact ID |
| completed | boolean | Filter by completion status |
| offset | number | Number of items to skip (default: 0) |
| limit | number | Maximum number of items (default: 20, max: 100) |

**Response:** `200 OK`

```json
{
  "data": [
    {
      "id": "abc123",
      "userId": "user_xxx",
      "contactId": "contact_xxx",
      "interactionId": null,
      "type": "follow_up_email",
      "title": "Follow up with Jane",
      "description": "Send proposal",
      "dueDate": "2024-01-20T09:00:00.000Z",
      "isCompleted": false,
      "completedAt": null,
      "createdAt": "2024-01-15T10:30:00.000Z",
      "contact": {...},
      "interaction": null
    }
  ],
  "total": 35,
  "offset": 0,
  "limit": 20,
  "hasMore": true
}
```

---

### Get Pending Notifications

Returns all incomplete notifications.

```
GET /api/notifications/pending
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|--------|---------------------|
| offset | number | Number of items to skip (default: 0) |
| limit | number | Maximum number of items (default: 20, max: 100) |

**Response:** `200 OK`

```json
{
  "data": [...],
  "total": 12,
  "offset": 0,
  "limit": 20,
  "hasMore": false
}
```

---

### Get Upcoming Notifications

Returns notifications due within the specified number of days.

```
GET /api/notifications/upcoming
```

**Query Parameters:**
| Parameter | Type | Default | Description |
|-----------|--------|---------|---------------------|
| days | number | 7 | Number of days ahead |
| offset | number | 0 | Number of items to skip |
| limit | number | 20 | Maximum number of items (max: 100) |

**Response:** `200 OK`

```json
{
  "data": [...],
  "total": 8,
  "offset": 0,
  "limit": 20,
  "hasMore": false
}
```

---

### Get Overdue Notifications

Returns notifications that are past their due date.

```
GET /api/notifications/overdue
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|--------|---------------------|
| offset | number | Number of items to skip (default: 0) |
| limit | number | Maximum number of items (default: 20, max: 100) |

**Response:** `200 OK`

```json
{
  "data": [...],
  "total": 5,
  "offset": 0,
  "limit": 20,
  "hasMore": false
}
```

---

### Get Notification

```
GET /api/notifications/:id
```

**Response:** `200 OK`

**Errors:**

- `404 Not Found` - Notification not found

---

### Create Notification

```
POST /api/notifications
```

**Request Body:**

```json
{
	"title": "Follow up with Jane",
	"type": "follow_up_email",
	"contactId": "contact_xxx",
	"interactionId": null,
	"description": "Send proposal",
	"dueDate": "2024-01-20T09:00:00.000Z"
}
```

| Field         | Type   | Required | Description                                                         |
| ------------- | ------ | -------- | ------------------------------------------------------------------- |
| title         | string | Yes      | Notification title                                                  |
| type          | enum   | Yes      | `follow_up_email`, `follow_up_call`, `follow_up_meeting`, `general` |
| contactId     | string | No       | Associated contact ID                                               |
| interactionId | string | No       | Associated interaction ID                                           |
| description   | string | No       | Additional details                                                  |
| dueDate       | string | No       | ISO 8601 datetime                                                   |

**Response:** `201 Created`

**Errors:**

- `400 Bad Request` - Validation error

---

### Mark Notification Complete

```
POST /api/notifications/:id/complete
```

**Response:** `200 OK`

```json
{
  "id": "abc123",
  "isCompleted": true,
  "completedAt": "2024-01-18T14:00:00.000Z",
  ...
}
```

**Errors:**

- `404 Not Found` - Notification not found

---

### Mark Notification Incomplete

```
POST /api/notifications/:id/incomplete
```

**Response:** `200 OK`

```json
{
  "id": "abc123",
  "isCompleted": false,
  "completedAt": null,
  ...
}
```

**Errors:**

- `404 Not Found` - Notification not found

---

### Update Notification

```
PUT /api/notifications/:id
```

**Request Body:** Same as Create (all fields optional)

**Response:** `200 OK`

**Errors:**

- `400 Bad Request` - Validation error
- `404 Not Found` - Notification not found

---

### Delete Notification

```
DELETE /api/notifications/:id
```

**Response:** `204 No Content`

**Errors:**

- `404 Not Found` - Notification not found

---

## Stats (Dashboard)

The stats endpoint provides comprehensive dashboard metrics aggregated from all CRM models.

### Get Dashboard Stats

```
GET /api/stats
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| timeRange | string | Filter activity stats by time range: `7d`, `30d`, or `all` (default: `all`) |

**Response:** `200 OK`

```json
{
  "overview": {
    "totalCompanies": 25,
    "totalContacts": 150,
    "totalInteractions": 450,
    "totalNotes": 200,
    "pendingNotifications": 12,
    "overdueNotifications": 3,
    "upcomingNotifications": 8
  },
  "activity": {
    "byType": {
      "call": 120,
      "email": 200,
      "meeting": 80,
      "other": 50
    },
    "bySentiment": {
      "positive": 180,
      "neutral": 200,
      "negative": 70
    },
    "recent": {
      "last7Days": 45,
      "last30Days": 180
    },
    "overTime": [
      { "date": "2024-01-15", "count": 12 },
      { "date": "2024-01-16", "count": 8 }
    ]
  },
  "engagement": {
    "topContacts": [
      {
        "contactId": "contact_xxx",
        "interactionCount": 25,
        "contact": {
          "id": "contact_xxx",
          "firstName": "Jane",
          "lastName": "Smith",
          "email": "jane@acme.com"
        }
      }
    ],
    "contactsWithoutInteractions": 25,
    "averageInteractionsPerContact": 3.0,
    "topCompanies": [
      {
        "companyId": "company_xxx",
        "contactCount": 15,
        "company": {
          "id": "company_xxx",
          "name": "Acme Corp"
        }
      }
    ],
    "activeCompanies": [
      {
        "companyId": "company_xxx",
        "interactionCount": 45,
        "company": {
          "id": "company_xxx",
          "name": "Acme Corp"
        }
      }
    ]
  },
  "tasks": {
    "pendingByType": {
      "follow_up_email": 5,
      "follow_up_call": 3,
      "follow_up_meeting": 2,
      "general": 2
    },
    "completionRate": 0.75,
    "overdueBreakdown": {
      "follow_up_email": 1,
      "follow_up_call": 1,
      "follow_up_meeting": 1,
      "general": 0
    },
    "upcomingByType": {
      "follow_up_email": 3,
      "follow_up_call": 2,
      "follow_up_meeting": 2,
      "general": 1
    }
  },
  "growth": {
    "newContacts": {
      "thisWeek": 5,
      "thisMonth": 20,
      "allTime": 150
    },
    "newCompanies": {
      "thisWeek": 2,
      "thisMonth": 8,
      "allTime": 25
    },
    "newInteractions": {
      "thisWeek": 45,
      "thisMonth": 180
    },
    "trends": {
      "contacts": [
        { "date": "2024-01-15", "count": 2 },
        { "date": "2024-01-16", "count": 1 }
      ],
      "companies": [
        { "date": "2024-01-15", "count": 1 },
        { "date": "2024-01-16", "count": 0 }
      ]
    }
  },
  "industries": {
    "companiesByIndustry": [
      {
        "industry": "Technology",
        "count": 10,
        "percentage": 40.0
      },
      {
        "industry": "Healthcare",
        "count": 8,
        "percentage": 32.0
      }
    ],
    "contactsByIndustry": [
      {
        "industry": "Technology",
        "count": 60
      },
      {
        "industry": "Healthcare",
        "count": 45
      }
    ],
    "interactionsByIndustry": [
      {
        "industry": "Technology",
        "count": 180
      },
      {
        "industry": "Healthcare",
        "count": 120
      }
    ]
  }
}
```

**Response Fields:**

| Section | Description |
|---------|-------------|
| overview | Total counts across all entities and notification statuses |
| activity | Interaction statistics by type, sentiment, and time |
| engagement | Top contacts/companies and engagement metrics |
| tasks | Notification/task statistics and completion rates |
| growth | New records over time and growth trends |
| industries | Breakdown by industry across companies, contacts, and interactions |

**Errors:**

- `400 Bad Request` - Invalid timeRange parameter
- `500 Internal Server Error` - Failed to fetch stats

**Notes:**

- All stats are scoped to the authenticated user
- `timeRange` parameter only affects activity stats (byType, bySentiment)
- Overview, engagement, tasks, growth, and industries stats are always for all time
- `overTime` data shows last 30 days of interactions
- `trends` data shows last 30 days of new records

---

## Threads

Threads are conversation sessions with the AI assistant.

### List Threads

```
GET /api/threads
```

**Query Parameters:**
| Parameter | Type | Description |
|-----------|--------|---------------------|
| offset | number | Number of items to skip (default: 0) |
| limit | number | Maximum number of items (default: 20, max: 100) |

**Response:** `200 OK`

```json
{
	"data": [
		{
			"id": "abc123",
			"userId": "user_xxx",
			"name": "Contact management help",
			"createdAt": "2024-01-15T10:00:00.000Z",
			"updatedAt": "2024-01-15T10:30:00.000Z"
		}
	],
	"total": 15,
	"offset": 0,
	"limit": 20,
	"hasMore": false
}
```

---

### Create Thread

```
POST /api/threads
```

**Request Body:**

```json
{
	"firstMessage": "Help me find contacts at Acme Corp"
}
```

| Field        | Type   | Required | Description                             |
| ------------ | ------ | -------- | --------------------------------------- |
| firstMessage | string | No       | Initial message to generate thread name |

**Response:** `201 Created`

```json
{
	"id": "abc123",
	"userId": "user_xxx",
	"name": "Finding Acme Corp Contacts",
	"createdAt": "2024-01-15T10:00:00.000Z",
	"updatedAt": "2024-01-15T10:00:00.000Z"
}
```

---

### Get Thread with Messages

```
GET /api/threads/:threadId
```

**Response:** `200 OK`

```json
{
  "id": "abc123",
  "userId": "user_xxx",
  "name": "Contact management help",
  "createdAt": "2024-01-15T10:00:00.000Z",
  "updatedAt": "2024-01-15T10:30:00.000Z",
  "messages": [
    {
      "id": "msg1",
      "threadId": "abc123",
      "role": "user",
      "content": "Find contacts at Acme Corp",
      "toolCalls": null,
      "toolResults": null,
      "createdAt": "2024-01-15T10:00:00.000Z"
    },
    {
      "id": "msg2",
      "threadId": "abc123",
      "role": "assistant",
      "content": "I found 3 contacts at Acme Corp...",
      "toolCalls": [...],
      "toolResults": [...],
      "createdAt": "2024-01-15T10:00:05.000Z"
    }
  ]
}
```

**Errors:**

- `404 Not Found` - Thread not found

---

### Delete Thread

```
DELETE /api/threads/:threadId
```

**Response:** `204 No Content`

---

## Assistant (Chat)

The assistant provides AI-powered CRM interactions.

### Send Message (Streaming)

Sends a message and streams the response using Server-Sent Events (SSE).

```
POST /api/assistant/:threadId/messages
```

**Request Body:**

```json
{
	"content": "Find all my contacts at Acme Corp"
}
```

**Response:** `200 OK` (text/event-stream)

**SSE Events:**

```
data: {"type":"text-delta","text":"I found "}

data: {"type":"text-delta","text":"3 contacts..."}

data: {"type":"tool-call","toolName":"search","args":{"query":"Acme Corp"}}

data: {"type":"tool-result","toolName":"search","result":{...}}

data: {"type":"done","message":"I found 3 contacts at Acme Corp...","toolCalls":[...]}
```

| Event Type  | Description                  |
| ----------- | ---------------------------- |
| text-delta  | Incremental text from the AI |
| tool-call   | AI is calling a tool         |
| tool-result | Result from a tool execution |
| done        | Stream completed             |
| error       | An error occurred            |

**Errors:**

- `400 Bad Request` - Message content required
- `404 Not Found` - Thread not found

---

### Send Message (Synchronous)

Non-streaming alternative for simpler clients.

```
POST /api/assistant/:threadId/messages/sync
```

**Request Body:**

```json
{
	"content": "Find all my contacts at Acme Corp"
}
```

**Response:** `200 OK`

```json
{
  "message": "I found 3 contacts at Acme Corp...",
  "toolCalls": [
    {
      "toolName": "search",
      "args": {"query": "Acme Corp"},
      "result": {...}
    }
  ]
}
```

**Errors:**

- `400 Bad Request` - Message content required
- `404 Not Found` - Thread not found

---

## Error Responses

All endpoints return errors in the following format:

```json
{
	"error": "Error message"
}
```

For validation errors (Zod):

```json
{
	"error": [
		{
			"code": "invalid_type",
			"expected": "string",
			"received": "undefined",
			"path": ["firstName"],
			"message": "Required"
		}
	]
}
```

### Common HTTP Status Codes

| Code | Description                    |
| ---- | ------------------------------ |
| 200  | Success                        |
| 201  | Created                        |
| 204  | No Content (successful delete) |
| 400  | Bad Request (validation error) |
| 401  | Unauthorized                   |
| 404  | Not Found                      |
| 500  | Internal Server Error          |
