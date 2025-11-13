# Multi-Application Setup Guide

## Using Shared Accounts for Multiple Applications

Yes, you can use the same **Resend**, **Stripe**, **Railway**, and **OpenAI** accounts for multiple applications. This is actually common and efficient!

---

## ✅ **How It Works**

### **Resend (Email)**
✅ **YES - Multiple apps can share one account**
- Each app has separate email sending
- Different "from" email addresses per app
- Different API keys per app (optional)
- Billing is combined (you only pay once)

**Setup:**
- App 1: send from `noreply@app1.com`
- App 2: send from `noreply@app2.com`
- Both use same Resend account
- One invoice for all sending

---

### **Stripe (Payments)**
✅ **YES - Multiple apps can share one account**
- Each app has separate products/prices
- Different webhook endpoints per app
- One dashboard to manage all
- Combined revenue tracking

**Setup:**
- App 1: Products for AI Marketing platform
- App 2: Products for your other app
- Both under same Stripe account
- Resend shows combined revenue

**Note:** Make sure webhook endpoints are different:
```
App 1: yourapp1.com/api/webhooks/stripe
App 2: yourapp2.com/api/webhooks/stripe
App 3: ai-marketing.com/api/webhooks/stripe
```

---

### **Railway (Hosting)**
✅ **YES - Multiple projects under one account**
- Each app is a separate Railway project
- Separate databases per app
- Separate environment variables per app
- Combined billing

**Setup:**
```
Railway Account
├─ Project 1: app1-prod
│  ├─ Backend service
│  └─ Database
├─ Project 2: app2-prod
│  ├─ Backend service
│  └─ Database
└─ Project 3: ai-marketing-prod
   ├─ Backend service
   └─ Database
```

**Benefits:**
- One dashboard to manage all
- Easy to switch between projects
- Combined billing (cheaper than separate accounts)
- Resource sharing (though isolated projects)

---

### **OpenAI API (Alternative to Claude)**
✅ **YES - One account, multiple apps**
- Each app uses same API key
- Usage is tracked separately per app (with tags)
- Combined billing
- Easy to manage

**Note:** OpenAI is different from Anthropic Claude
- OpenAI: GPT-3.5, GPT-4
- Anthropic Claude: Claude 3.5 Sonnet (what we originally planned)

---

## ⚠️ **Important Considerations**

### **1. API Keys & Secrets**
```
IMPORTANT: Keep API keys separate per app
❌ Don't share the same API key across apps
✅ Use different keys for each app when possible
```

**Why?**
- If one app is compromised, all apps are at risk
- Can't revoke access to just one app
- Can't track usage per app

**Better approach:**
- Resend: Create separate API keys (free)
- Stripe: Use webhook signing (different endpoints)
- Railway: Separate environment per project
- OpenAI: Tag requests by app

---

### **2. Database Isolation**
```
✅ MUST have separate databases per app
❌ Don't share databases between apps
```

**Why?**
- Data gets mixed up
- Hard to backup/restore one app
- Performance issues
- Security risk

**In Railway:**
- App 1 has Database 1
- App 2 has Database 2
- App 3 (AI Marketing) has Database 3
- All connected via separate connection strings

---

### **3. Environment Variables**
```
✅ Keep separate .env files per app
✅ Use Railway's environment management
❌ Don't copy .env between apps
```

**Example:**

**App 1 Railway Environment:**
```
DATABASE_URL=postgresql://...app1...
RESEND_API_KEY=re_xxx_app1
STRIPE_SECRET_KEY=sk_test_app1
```

**App 3 (AI Marketing) Railway Environment:**
```
DATABASE_URL=postgresql://...ai_marketing...
RESEND_API_KEY=re_xxx_ai_marketing
STRIPE_SECRET_KEY=sk_test_ai_marketing
OPENAI_API_KEY=sk-xxx
```

---

### **4. Webhook Endpoints**
```
⚠️ CRITICAL: Different endpoints for each app
```

**Resend Webhooks:**
```
App 1: https://app1.com/api/webhooks/resend
App 3: https://ai-marketing.com/api/webhooks/resend
```

**Stripe Webhooks:**
```
App 1: https://app1.com/api/webhooks/stripe
App 3: https://ai-marketing.com/api/webhooks/stripe
```

**Configuration in Dashboard:**
```
Stripe Dashboard → Webhooks
├─ Endpoint 1: https://app1.com/api/webhooks/stripe
├─ Endpoint 2: https://app2.com/api/webhooks/stripe
└─ Endpoint 3: https://ai-marketing.com/api/webhooks/stripe
```

---

## 🚀 **Setup Steps for AI Marketing Platform**

### **Step 1: Create Railway Project**
```
1. Login to railway.app
2. Click "New Project"
3. Name: "ai-marketing-prod"
4. Connect GitHub repo
5. Create PostgreSQL database
6. Set environment variables
```

### **Step 2: Configure Resend**
```
1. Login to resend.com
2. Create new API key (don't reuse existing one)
3. Name it: "ai-marketing-api-key"
4. Add to Railway environment: RESEND_API_KEY=...
5. Set from email: noreply@aimarketing.com (or subdomain)
```

