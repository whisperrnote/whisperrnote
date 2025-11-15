# Security & Performance Fixes - Database Read Spike

## Critical Issues (Fix First)

### N+1 Query Problems
- [ ] Fix getSharedNotes() - Batch user document fetches instead of Promise.all per collaborator
- [ ] Fix getSharedUsers() - Use single batch query for all user lookups
- [ ] Fix getAllNotes() - Implement cursor-based streaming to avoid loading all notes to memory
- [ ] Fix tag hydration in listNotes() - Cache tag mappings per batch, reduce pivot queries

### Public Endpoint Security
- [ ] Add rate limiting to /shared/[noteid] route (10 requests per minute per IP)
- [ ] Add rate limiting to /verify endpoint (5 email sends per hour per IP)
- [ ] Add rate limiting to /reset endpoint (5 resets per hour per IP)
- [ ] Implement Turnstile CAPTCHA on public routes

### Session Polling Abuse
- [ ] Replace 5-minute interval polling with event-based session invalidation
- [ ] Add exponential backoff to getCurrentUser() calls (don't poll if no activity)
- [ ] Limit refreshUser() calls to max 1 per minute per user
- [ ] Remove automatic refresh on visibility/online events (manual user action only)

## High Priority Issues

### Database Query Optimization
- [ ] Add caching for getSharedNotes() results (5-minute TTL)
- [ ] Add caching for user profile lookups (10-minute TTL)
- [ ] Batch collaborator lookups - fetch all user IDs then batch getDocuments()
- [ ] Implement query result memoization in contexts
- [ ] Add database indexes on userId, isPublic, noteId columns

### Attachment Handling
- [ ] Cache listNoteAttachments() results in request context
- [ ] Use file metadata from note.attachments instead of querying separately
- [ ] Add HTTP cache headers to attachment download responses

### Public Page Performance
- [ ] Add middleware caching for validatePublicNoteAccess() (30-second TTL)
- [ ] Implement metadata caching for public note pages
- [ ] Move metadata generation to server-side with caching

### Shared Notes Page
- [ ] Combine getSharedNotes() + listPublicNotesByUser() into single optimized query
- [ ] Add loading states to prevent multiple simultaneous requests
- [ ] Implement request deduplication in useEffect

## Medium Priority Issues

### In-Memory Rate Limiter
- [ ] Replace in-memory rate limiter with Redis/persistent storage
- [ ] Add per-IP rate limiting middleware
- [ ] Implement sliding window rate limiting for API routes

### Frontend Optimization
- [ ] Add request deduplication for duplicate queries
- [ ] Cache search index in localStorage (Fuse.js)
- [ ] Implement virtual scrolling for large note lists
- [ ] Add debouncing to tag hydration queries

### Logging & Monitoring
- [ ] Remove verbose console.log statements from production code
- [ ] Add structured logging with severity levels
- [ ] Implement request timing metrics
- [ ] Add database query counters/alerts

### Data Cleanup
- [ ] Implement soft-delete for notes (flag, not immediate delete)
- [ ] Add background job to batch delete orphaned notes
- [ ] Implement data retention policies

## Implementation Order
1. Rate limiting on public endpoints (fastest impact)
2. Session polling fix (prevents active user abuse)
3. N+1 query fixes (core performance)
4. Caching layer (long-term sustainability)
5. Database indexes (query optimization)
6. Monitoring & alerting (early warning)
