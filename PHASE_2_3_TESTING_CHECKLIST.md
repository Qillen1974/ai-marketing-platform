# Phase 2 & 3 Testing Checklist

## Pre-Testing Setup

- [ ] PostgreSQL database is running
- [ ] Backend server is running (`npm start` on port 5000)
- [ ] Frontend is running (`npm run dev` on port 3000)
- [ ] You are logged in as a user
- [ ] You have at least one website configured
- [ ] You have at least one Reddit community tracked (or discover communities first)
- [ ] **CRITICAL**: AI API key configured (OpenAI/Claude/Gemini) in Settings
- [ ] Preferred AI provider selected in Settings

---

## Phase 2: Thread Discovery Testing

### Setup for Phase 2
- [ ] Navigate to: Dashboard → Select Website → Reddit Community Discovery
- [ ] Confirm you see the "Select Keywords to Target" section
- [ ] Verify you have website target keywords set (or set some in website settings)

### Test 1.1: Discover Threads Without Keyword Filtering
**Description**: Discover threads using all target keywords

**Steps**:
1. [ ] On Reddit Discovery page, leave all keywords unchecked
2. [ ] Locate a tracked community (has 📌 TRACKED badge)
3. [ ] Look for "Discover Threads" button or click community to expand
4. [ ] Click "Discover Threads"

**Expected Results**:
- [ ] Shows "Discovering..." loading state
- [ ] Completes in 5-15 seconds
- [ ] Shows success message with thread count
- [ ] Lists 3-10 relevant threads
- [ ] Each thread shows title, author, upvotes, comments, relevance score

**Backend Verification**:
- [ ] Check logs: `"🔗 Discovering threads in r/..."`
- [ ] Check logs: `"✅ Found X threads from last 7 days"`
- [ ] Check database: Threads saved in `reddit_threads` table

### Test 1.2: Discover Threads With Keyword Filtering
**Description**: Discover threads using only selected keywords

**Steps**:
1. [ ] On Reddit Discovery page, select 2-3 specific keywords
2. [ ] Verify counter shows "X of Y keywords selected"
3. [ ] Click "Discover Threads" on same community
4. [ ] Observe threads discovered

**Expected Results**:
- [ ] Only threads matching selected keywords shown
- [ ] Fewer threads than without filtering (or similar)
- [ ] Relevance scores higher for selected keywords
- [ ] Status message confirms filtered keywords used

**Backend Verification**:
- [ ] Check logs: `"📌 Using X selected keywords for Reddit discovery"`
- [ ] Compare thread count vs Test 1.1

### Test 1.3: Verify Thread Relevance Scoring
**Description**: Confirm threads are ranked by relevance

**Steps**:
1. [ ] Look at discovered threads list
2. [ ] Check top threads have highest relevance scores
3. [ ] Verify keyword matches are highlighted
4. [ ] Note example: 100% = all keywords in title, 50% = one keyword, etc.

**Expected Results**:
- [ ] Threads sorted by relevance (top to bottom)
- [ ] Relevance scores decrease down the list
- [ ] Secondary sorting by engagement (same relevance = higher upvotes first)
- [ ] Keyword matches clearly shown

**Example**:
```
Thread 1: "Digital marketing strategies and SEO" - 100% (both keywords)
Thread 2: "Marketing for startups" - 50% (one keyword)
Thread 3: "SEO tools review" - 50% (one keyword, higher engagement)
Thread 4: "Content creation tips" - 0% (filtered out, not shown)
```

### Test 1.4: Verify Last 7 Days Filter
**Description**: Confirm only recent threads shown

**Steps**:
1. [ ] Look at thread timestamps
2. [ ] Check oldest thread is within 7 days ago
3. [ ] Verify no threads older than 7 days exist

**Expected Results**:
- [ ] All threads posted within last 7 days
- [ ] No threads from previous weeks
- [ ] Timestamps accurate (relative to current date)

**Backend Verification**:
- [ ] Query database: Check `posted_date` values
- [ ] All dates should be >= TODAY - 7 DAYS

### Test 1.5: Multiple Communities Threading
**Description**: Test discovering threads from different communities

**Steps**:
1. [ ] Have at least 2 tracked communities
2. [ ] Discover threads in Community A
3. [ ] Note thread count and relevance scores
4. [ ] Discover threads in Community B
5. [ ] Compare results

**Expected Results**:
- [ ] Each community can have different thread counts
- [ ] Relevance scores calculated independently per community
- [ ] No cross-contamination between communities
- [ ] Database separates threads by community

**Database Verification**:
```sql
SELECT reddit_community_id, COUNT(*) FROM reddit_threads
GROUP BY reddit_community_id;
```

### Phase 2 Summary
- [ ] All tests 1.1 - 1.5 passed
- [ ] No errors in backend logs
- [ ] Database has threads properly saved
- [ ] Ready for Phase 3

---

## Phase 3: AI Message Generation Testing

### Setup for Phase 3
- [ ] Have discovered threads from Phase 2
- [ ] Have AI API key configured (OpenAI/Claude/Gemini)
- [ ] Preferred AI provider set
- [ ] Navigate to thread discovery page with discovered threads