### **Step 3: Configure Stripe**
```
1. Login to stripe.com
2. Get existing Secret Key
3. Create webhook endpoint: https://ai-marketing.com/api/webhooks/stripe
4. Add to Railway environment: STRIPE_SECRET_KEY=...
5. Add to Railway environment: STRIPE_WEBHOOK_SECRET=...
```

### **Step 4: Configure OpenAI**
```
1. Login to platform.openai.com
2. Get existing API key
3. Add to Railway environment: OPENAI_API_KEY=...
```

### **Step 5: Set Other Environment Variables**
```
PORT=3000
NODE_ENV=production
FRONTEND_URL=https://ai-marketing.yourdom.com
API_URL=https://api-ai-marketing.yourdom.com
JWT_SECRET=your-secret-key-change-this
```

---

## 💡 **Billing & Costs**

### **Resend**
```
Per Account (not per app):
- First 3,000 emails: FREE
- Then: $20/month for 100,000 emails

Your situation:
- App 1: 1,000 emails/month
- App 3 (AI Marketing): 500 emails/month
- Total: 1,500 emails = STILL FREE
- You don't pay more for 2 apps!
```

### **Stripe**
```
Per transaction (not per app):
- 2.9% + $0.30 per transaction
- No monthly fee
- No difference if 2 apps or 20 apps
- You pay only on revenue
```

### **Railway**
```
Usage-based pricing (combined across projects):
- $5/month minimum (but includes $5 credit)
- App 1: $3/month
- App 3: $3/month
- Total: $6/month = $1 to pay
```

### **OpenAI**
```
Per API call (combined across apps):
- Pay only for what you use
- Can set spending limits
- Shared account = shared limits
```

**Total Monthly Cost:**
```
Resend: FREE (under 3,000 emails)
Stripe: FREE (no monthly fee)
Railway: $5-20/month (combined)
OpenAI: ~$5-20/month (depending on usage)
---------
Total: ~$10-40/month
```

---

## 🔒 **Security Best Practices**

### **DO:**
✅ Use different API keys per app (when possible)
✅ Store secrets in Railway environment variables
✅ Use webhook signatures to verify requests
✅ Keep API keys in `.env` (never in git)
✅ Rotate API keys periodically
✅ Set spending limits on OpenAI

### **DON'T:**
❌ Share same API key across apps
❌ Commit API keys to Git
❌ Use same webhook endpoint for multiple apps
❌ Share databases between apps
❌ Use production keys in development

---

## 📋 **Checklist for AI Marketing Setup**

Before we start coding Phase 1:

### **Resend Setup**
- [ ] Login to resend.com
- [ ] Create new API key (name it "ai-marketing")
- [ ] Copy API key
- [ ] Verify a sending domain (or use default)

### **Stripe Setup**
- [ ] Login to stripe.com
- [ ] Get Secret Key (starts with sk_test_ or sk_live_)
- [ ] Create webhook endpoint in Stripe Dashboard:
      `https://ai-marketing.railway.app/api/webhooks/stripe`
- [ ] Get Webhook Signing Secret (starts with whsec_)
- [ ] Copy all three values

### **Railway Setup**
- [ ] Login to railway.app
- [ ] Create new project: "ai-marketing"
- [ ] Add GitHub repo
- [ ] Create PostgreSQL database
- [ ] Create environment variables file with:
  ```
  DATABASE_URL=...
  RESEND_API_KEY=...
  STRIPE_SECRET_KEY=...
  STRIPE_WEBHOOK_SECRET=...
  OPENAI_API_KEY=...
  JWT_SECRET=...
  PORT=3000
  NODE_ENV=production
  ```

### **OpenAI Setup**
- [ ] Login to platform.openai.com
- [ ] Get API key
- [ ] Set billing/spending limit (e.g., $20/month)
- [ ] Copy API key

### **Domain Setup** (Optional for Phase 1)
- [ ] Get domain (e.g., aimarketing.com)
- [ ] Point to Railway
- [ ] Update environment variables with domain URL

---

## 🎯 **Important Note: OpenAI vs Claude**

You have **OpenAI API key**, but I originally planned to use **Anthropic Claude**.

**Both are good, but different:**

| Feature | OpenAI (GPT-4) | Anthropic (Claude) |
|---------|---|---|
| Cost | Cheaper | Slightly more expensive |
| Quality | Very good | Excellent |
| Speed | Fast | Medium |
| Context | 128K tokens | 200K tokens |
| Price/1M tokens | $30 | ~$3 input / $15 output |

**My recommendation: Use OpenAI**
- You already have API key
- Cheaper than Claude
- Good for content recommendations
- Easier to integrate
- Well documented

---

## ✅ **You're All Set!**

You have everything needed:
- ✅ Resend (for email)
- ✅ Stripe (for payments)
- ✅ Railway (for hosting)
- ✅ OpenAI (for AI - alternative to Claude)

We just need to:
1. Create new Resend API key for AI Marketing
2. Create new Stripe webhook endpoint for AI Marketing
3. Create new Railway project for AI Marketing
4. Set up environment variables

---

## Next Steps

**Tell me:**

1. ✅ You're ready to start Phase 1?
2. ✅ Which feature first?
   - Google PageSpeed APIs
   - Stripe Integration
   - OpenAI Integration
   - All three

Once confirmed, I'll create the implementation guide! 🚀
