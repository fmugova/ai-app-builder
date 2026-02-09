# 🎯 API Endpoint Generation Guide

## Overview

BuildFlow AI uses advanced AI to generate production-ready API endpoints with complete error handling, validation, and security features. This guide shows you how to get the best results.

---

## Quick Start

### 1. Navigate to API Endpoints

From your project dashboard:
```
Dashboard → Projects → [Your Project] → Endpoints → Generate with AI
```

### 2. Describe Your Endpoint

Be specific and detailed:

**❌ Poor Description:**
```
Create an API to get users
```

**✅ Great Description:**
```
Create a GET endpoint that fetches all users from the database with pagination.
Support filtering by email and name. Return user ID, name, email, and created date.
Limit to 50 users per page. Require authentication.
```

---

## The 3-Step Generation Process

### Step 1: Describe

Tell the AI what you need in plain English.

**Template:**
```
Create a [METHOD] endpoint that [ACTION] with [FEATURES].

Requirements:
- [Feature 1]
- [Feature 2]
- [Feature 3]

Database: [Table name and operations if needed]
Authentication: [Yes/No and why]
Return: [What data format and fields]
```

**Example - User Registration:**
```
Create a POST endpoint for user registration.

Requirements:
- Accept email, password, and name
- Validate email format
- Ensure password is at least 8 characters
- Check for duplicate email addresses
- Hash password using bcrypt
- Save user to database
- Send welcome email
- Return user object (without password) and JWT token

Database: User table (email, password_hash, name, created_at)
Authentication: No (this creates the account)
Return: { user: {...}, token: "..." }
```

### Step 2: Configure

Select additional features:

- **Require Authentication**: Check this if the endpoint needs a logged-in user
- **Use Database**: Check if you're reading/writing to database
- **Database Table**: Specify which table (e.g., "users", "posts")
- **HTTP Method**: GET, POST, PUT, DELETE, PATCH
- **API Path**: /api/your/path/here

### Step 3: Review & Create

The AI generates code with:
- ✅ Complete imports (Next.js, Prisma, Zod, etc.)
- ✅ Input validation with Zod schemas
- ✅ Comprehensive error handling
- ✅ Authentication checks
- ✅ Database operations with error handling
- ✅ Proper HTTP status codes
- ✅ TypeScript types

**Review the validation results:**
- **Errors**: Must fix before creating
- **Warnings**: Recommendations for improvement
- **Suggestions**: Optional enhancements

---

## 10 Common API Patterns

### 1. **User Registration (POST)**

```
Create a user registration endpoint.

Accept: email, password, name
Validate: email format, password strength (min 8 chars, 1 number, 1 special)
Security: Hash password with bcrypt, check for duplicate email
Database: Save to User table
Return: User object (exclude password) with HTTP 201
Errors: 400 for validation, 409 for duplicate email
```

**Generated features:**
- Zod schema for input validation
- Email format validation
- Password hashing with bcrypt
- Duplicate email check
- Error handling for all scenarios

---

### 2. **Authentication Check (POST)**

```
Create a login endpoint that authenticates users.

Accept: email, password
Process: Find user by email, compare password hash
Security: Use NextAuth with JWTs
Return: Session token and user data
Errors: 401 for invalid credentials, 400 for missing fields
```

---

### 3. **Get User Profile (GET)**

```
Get authenticated user's profile data.

Authentication: Required (check session)
Database: Query User table by session user ID
Return: User profile (exclude password, sensitive fields)
Errors: 401 if not authenticated, 404 if user not found
```

---

### 4. **List with Pagination (GET)**

```
List blog posts with pagination and filtering.

Query params: page (default 1), limit (default 20), category, search
Database: Query Post table with filters, count total
Return: { posts: [...], total, page, totalPages }
Features: Sort by created_at DESC, filter by category and search term
Errors: 400 for invalid page/limit
```

---

### 5. **Create Resource (POST)**

```
Create a new blog post.

Authentication: Required
Accept: title (required), content (required), tags (optional), category
Validation: Title 3-200 chars, content min 10 chars
Database: Insert into Post table with authorId from session
Return: Created post object with HTTP 201
Errors: 401 unauthorized, 400 validation error
```

---

### 6. **Update Resource (PUT)**

```
Update an existing blog post by ID.

Authentication: Required
Authorization: User must be post author or admin
Accept: id in URL params, title, content, tags (all optional for partial update)
Database: Update Post table where id = :id AND authorId = session.userId
Return: Updated post with HTTP 200
Errors: 401 unauthorized, 403 forbidden, 404 not found, 400 validation
```

---

### 7. **Delete Resource (DELETE)**

```
Delete a blog post by ID.

Authentication: Required
Authorization: User must be post author or admin
Database: Check ownership, then delete from Post table
Return: Success message with HTTP 204
Errors: 401 unauthorized, 403 forbidden, 404 not found
```

---

### 8. **Search (GET)**

```
Search across posts by title and content.

Query params: q (search term, required), limit (default 20)
Database: Full-text search on title and content columns
Return: Array of matching posts sorted by relevance
Errors: 400 if query is empty or too short (min 3 chars)
```

---

### 9. **File Upload (POST)**

```
Handle file upload (images, documents).

Authentication: Required
Accept: Multipart form data with file
Validation: File type (jpg, png, pdf), max size 5MB
Process: Generate unique filename, save to storage, create file record
Database: Save file metadata (name, url, size, type, userId)
Return: File object with URL
Errors: 400 invalid file type, 413 file too large
```

