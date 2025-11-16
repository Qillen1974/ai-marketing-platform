#!/bin/bash

# Quick Testing Commands for Phase 2 & 3
# Run these curl commands to test the API directly

# Color codes for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
API_BASE="http://localhost:5000/api"
WEBSITE_ID=1
COMMUNITY_ID=1
THREAD_ID=123
USER_TOKEN="YOUR_JWT_TOKEN_HERE"

echo -e "${BLUE}=== Phase 2 & 3 Testing Commands ===${NC}\n"

# Test 1: Discover Threads
echo -e "${GREEN}Test 1: Discover Threads in Community${NC}"
echo "Command:"
echo "curl -X POST $API_BASE/reddit/$WEBSITE_ID/communities/$COMMUNITY_ID/threads \\"
echo "  -H 'Authorization: Bearer $USER_TOKEN' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{}'"
echo ""
echo "Expected: 200 status with threads array"
echo ""

# Test 2: Get Threads
echo -e "${GREEN}Test 2: Fetch Discovered Threads${NC}"
echo "Command:"
echo "curl -X GET '$API_BASE/reddit/$WEBSITE_ID/communities/$COMMUNITY_ID/threads?limit=20&offset=0' \\"
echo "  -H 'Authorization: Bearer $USER_TOKEN'"
echo ""
echo "Expected: 200 status with threads list, pagination"
echo ""

# Test 3: Generate AI Message
echo -e "${GREEN}Test 3: Generate AI Message${NC}"
echo "Command:"
echo "curl -X POST $API_BASE/ai/reddit/generate-message \\"
echo "  -H 'Authorization: Bearer $USER_TOKEN' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{
    \"websiteId\": $WEBSITE_ID,
    \"threadId\": $THREAD_ID,
    \"threadTitle\": \"Best project management tools?\",
    \"subredditName\": \"projectmanagement\",
    \"includeLink\": false
  }'"
echo ""
echo "Expected: 200 status with generated message and validation score"
echo ""

# Test 4: Regenerate Message
echo -e "${GREEN}Test 4: Regenerate AI Message${NC}"
echo "Command:"
echo "curl -X POST $API_BASE/ai/reddit/regenerate-message \\"
echo "  -H 'Authorization: Bearer $USER_TOKEN' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{
    \"engagementId\": 456,
    \"threadTitle\": \"Best project management tools?\",
    \"subredditName\": \"projectmanagement\",
    \"includeLink\": false
  }'"
echo ""
echo "Expected: 200 status with new message"
echo ""

# Test 5: Update Engagement Message
echo -e "${GREEN}Test 5: Edit Generated Message${NC}"
echo "Command:"
echo "curl -X PUT $API_BASE/ai/reddit/engagement/456 \\"
echo "  -H 'Authorization: Bearer $USER_TOKEN' \\"
echo "  -H 'Content-Type: application/json' \\"
echo "  -d '{
    \"userCustomMessage\": \"Your edited message here...\"
  }'"
echo ""
echo "Expected: 200 status with updated message"
echo ""

# Test 6: Get Engagement Details
echo -e "${GREEN}Test 6: Get Engagement Details${NC}"
echo "Command:"
echo "curl -X GET $API_BASE/ai/reddit/engagement/456 \\"
echo "  -H 'Authorization: Bearer $USER_TOKEN'"
echo ""
echo "Expected: 200 status with all message versions"
echo ""

# Database check commands
echo -e "${BLUE}=== Database Verification Commands ===${NC}\n"

echo -e "${GREEN}Check Discovered Threads:${NC}"
echo "SELECT * FROM reddit_threads WHERE website_id = 1 LIMIT 10;"
echo ""

echo -e "${GREEN}Check Thread Engagement:${NC}"
echo "SELECT * FROM reddit_thread_engagements WHERE website_id = 1 LIMIT 10;"
echo ""

echo -e "${GREEN}Check User API Keys:${NC}"
echo "SELECT provider, is_verified FROM user_api_keys WHERE user_id = 1;"
echo ""

echo -e "${GREEN}Check Preferred AI Provider:${NC}"
echo "SELECT preferred_ai_provider FROM user_settings WHERE user_id = 1;"
echo ""

# Debugging tips
echo -e "${BLUE}=== Debugging Tips ===${NC}\n"

echo -e "${GREEN}1. Get your JWT token:${NC}"
echo "   - Login via frontend"
echo "   - Open DevTools (F12) → Application → Local Storage"
echo "   - Copy the 'token' value"
echo "   - Use it in Authorization header"
echo ""

echo -e "${GREEN}2. Check backend logs:${NC}"
echo "   - Look for: '🔗 Discovering threads in r/...' (Phase 2)"
echo "   - Look for: '🤖 Generating AI message' (Phase 3)"
echo "   - Look for error messages if requests fail"
echo ""

echo -e "${GREEN}3. Verify API key is working:${NC}"
echo "   - Check that user_api_keys table has your provider"
echo "   - Check that user_settings has preferred_ai_provider set"
echo "   - Try calling OpenAI API directly to verify key"
echo ""

echo -e "${GREEN}4. Common errors:${NC}"
echo "   - 401: Invalid token (get new JWT)"
echo "   - 404: Website/Community/Thread not found (check IDs)"
echo "   - 500: API error (check backend logs for details)"
echo ""

echo -e "${BLUE}=== Ready to Test ===${NC}\n"
echo "1. Update WEBSITE_ID, COMMUNITY_ID, THREAD_ID in this script"
echo "2. Get your JWT token and update USER_TOKEN"
echo "3. Run individual curl commands from above"
echo "4. Check responses and backend logs"
