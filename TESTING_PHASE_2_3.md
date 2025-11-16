# Testing Guide: Phase 2 & 3 (Thread Discovery & AI Message Generation)

## Prerequisites

1. **Database**: PostgreSQL running with initialized schema
2. **Backend**: Node.js server running on port 5000
3. **Frontend**: React app running on port 3000
4. **Authentication**: Valid user account logged in
5. **Reddit Communities**: Discovered communities already tracked
6. **AI API Key**: OpenAI, Claude, or Gemini key configured in Settings

## Part 1: Testing Phase 2 (Thread Discovery)

### Test 1.1: Discover Threads in a Community

**Steps**:
1. Go to Dashboard → Select a Website
2. Click "Reddit Community Discovery"
3. Select a tracked community from the list
4. Click the **"Discover Threads"** button (should be next to each community, or there should be a button to discover threads for selected community)

**Expected Results**:
- System should fetch recent threads from that subreddit (last 7 days)
- Should display relevant threads ranked by:
  - Relevance score (keyword matches)
  - Engagement (upvotes + comments)
- Each thread should show:
  - Thread title
  - Author name
  - Upvotes count
  - Comments count
  - Posted time
  - Relevance score (0-100%)
  - Matched keywords

**Backend API Call**:
```bash
POST /api/reddit/:websiteId/communities/:communityId/threads
```

**Check Backend Logs**:
```
🔗 Discovering threads in r/[subreddit-name]...
✅ Found X threads from last 7 days in r/[subreddit-name]
✅ Saved X threads to database
```

### Test 1.2: View Saved Threads

**Steps**:
1. After threads are discovered, the page should reload or list threads
2. Click on a community to view its discovered threads
3. Threads should be sorted by relevance score (highest first)

**Expected Results**:
- Threads from last 7 days only (no old threads)
- Threads with keyword matches in title are prioritized
- Sorting shows most relevant threads first
- Pagination works (if more than 20 threads)

**Backend API Call**:
```bash
GET /api/reddit/:websiteId/communities/:communityId/threads?limit=20&offset=0
```

### Test 1.3: Check Thread Relevance Scoring

**Steps**:
1. Look at discovered threads
2. Check relevance scores for different keywords
3. Example: if your keywords are ["marketing", "SEO"]
   - Thread with "Marketing strategies" in title = ~50%
   - Thread with "Marketing and SEO tools" in title = ~100%
   - Thread without keywords = filtered out (not shown)

**Expected Results**:
- Thread with both keywords in title: 100% relevance
- Thread with one keyword in title: 50-75% relevance
- Thread with keyword in content (not title): 25-50% relevance
- Thread with no matches: 0% (filtered out)

### Test 1.4: Database Verification

Check if threads are saved in the database:

```sql
SELECT * FROM reddit_threads
WHERE website_id = [YOUR_WEBSITE_ID]
LIMIT 10;
```

**Expected Columns**:
- `id`: Primary key
- `thread_id`: Reddit thread ID
- `thread_title`: Thread title
- `thread_url`: Reddit URL
- `upvotes`, `comments_count`: Engagement metrics
- `relevance_score`: 0-100
- `keyword_matches`: Array of matched keywords (e.g., `["marketing", "seo"]`)
- `posted_date`: When thread was created
- `created_at`: When we discovered it

---

## Part 2: Testing Phase 3 (AI Message Generation)

### Prerequisites for Phase 3 Tests

Before testing message generation, ensure:

1. **Configure AI API Key**:
   - Go to Settings → API Keys
   - Add your OpenAI/Claude/Gemini API key
   - Set as preferred provider
   - Save and verify

2. **Have Discovered Threads**:
   - Run Part 1 tests first to have threads to work with

### Test 2.1: Generate AI Message

**Steps**:
1. After discovering threads, select a thread
2. Click **"Generate Message"** button
3. Wait for message to be generated (5-10 seconds)

**Expected Results**:
- AI generates a 2-4 sentence Reddit comment
- Message is relevant to thread topic
- Message naturally incorporates your keywords
- No promotional language (unless you set includeLink=true)
- Returns quality score (0-100)
- No warnings if score > 50

**Example Generated Message**:
```
"This is a great point! I've found that task management tools work best when
they're integrated with your project planning workflow. The key is finding
something that doesn't add extra steps to your process."
```

