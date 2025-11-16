# Phase 2 & 3 Testing: UI Guide

## Visual Guide for Testing Through the Web Interface

### Phase 2: Thread Discovery UI Testing

#### Step 1: Navigate to Reddit Discovery

```
Dashboard → Select Website → Reddit Community Discovery
```

Expected page layout:
```
┌─────────────────────────────────────────────────┐
│ Reddit Community Discovery                  🔙   │
│ Find and track relevant Reddit communities     │
│                     🔍 Discover Communities    │
├─────────────────────────────────────────────────┤
│ Total: 5  │ Tracked: 2  │ Easy: 1  │ Medium: 2│
├─────────────────────────────────────────────────┤
│ Filters                                         │
│ Tracked Status: [All Communities ▼]           │
│ Difficulty: [All Difficulties ▼]              │
├─────────────────────────────────────────────────┤
│ Keywords: [Select Keywords section]            │
│ ☐ marketing (Vol: 10K, Diff: 45)              │
│ ☐ seo (Vol: 8K, Diff: 60)                     │
│ 0 of 2 keywords selected                      │
├─────────────────────────────────────────────────┤
│ Communities List                                │
│ [Community 1: r/marketing]                      │
│ [Community 2: r/seo]                           │
│ ...                                             │
└─────────────────────────────────────────────────┘
```

#### Step 2: Select a Tracked Community

Look for a community that is already marked with "📌 TRACKED" badge.

```
Community Card:
┌──────────────────────────────────────────┐
│ r/marketing                     ✅ TRACKED│
│ Marketing Discussions            📊 MEDIUM│
│ Description: For digital marketing...    │
│                                          │
│ Members: 250k │ Active: 5.2k │ Posts: 42│
│ Relevance: 95% │ Posting: ✅ Allowed    │
│                                          │
│ [📌 Track] [🔗 Visit] [📊 History] [🔄 NEW]│
│                                          │
└──────────────────────────────────────────┘
```

#### Step 3: Click "Discover Threads" Button

**Expected Behavior**:
- Button shows loading spinner: "🔄 Discovering..."
- Wait 5-15 seconds for threads to be fetched
- Page shows discovered threads below the community

#### Step 4: View Discovered Threads

After threads are discovered, you should see:

```
Discovered Threads for r/marketing:
┌──────────────────────────────────────────────────┐
│ Thread 1: "Best marketing strategies 2024"       │
│ Posted by: marketing_guru • 2 days ago           │
│ 👍 125 upvotes | 💬 34 comments                 │
│ Relevance: 95% | Keywords: marketing, strategies│
│ [📝 Generate Message] [🔗 View]                 │
├──────────────────────────────────────────────────┤
│ Thread 2: "SEO tips for small businesses"        │
│ Posted by: seo_expert • 1 day ago                │
│ 👍 89 upvotes | 💬 22 comments                  │
│ Relevance: 60% | Keywords: seo                  │
│ [📝 Generate Message] [🔗 View]                 │
├──────────────────────────────────────────────────┤
│ Thread 3: "Digital marketing agency review"      │
│ Posted by: digital_marketer • 3 hours ago        │
│ 👍 12 upvotes | 💬 5 comments                   │
│ Relevance: 88% | Keywords: marketing, digital   │
│ [📝 Generate Message] [🔗 View]                 │
└──────────────────────────────────────────────────┘
```

**What to Verify**:
- ✅ Threads are from last 7 days (check "posted" timestamps)
- ✅ Threads are sorted by relevance (highest first)
- ✅ Relevance scores show keyword matches
- ✅ Engagement metrics (upvotes, comments) are visible
- ✅ No threads without keyword matches are shown

---

### Phase 3: AI Message Generation UI Testing

#### Step 1: Click "Generate Message" Button

After viewing threads, click the "📝 Generate Message" button for a thread.

**Expected Behavior**:
- Modal/panel opens
- Shows loading indicator
- "Generating message with [provider]..."
- Wait 5-10 seconds

```
┌─────────────────────────────────────────────┐
│ Generate Message for Thread                 │
├─────────────────────────────────────────────┤
│ Thread: "Best marketing strategies 2024"    │
│ Subreddit: r/marketing                      │
│                                             │
│ 🔄 Generating message with OpenAI...       │
│ [████████░░░░░░] 60%                        │
│                                             │
└─────────────────────────────────────────────┘
```