### Test 2.1: Generate AI Message - Basic
**Description**: Generate first AI message for a thread

**Steps**:
1. [ ] Click "Generate Message" on a discovered thread
2. [ ] Wait for generation (5-10 seconds)
3. [ ] Observe generated message appears

**Expected Results**:
- [ ] Shows "Generating message..." status
- [ ] Completes without errors
- [ ] Displays AI-generated text (2-4 sentences)
- [ ] Shows quality score (0-100)
- [ ] Shows provider and model used
- [ ] Shows tokens used

**Example Expected Output**:
```
AI Message Generated (OpenAI - GPT-3.5-Turbo):

"This is a great discussion! I've found that effective
marketing strategies always start with understanding your
audience. Combining SEO with content marketing often yields
the best results."

Quality Score: 87/100 ✅
Tokens Used: 142
Provider: OpenAI (gpt-3.5-turbo)
```

**Backend Verification**:
- [ ] Check logs: `"🤖 Generating AI message for Reddit thread"`
- [ ] Check logs: `"✅ Message generated (X tokens)"`
- [ ] No API errors in logs

### Test 2.2: Message Validation - Good Message
**Description**: Verify validation on high-quality message

**Steps**:
1. [ ] Generate message (from Test 2.1)
2. [ ] Check quality score

**Expected Results**:
- [ ] Quality score is 70+ (good message)
- [ ] No warnings displayed (or minimal warnings)
- [ ] Message is readable 2-4 sentence format
- [ ] No promotional language
- [ ] Keywords incorporated naturally

### Test 2.3: Message Validation - Poor Message (Edge Case)
**Description**: See how validation handles spam patterns

**Steps**:
1. [ ] Edit a generated message to include spam patterns:
   - Add URLs
   - Add multiple !!!
   - Use ALL CAPS words
   - Add promotional language
2. [ ] Check updated quality score

**Expected Results**:
- [ ] Quality score drops significantly (< 50)
- [ ] Warnings appear for each issue:
   - "URLs detected"
   - "Too many exclamation marks"
   - "Multiple capitalized words"
   - "Promotional language detected"
- [ ] Score is calculated correctly

### Test 2.4: Regenerate Message
**Description**: Generate multiple versions of message

**Steps**:
1. [ ] Generate initial message
2. [ ] Click "Regenerate" button
3. [ ] Observe new message appears
4. [ ] Repeat regenerate 2-3 times

**Expected Results**:
- [ ] Each regeneration produces different message
- [ ] Messages are all relevant to thread
- [ ] Quality scores may vary (70-95 range typically)
- [ ] Same thread, different message each time
- [ ] Can regenerate unlimited times

**Expected Variety**:
```
Generation 1: "This is a great point. Marketing strategies..."
Generation 2: "I completely agree. SEO is crucial for any..."
Generation 3: "Great discussion! Understanding your audience..."
```

### Test 2.5: Edit Message Manually
**Description**: User can customize AI-generated message

**Steps**:
1. [ ] Generate message (quality score 80+)
2. [ ] Click "Edit" button
3. [ ] Make small changes:
   - Fix grammar
   - Adjust tone
   - Add detail
4. [ ] Click "Save"

**Expected Results**:
- [ ] Message text is editable
- [ ] Quality score updates as you edit
- [ ] Character count shown
- [ ] Save button updates the message
- [ ] Status changes to "Reviewed"
- [ ] Custom message is preserved

**Example Edit**:
```
Original: "Great discussion! I've found that SEO is important
for marketing. Keywords matter a lot."

Edited: "Great discussion! I've found that SEO integrated with
your content strategy is crucial. The key is understanding
which keywords your audience actually uses."

New Quality Score: 84/100 ✅
```

### Test 2.6: Switch AI Providers (If Multiple Configured)
**Description**: Test different AI providers

**Prerequisites**:
- [ ] Configure OpenAI API key
- [ ] Configure Claude API key (optional)
- [ ] Configure Gemini API key (optional)

**Steps**:
1. [ ] Generate message with OpenAI
2. [ ] Note quality, style, tokens used
3. [ ] Go to Settings → Change preferred provider to Claude
4. [ ] Return to thread page
5. [ ] Regenerate message (should use Claude now)
6. [ ] Compare with OpenAI version

**Expected Results**:
- [ ] Each provider generates different text
- [ ] Message quality varies by provider
- [ ] Claude often more thoughtful (longer)
- [ ] OpenAI more conversational
- [ ] Gemini faster response
- [ ] All providers produce valid messages

**Comparison Example**:
```
OpenAI: "Great discussion! Marketing strategies work best..."
Claude: "This is an insightful conversation about marketing
approaches. When implementing digital strategies, it's
important to consider..."
Gemini: "Good point! SEO and marketing go hand in hand..."
```

### Test 2.7: Include/Exclude Product Link
**Description**: Test link inclusion option

**Steps**:
1. [ ] Generate message with `includeLink: false` (default)
2. [ ] Note: No product link in message
3. [ ] Edit message to manually add link
4. [ ] Check quality score (may drop)