**Backend API Call**:
```bash
POST /api/ai/reddit/generate-message
Content-Type: application/json

{
  "websiteId": 1,
  "threadId": 123,
  "threadTitle": "Best project management tools?",
  "subredditName": "projectmanagement",
  "includeLink": false
}
```

**Response Example**:
```json
{
  "message": "Great discussion! Task management integrated with project planning is crucial...",
  "provider": "openai",
  "model": "gpt-3.5-turbo",
  "tokensUsed": 145,
  "engagementId": 456,
  "validation": {
    "isValid": true,
    "warnings": [],
    "score": 88
  },
  "createdAt": "2024-01-15T10:30:00Z"
}
```

### Test 2.2: Message Validation & Quality Scoring

**Test Case A: Good Message**
```
"I've been using this approach and it works great. Highly recommend checking it out!"
Quality Score: 90/100
Warnings: None
```

**Test Case B: Message with Warnings**
```
"CHECK OUT MY WEBSITE NOW!!! LIMITED TIME OFFER!!! Get 50% OFF!!!
https://example.com"
Quality Score: 15/100
Warnings:
- Multiple URLs detected
- Promotional language detected
- Too many exclamation marks
- All caps detected
```

### Test 2.3: Regenerate Message

**Steps**:
1. After generating a message, see if there's a "Regenerate" button
2. Click to generate an alternative message
3. Should get a different message from the same AI provider

**Expected Results**:
- New message is different from previous
- Still relevant to the thread
- Quality score may vary
- Can regenerate multiple times

**Backend API Call**:
```bash
POST /api/ai/reddit/regenerate-message
Content-Type: application/json

{
  "engagementId": 456,
  "threadTitle": "Best project management tools?",
  "subredditName": "projectmanagement",
  "includeLink": false
}
```

### Test 2.4: Edit Generated Message

**Steps**:
1. After message is generated, click "Edit" or "Customize"
2. Modify the message text manually
3. Click "Save" or "Update"

**Expected Results**:
- Your custom message is saved
- Status changes from "draft" to "reviewed"
- Custom message will be used when posting (overrides AI message)
- Message is re-validated with new quality score

**Backend API Call**:
```bash
PUT /api/ai/reddit/engagement/:engagementId
Content-Type: application/json

{
  "userCustomMessage": "Your edited message here...",
  "includeLink": false
}
```

### Test 2.5: View Engagement Details

**Steps**:
1. After creating/editing a message, click "View Details" or similar
2. Should show both AI-generated and user-edited versions

**Expected Results**:
- AI generated message shown
- User custom message shown (if edited)
- Status indicator (draft/reviewed/sent)
- Timestamps for creation/updates

**Backend API Call**:
```bash
GET /api/ai/reddit/engagement/:engagementId
```

**Response Example**:
```json
{
  "id": 456,
  "threadId": 123,
  "threadTitle": "Best project management tools?",
  "threadUrl": "https://reddit.com/r/projectmanagement/...",
  "aiGeneratedMessage": "Original AI message...",
  "userCustomMessage": "Your edited version...",
  "finalMessage": "Your edited version...",
  "messageSource": "user",
  "status": "reviewed",
  "createdAt": "2024-01-15T10:30:00Z",
  "updatedAt": "2024-01-15T10:35:00Z"
}
```

### Test 2.6: Test Different AI Providers

**If you have multiple API keys configured**:

1. Set OpenAI as preferred → Generate message → Note quality/style
2. Switch to Claude → Generate message → Compare
3. Switch to Gemini → Generate message → Compare

**Expected Differences**:
- **OpenAI**: Creative, natural conversational tone
- **Claude**: More structured, thoughtful responses
- **Gemini**: Fast, concise, direct

### Test 2.7: Include Product Link Option

**Steps**:
1. Generate a message with `includeLink: true`
2. System should optionally mention your website
3. Only include link if relevant to thread topic

**Expected Results**:
- Link is included naturally (not forced)
- If not relevant to question, link is omitted anyway
- Message still reads naturally with or without link
- Quality score might be slightly lower (if forced)

**Example with Link**:
```
"I've dealt with this exact problem! Our approach is to integrate task management
with project planning. We document this on our site: example.com - might be
helpful for your workflow!"
```

---

## Debugging & Troubleshooting

### Issue: "Thread discovery not showing any results"

**Check 1**: Are there tracked communities?
```sql
SELECT * FROM reddit_communities
WHERE website_id = [YOUR_WEBSITE_ID]
AND tracked = true;
```

