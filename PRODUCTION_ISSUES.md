# Production Issues - Second Brain App

## 🔴 CRITICAL - Must Fix Before Production

### 1. Hardcoded Credentials
**Location:** Lines 1065-1066
```javascript
const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key';
```
**Issue:** Placeholder credentials will cause complete app failure
**Fix:** Replace with actual Supabase project credentials or use environment variables

### 2. XSS Vulnerabilities
**Locations:** Multiple innerHTML usages
- Line 1348: `userMessage.innerHTML` - user message not sanitized
- Line 1585: Content rendering with user data
- Line 1463: Search results rendering

**Issue:** User-generated content inserted via innerHTML can execute malicious scripts
**Fix:** Use textContent or sanitize HTML with DOMPurify

**Example vulnerable code:**
```javascript
userMessage.innerHTML = `<p class="text-sm">${message}</p>`; // UNSAFE
```

### 3. Missing Database Tables
**Issue:** Code assumes these Supabase tables exist:
- `content_items`
- `chat_sessions`

**Required Schema:**
```sql
-- content_items table
CREATE TABLE content_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('note', 'url', 'file')),
  title TEXT,
  source_url TEXT,
  raw_text TEXT,
  summary TEXT,
  storage_path TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- chat_sessions table
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES auth.users NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE content_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view own content" ON content_items
  FOR SELECT USING (auth.uid() = user_id);
  
CREATE POLICY "Users can insert own content" ON content_items
  FOR INSERT WITH CHECK (auth.uid() = user_id);
  
CREATE POLICY "Users can update own content" ON content_items
  FOR UPDATE USING (auth.uid() = user_id);
  
CREATE POLICY "Users can delete own content" ON content_items
  FOR DELETE USING (auth.uid() = user_id);

-- Repeat for chat_sessions
```

## 🟡 HIGH PRIORITY - Important for Production

### 4. No Error Boundary
**Issue:** Unhandled errors crash the entire app
**Fix:** Add proper error handling:
```javascript
// Global error handler needed
window.onerror = function(msg, url, line, col, error) {
  console.error('Error:', { msg, url, line, col, error });
  showToast('Application error occurred', 'error');
  return false;
};
```

### 5. Placeholder RAG Implementation
**Location:** Lines 1362-1376 (sendChatMessage)
**Issue:** Chat uses setTimeout demo instead of real AI
**Fix:** Implement actual Anthropic API integration:
```javascript
// Need real implementation
const response = await fetch('/api/chat', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ 
    message, 
    sessionId: AppState.currentChat 
  })
});
```

### 6. File Upload Not Functional
**Location:** Lines 1542-1545
**Issue:** File uploads just create placeholder paths
**Fix:** Implement Supabase Storage:
```javascript
const { data, error } = await supabase.storage
  .from('content-files')
  .upload(`${user.id}/${Date.now()}_${file.name}`, file);
```

### 7. Missing Content Sanitization
**Issue:** User input not validated/sanitized
**Fix:** Add input validation:
```javascript
function sanitizeText(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
```

### 8. No Rate Limiting
**Issue:** No protection against API abuse
**Fix:** Implement rate limiting on Supabase functions

### 9. Missing Loading States
**Issue:** Some actions don't show loading indicators
**Fix:** Add loading states for all async operations

### 10. No Offline Support
**Issue:** App fails completely without internet
**Fix:** Add service worker or show proper offline message

## 🟢 MEDIUM PRIORITY - Should Fix

### 11. Memory Leaks
**Issue:** Event listeners not cleaned up
**Fix:** Remove listeners on page change:
```javascript
function cleanup() {
  // Remove all event listeners when changing pages
}
```

### 12. No Pagination
**Issue:** Loading all content at once will fail with large datasets
**Fix:** Implement pagination:
```javascript
.range(offset, offset + limit - 1)
```

### 13. No Search Debouncing Cleanup
**Issue:** Debounce timeout not properly managed
**Fix:** Clear timeout on component unmount

### 14. Hardcoded Limits
**Issue:** Magic numbers throughout (topK, maxLength, etc.)
**Fix:** Move to configuration object

### 15. No Content Validation
**Issue:** No max file size, content length limits
**Fix:** Add validation before upload

## 📋 Testing Checklist

- [ ] Test with actual Supabase credentials
- [ ] Verify all database tables exist
- [ ] Test authentication flow (signup, login, logout)
- [ ] Test XSS protection with malicious input
- [ ] Test file upload with large files
- [ ] Test error handling (network failures)
- [ ] Test with slow network (loading states)
- [ ] Test concurrent sessions
- [ ] Test RLS policies work correctly
- [ ] Load test with 1000+ content items

## 🛠️ Required Environment Variables

Create `.env` file:
```
NEXT_PUBLIC_SUPABASE_URL=your-project-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-key
ANTHROPIC_API_KEY=your-anthropic-key
```

## 🔐 Security Recommendations

1. Enable Supabase RLS on all tables
2. Use service role key only in server-side code
3. Validate all user input server-side
4. Implement rate limiting
5. Add CORS restrictions
6. Use HTTPS only
7. Implement session timeout
8. Add audit logging
9. Sanitize all user-generated content
10. Regular security audits

## 📊 Performance Recommendations

1. Implement virtual scrolling for large lists
2. Add image lazy loading
3. Compress uploaded files
4. Use CDN for static assets
5. Implement caching strategy
6. Optimize database queries
7. Add indexes on frequently queried columns
8. Monitor performance metrics