#### Step 2: View Generated Message

After generation completes, you should see:

```
┌──────────────────────────────────────────────────┐
│ AI Generated Message                             │
├──────────────────────────────────────────────────┤
│ AI (OpenAI - GPT-3.5):                          │
│                                                  │
│ "Great discussion! I've found that effective    │
│  marketing strategies always involve understanding│
│  your audience first. The key is integrating SEO │
│  into your overall digital marketing plan."     │
│                                                  │
│ Quality Score: 88/100 ✅                        │
│ Tokens Used: 145                                │
│ Provider: OpenAI (gpt-3.5-turbo)               │
│                                                  │
│ Status: Draft                                   │
│                                                  │
├──────────────────────────────────────────────────┤
│ Options:                                         │
│ [🔄 Regenerate] [✏️ Edit] [❌ Discard]          │
│ [→ Next Step]                                   │
└──────────────────────────────────────────────────┘
```

**What to Verify**:
- ✅ Message is 2-4 sentences (appropriate for Reddit)
- ✅ Message is relevant to thread topic
- ✅ Keywords are naturally incorporated
- ✅ No promotional language (unless you set includeLink=true)
- ✅ Quality score is shown (0-100)
- ✅ No spam warnings (good message = no warnings)
- ✅ Provider and model are displayed

#### Step 3: Check Warnings (If Any)

If quality score is low, you should see warnings:

```
┌──────────────────────────────────────────────────┐
│ AI Generated Message                             │
├──────────────────────────────────────────────────┤
│ "CHECK OUT MY AMAZING MARKETING TOOLS NOW!!!    │
│  LIMITED TIME OFFER!!! Visit: example.com"      │
│                                                  │
│ Quality Score: 15/100 ⚠️  POOR                 │
│ Tokens Used: 89                                 │
│                                                  │
│ ⚠️ Warnings:                                    │
│ • Multiple URLs detected                        │
│ • Promotional language detected                 │
│ • Too many exclamation marks (3+)              │
│ • Multiple capitalized words (SHOUTING)        │
│ • Message may be flagged as spam               │
│                                                  │
│ Recommendation: Regenerate or edit manually    │
│                                                  │
├──────────────────────────────────────────────────┤
│ Options:                                         │
│ [🔄 Regenerate] [✏️ Edit] [❌ Discard]          │
└──────────────────────────────────────────────────┘
```

#### Step 4: Regenerate Message (Optional)

Click "🔄 Regenerate" to get a different message:

```
Regenerating message...
Previous Message: "CHECK OUT MY AMAZING..."
New Message: "I appreciate this discussion. Marketing tools..."
Quality Score: 82/100 ✅
```

You can regenerate as many times as needed.

#### Step 5: Edit Message Manually

Click "✏️ Edit" to customize the message:

```
┌──────────────────────────────────────────────────┐
│ Edit Message                                     │
├──────────────────────────────────────────────────┤
│ AI Generated:                                    │
│ "Great discussion! I've found that effective    │
│  marketing strategies always involve..."         │
│                                                  │
│ Your Edits:                                     │
│ ┌──────────────────────────────────────────────┐│
│ │ Great discussion! I've found that SEO is     ││
│ │ crucial for any marketing strategy. The key  ││
│ │ is understanding your target audience.       ││
│ │                                              ││
│ └──────────────────────────────────────────────┘│
│                                                  │
│ Character count: 142/500                        │
│ Quality Score: 85/100 ✅                        │
│                                                  │
│ [Save] [Cancel]                                 │
└──────────────────────────────────────────────────┘
```

**What to Verify**:
- ✅ Can edit message text freely
- ✅ Quality score updates as you edit
- ✅ Warnings appear/disappear based on content
- ✅ Edited message is saved (status: "Reviewed")

#### Step 6: Review Final Message

After editing, see the final message that will be posted:

```
┌──────────────────────────────────────────────────┐
│ Message Ready to Post                            │
├──────────────────────────────────────────────────┤
│ Final Message (User Edited):                    │
│ "Great discussion! I've found that SEO is      │
│  crucial for any marketing strategy. The key   │
│  is understanding your target audience."        │
│                                                  │
│ Source: User Custom (AI Generated as base)     │
│ Status: ✅ Reviewed                             │
│ Quality: 85/100                                 │
│                                                  │
│ Ready to Post!                                  │
│ [← Back] [→ Continue to Post]                  │
└──────────────────────────────────────────────────┘
```

---

## Detailed Test Scenarios

### Scenario 1: Perfect Flow (Best Case)

1. ✅ Select community with tracked threads
2. ✅ Click "Discover Threads"
3. ✅ See 3-5 relevant threads
4. ✅ Click "Generate Message" on most relevant thread
5. ✅ Get quality score 80+
6. ✅ No warnings
7. ✅ Accept message (ready for Phase 5 posting)

**Expected Time**: 30-40 seconds total

### Scenario 2: With Regeneration

1. ✅ Generate message
2. ⚠️ Quality score is 65/100 (medium)
3. 🔄 Click "Regenerate"
4. ✅ Get quality score 88/100
5. ✅ Accept new message

**Expected Time**: 20-30 seconds total

### Scenario 3: With Manual Edit

1. ✅ Generate message
2. ✅ Quality score is good (80/100)
3. ✏️ Click "Edit"
4. ✏️ Make small changes to tone
5. ✅ New score is 82/100
6. ✅ Save edits

**Expected Time**: 30-40 seconds total

### Scenario 4: Multiple Providers

1. ✅ Check Settings → Select OpenAI
2. ✅ Generate message
3. 📊 Note quality and style
4. 🔄 Change Settings → Select Claude
5. 🔄 Regenerate message
6. 📊 Compare with OpenAI version
7. ✅ Choose preferred provider

**Expected Time**: 40-60 seconds total

---

## Troubleshooting UI Issues

### Issue: "Discover Threads button not showing"

**Solution**:
- Make sure you have tracked communities
- Refresh the page
- Check browser console (F12) for errors

### Issue: "No threads discovered"

**Possible reasons**:
- Subreddit has no recent posts
- No posts match your keywords
- Subreddit is private

**Solution**:
- Try different subreddit
- Try with fewer keyword filters
- Check community is not private (visiting Reddit directly)

### Issue: "AI message generation fails with 500 error"

**Possible reasons**:
- API key not configured
- API key is invalid
- API quota exceeded

**Solution**:
1. Go to Settings → API Keys
2. Verify OpenAI/Claude/Gemini key is configured
3. Check API key is valid (test directly with provider)
4. Check API quota/usage
5. Try different provider

### Issue: "Message quality score always low"

**Check**:
- Is message including unwanted promotional language?
- Too many special characters?
- Try with different thread
- Regenerate multiple times

---

## Performance Expectations

| Operation | Expected Time | Notes |
|-----------|---------------|-------|
| Discover Threads | 5-15 sec | Depends on subreddit size |
| Generate Message (OpenAI) | 5-10 sec | Fastest, cheapest |
| Generate Message (Claude) | 8-12 sec | Higher quality |
| Generate Message (Gemini) | 4-8 sec | Very fast |
| Regenerate Message | 5-10 sec | Reuses context |
| Edit Message | 1-2 sec | Local, instant |

---

## Success Checklist

### Phase 2: Thread Discovery
- [ ] Threads are discovered without errors
- [ ] Only last 7 days of threads shown
- [ ] Threads sorted by relevance
- [ ] Engagement metrics are accurate
- [ ] Keyword matches are displayed
- [ ] Can view multiple threads
- [ ] Pagination works (if 20+ threads)

### Phase 3: AI Message Generation
- [ ] Messages generate without errors
- [ ] Messages are appropriate length (2-4 sentences)
- [ ] Quality score calculated (0-100)
- [ ] Warnings show for spam patterns
- [ ] Can regenerate messages
- [ ] Can edit messages manually
- [ ] Multiple providers work
- [ ] API key validation works

---

## Next Steps

Once you've verified Phase 2 & 3 work:
1. ✅ Test all scenarios above
2. ✅ Document any bugs/issues
3. ✅ Test with different communities/keywords
4. ✅ Ready for Phase 4: Reddit OAuth Integration