**Check 2**: Are threads being discovered?
```sql
SELECT * FROM reddit_threads
WHERE website_id = [YOUR_WEBSITE_ID];
```

**Check 3**: Verify backend logs show discovery:
```
Look for: "🔗 Discovering threads in r/..."
Look for: "✅ Found X threads from last 7 days"
```

### Issue: "AI message generation failing"

**Check 1**: API key configured?
```sql
SELECT * FROM user_api_keys
WHERE user_id = [YOUR_USER_ID];
```

**Check 2**: API key is valid?
- Try testing the API key directly with the provider
- OpenAI: `curl -H "Authorization: Bearer YOUR_KEY" https://api.openai.com/v1/models`

**Check 3**: Backend logs:
```
Look for: "🤖 Generating AI message for Reddit thread"
Look for: "✅ Message generated"
Look for: Error messages if API call failed
```

**Check 4**: Verify provider is correct:
```sql
SELECT preferred_ai_provider FROM user_settings
WHERE user_id = [YOUR_USER_ID];
```

### Issue: "Message quality score is low"

**Possible causes**:
- Too many exclamation marks (!!!)
- Too many capitalized words
- Contains promotional language
- Message too short or too long
- Contains URLs

**Solution**: Regenerate or edit the message

### Issue: "No threads found in subreddit"

**Possible causes**:
- Subreddit has no recent posts (last 7 days)
- Subreddit is private
- No threads match keywords

**Solution**: Try with different keywords or different subreddit

---

## Test Scenarios

### Scenario 1: Complete Flow Test

1. ✅ Discover communities (if not already done)
2. ✅ Discover threads in a community
3. ✅ Generate message for a thread
4. ✅ Validate message quality
5. ✅ Edit message if needed
6. ✅ View engagement details
7. ✅ Check database records

### Scenario 2: Multi-Provider Test

1. ✅ Generate message with OpenAI
2. ✅ Regenerate with Claude
3. ✅ Regenerate with Gemini
4. ✅ Compare quality and style
5. ✅ Choose best provider preference

### Scenario 3: Edge Cases

1. ✅ Very long thread title (test truncation)
2. ✅ Thread with special characters/emojis
3. ✅ Test with 0 matched keywords
4. ✅ Test with all keywords matched
5. ✅ Edit message to be very short (< 20 chars)
6. ✅ Edit message to be very long (> 500 chars)

---

## Success Criteria

### Phase 2 (Thread Discovery) ✅
- [ ] Threads are discovered from selected subreddit
- [ ] Only threads from last 7 days are shown
- [ ] Threads are ranked by relevance score
- [ ] Keyword matches are highlighted
- [ ] Engagement metrics (upvotes, comments) are accurate
- [ ] Database saves threads correctly

### Phase 3 (AI Message Generation) ✅
- [ ] Messages are generated without errors
- [ ] Messages are 2-4 sentences (optimal for Reddit)
- [ ] Messages incorporate keywords naturally
- [ ] Quality score is calculated (0-100)
- [ ] Validation warnings appear for spam patterns
- [ ] Can regenerate messages
- [ ] Can edit messages manually
- [ ] User custom messages override AI messages
- [ ] Multiple AI providers work correctly

---

## Sample Test Data

If you need to manually create test data for debugging:

### Create Test Community
```sql
INSERT INTO reddit_communities (
  website_id, subreddit_name, display_name, description,
  subscribers, active_users, relevance_score, posting_allowed,
  difficulty_to_post, tracked, created_at
) VALUES (
  1, 'testsubreddit', 'Test Subreddit', 'A test subreddit',
  10000, 500, 85, true, 'easy', true, NOW()
);
```

### Create Test Thread
```sql
INSERT INTO reddit_threads (
  website_id, reddit_community_id, thread_id, thread_title,
  thread_url, author, upvotes, comments_count, posted_date,
  relevance_score, keyword_matches, created_at
) VALUES (
  1, 1, 'abc123', 'Best marketing strategies for 2024',
  'https://reddit.com/r/marketing/abc123', 'testuser',
  150, 42, NOW() - INTERVAL '2 days',
  85, ARRAY['marketing', 'strategies'], NOW()
);
```

---

## Next Steps After Testing

Once you've verified Phase 2 & 3 work correctly:
1. Document any issues found
2. Fix bugs if any
3. Proceed to Phase 4: Reddit OAuth Integration
4. Phase 5: Thread Posting UI with message review
5. Phase 6: Track post performance and history