**Expected Results**:
- [ ] Without link: Clean, natural message
- [ ] Link only included if relevant
- [ ] Quality score same or slightly lower with link
- [ ] Message still readable with link included

**Example with Link**:
```
"Great discussion! I've found that understanding your audience
is key to marketing success. We actually write about this on
our platform [website.com] - might be helpful for your
approach too."
```

### Test 2.8: Engagement Details View
**Description**: View all message versions for an engagement

**Steps**:
1. [ ] Generate message
2. [ ] Edit it manually
3. [ ] Click "View Details" or navigate to engagement
4. [ ] Observe both versions shown

**Expected Results**:
- [ ] AI-generated message shown
- [ ] User custom message shown (if edited)
- [ ] Final message indicated (user custom takes priority)
- [ ] Status shows (Draft/Reviewed/Sent)
- [ ] Timestamps shown for creation/updates

**Expected Display**:
```
Engagement Details:
- Thread: "Best marketing strategies?"
- AI Generated: "This is a great point..."
- User Custom: "This is a great point. I've found..."
- Final Message: User Custom (above)
- Status: Reviewed ✅
- Created: 2024-01-15 10:30 UTC
- Updated: 2024-01-15 10:35 UTC
```

### Test 2.9: Error Handling - Invalid API Key
**Description**: Test behavior when API key is invalid

**Steps**:
1. [ ] Go to Settings
2. [ ] Intentionally enter invalid API key
3. [ ] Save
4. [ ] Try to generate message
5. [ ] Observe error handling

**Expected Results**:
- [ ] Clear error message shown
- [ ] Error indicates "API key invalid" or "Authentication failed"
- [ ] Suggests checking Settings
- [ ] Option to regenerate with valid key

### Test 2.10: Error Handling - API Quota Exceeded
**Description**: Test behavior when API quota hit

**Steps**:
1. [ ] If using free/trial tier OpenAI key that's near quota:
2. [ ] Try to generate message multiple times
3. [ ] Observe quota exceeded error

**Expected Results**:
- [ ] Clear error about quota
- [ ] Message: "API quota exceeded, upgrade account"
- [ ] Option to upgrade or use different provider

### Phase 3 Summary
- [ ] All tests 2.1 - 2.10 passed
- [ ] No errors in backend logs
- [ ] Messages are high quality
- [ ] All validation working
- [ ] Multiple providers tested
- [ ] Ready for Phase 4

---

## Final Phase 2 & 3 Verification

### Database Integrity Check

**Run these SQL queries**:

```sql
-- Verify threads table populated
SELECT COUNT(*) as total_threads FROM reddit_threads
WHERE created_at > NOW() - INTERVAL '1 day';
-- Expected: > 0

-- Verify engagement table populated
SELECT COUNT(*) as total_engagements FROM reddit_thread_engagements
WHERE created_at > NOW() - INTERVAL '1 day';
-- Expected: > 0

-- Check thread quality
SELECT
  rt.thread_title,
  rt.relevance_score,
  rt.keyword_matches,
  COUNT(rte.id) as engagement_count
FROM reddit_threads rt
LEFT JOIN reddit_thread_engagements rte ON rt.id = rte.reddit_thread_id
GROUP BY rt.id
LIMIT 10;
-- Expected: threads with relevance_scores and engagements

-- Check message statuses
SELECT
  status,
  COUNT(*) as count
FROM reddit_thread_engagements
GROUP BY status;
-- Expected: draft, reviewed statuses present
```

### Backend Logs Verification

Search logs for these patterns (success indicators):

✅ **Phase 2 Success Patterns**:
```
✅ Discovering threads in r/[subreddit]
✅ Found X threads from last 7 days
✅ Saved X threads to database
```

✅ **Phase 3 Success Patterns**:
```
🤖 Generating AI message for Reddit thread
✅ Message generated (X tokens)
```

❌ **Error Patterns to Check For**:
```
❌ Error discovering threads
❌ Error generating AI message
❌ API error
```

---

## Known Limitations & Gotchas

### Thread Discovery
- ⚠️ Very new subreddits may have few threads
- ⚠️ Private subreddits won't show threads
- ⚠️ Subreddits with moderation filters may reduce results
- ⚠️ First discovery takes longer (API calls to Reddit)

### AI Message Generation
- ⚠️ Quality depends on thread clarity
- ⚠️ Very niche subreddits need specific keywords
- ⚠️ API rate limits may apply
- ⚠️ Token usage varies (costs differ per provider)

---

## Troubleshooting Quick Reference

| Issue | Solution |
|-------|----------|
| No threads discovered | Try different subreddit or check if it's private |
| Low relevance scores | Check keyword matches in thread titles |
| Message generation fails | Verify API key in Settings, check tokens |
| Quality score too low | Regenerate or edit message manually |
| Wrong AI provider used | Check preferred_ai_provider in user_settings table |
| Threads not saving | Check database permissions, check disk space |

---

## Sign-Off

When all tests pass, fill in:

- [ ] Tester: _________________
- [ ] Date: _________________
- [ ] Issues Found: _____ (0 = fully passing)
- [ ] Notes: _________________________________

**Phase 2 & 3 Ready for Production**: ✅ YES / ❌ NO