---

### 10. **Webhook Handler (POST)**

```
Process Stripe payment webhook.

Authentication: Verify Stripe signature
Accept: Stripe event payload
Process: Handle event types (payment_intent.succeeded, etc.)
Database: Update Payment table, Subscription table as needed
Return: { received: true } with HTTP 200
Errors: 400 invalid signature, 500 processing error
Include: Idempotency check to prevent duplicate processing
```

---

## Best Practices for Descriptions

### ✅ DO:

1. **Be Specific About Data**
   ```
   Return: user ID, email, name, avatar URL, subscription tier
   ```

2. **Specify Validation Rules**
   ```
   Email must be valid format, password 8-64 chars with 1 number
   ```

3. **Mention Error Cases**
   ```
   Return 409 if email exists, 400 for invalid data, 500 for server errors
   ```

4. **Include Database Details**
   ```
   Query User table, join with Subscription table to get tier info
   ```

5. **Describe Authentication Needs**
   ```
   Require valid session, check user role is 'admin' or 'editor'
   ```

### ❌ DON'T:

1. **Be Vague**
   ```
   ❌ Create an endpoint for users
   ✅ Create a GET endpoint to fetch paginated user list with email filter
   ```

2. **Skip Error Handling**
   ```
   ❌ Save user to database
   ✅ Save user to database, return 409 if email exists, 400 for invalid data
   ```

3. **Forget Validation**
   ```
   ❌ Accept email and password
   ✅ Accept email (valid format) and password (min 8 chars, 1 number)
   ```

---

## Validation & Quality Checks

All generated code is automatically validated for:

### Critical Requirements (Must Pass):
- ✅ NextRequest/NextResponse imports
- ✅ Try-catch error handling
- ✅ Explicit HTTP status codes
- ✅ Exported async function
- ✅ Proper auth imports (if authentication required)
- ✅ Prisma imports (if database used)

### Recommended Features:
- ⚠️ Zod schema validation
- ⚠️ Error logging in catch blocks
- ⚠️ TypeScript interfaces/types
- ⚠️ Rate limiting for state-changing operations
- ⚠️ Input sanitization
- ⚠️ Database transaction for multiple operations

---

## Testing Your Endpoint

### 1. **Review Generated Code**
   - Check imports are complete
   - Verify error handling covers all cases
   - Confirm validation rules match requirements

### 2. **Test Button**
   - Use in-app test feature
   - Provide sample request data
   - Verify responses and error cases

### 3. **Manual Testing**
   ```bash
   # Using curl
   curl -X POST https://your-app.com/api/users \
     -H "Content-Type: application/json" \
     -d '{"email":"test@example.com","password":"secure123"}'
   
   # Using fetch in browser console
   fetch('/api/users', {
     method: 'POST',
     headers: { 'Content-Type': 'application/json' },
     body: JSON.stringify({ email: 'test@example.com', password: 'secure123' })
   }).then(r => r.json()).then(console.log)
   ```

---

## Common Generation Issues & Fixes

### Issue: "Missing imports"
**Fix**: Regenerate with more specific requirements about authentication or database usage.

### Issue: "No error handling"
**Fix**: Mention in description: "Include comprehensive error handling with try-catch"

### Issue: "No validation"
**Fix**: Specify validation rules: "Validate email format, password minimum 8 characters using Zod"

### Issue: "Weak security"
**Fix**: Add: "Require authentication, check user permissions, sanitize inputs"

---

## Advanced Patterns

### 1. **Transaction-based Operations**
```
Create an endpoint to transfer credits between users.

Process:
1. Verify sender has sufficient balance (with lock)
2. Deduct from sender account
3. Add to receiver account
4. Create transaction record
5. Use Prisma transaction to ensure atomicity
6. Rollback if any step fails

Return: Transaction record
Errors: 400 insufficient balance, 404 user not found
```

### 2. **Real-time with Server-Sent Events**
```
Create an endpoint that streams live updates.

Return: Server-Sent Events (SSE) stream
Updates: Send new messages every 5 seconds
Database: Query messages where created_at > last_update
Close: After 30 seconds or on client disconnect
```

### 3. **Batch Operations**
```
Create an endpoint to bulk update post statuses.

Accept: Array of post IDs and new status
Validation: Max 100 posts per request
Authorization: User must own all posts
Database: Use Prisma transaction for updateMany
Return: Count of updated posts
```

---

## Checklist Before Creating

- [ ] Described all required fields and their validation rules
- [ ] Specified authentication requirements
- [ ] Mentioned database table and operations
- [ ] Listed all possible error scenarios and status codes
- [ ] Defined expected response format
- [ ] Configured method (GET/POST/PUT/DELETE)
- [ ] Set correct API path

---

## Next Steps

1. **Generate your endpoint** using the wizard
2. **Review the code** - check validation results
3. **Test the endpoint** - use test button or manual testing
4. **Deploy** - your endpoint is production-ready!
5. **Monitor** - check logs for errors and performance

---

## Need Help?

- 📚 [API Test Cases](../lib/api-test-cases.ts) - See examples
- 💬 [BuildFlow Support](mailto:support@buildflow.ai)
- 📖 [Troubleshooting Guide](./TROUBLESHOOTING_GUIDE.md)

---

**Last Updated**: February 2026  
**Version**: 1.0
