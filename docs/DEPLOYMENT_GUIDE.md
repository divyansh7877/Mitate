# Deployment Guide: ArXiv Visual Explainer

**Last Updated:** 2025-12-13  
**Implementation Status:** Backend and frontend integration complete, ready for deployment

---

## Overview

This guide walks you through deploying the ArXiv Visual Explainer system with:
- **Frontend:** React + Vite + TanStack Router
- **Backend:** Appwrite Functions (2 functions)
- **AI Services:** Gradient AI (summarization), FIBO (image generation), FAL (variations)
- **Database:** Appwrite Cloud

---

## Prerequisites

Before starting, ensure you have:

- [ ] Appwrite project created at https://cloud.appwrite.io
- [ ] Gradient AI account and API credentials
- [ ] FIBO API key from Bria AI
- [ ] FAL API key from fal.ai
- [ ] Node.js 18+ and npm/bun installed locally

---

## Step 1: Set Up Appwrite Database

### 1.1 Create Database and Collections

Run the setup script:

```bash
bun run setup:appwrite
```

This creates:
- Database: `mitate-db`
- Collections: `requests`, `results`, `poster_generations`
- Storage bucket: `poster-images`

### 1.2 Verify Collections

Go to https://cloud.appwrite.io and verify:
- Database ID is `mitate-db`
- All 3 collections exist with proper attributes
- Storage bucket `poster-images` is created

---

## Step 2: Deploy Appwrite Functions

### 2.1 Install Appwrite CLI

```bash
npm install -g appwrite
```

### 2.2 Login to Appwrite

```bash
appwrite login
```

### 2.3 Initialize Project (if not already done)

```bash
appwrite init project
```

Select your project from the list.

### 2.4 Deploy Generate Function

```bash
cd functions/generate
appwrite deploy function
```

When prompted:
- **Function Name:** `generate-poster`
- **Runtime:** `node-18.0` or `node-20.0`
- **Entry Point:** `src/main.js`
- **Execute Access:** `any` (public access)

**Copy the Function ID** - you'll need it for environment variables.

### 2.5 Deploy Worker Function

```bash
cd ../worker
appwrite deploy function
```

When prompted:
- **Function Name:** `process-generation`
- **Runtime:** `node-18.0` or `node-20.0`
- **Entry Point:** `src/main.js`
- **Execute Access:** `any`

**Copy the Function ID** as well.

### 2.6 Configure Function Environment Variables

In Appwrite Console, for **BOTH functions**, set these environment variables:

```
APPWRITE_FUNCTION_PROJECT_ID=<auto-provided>
APPWRITE_API_KEY=<create in Console>
GRADIENT_ACCESS_TOKEN=<your_gradient_token>
GRADIENT_WORKSPACE_ID=<your_gradient_workspace>
FIBO_API_KEY=<your_fibo_key>
FAL_KEY=<your_fal_key>
DATABASE_ID=mitate-db
BUCKET_ID=poster-images
```

**For the generate function, also add:**
```
WORKER_FUNCTION_ID=<ID of process-generation function>
```

### 2.7 Create Appwrite API Key

1. Go to Appwrite Console → Settings → API Keys
2. Create new API key with scopes:
   - `databases.read`
   - `databases.write`
   - `documents.read`
   - `documents.write`
   - `files.read`
   - `files.write`
   - `functions.read`
   - `functions.write`
   - `execution.read`
   - `execution.write`
3. Copy the key and add to function environment variables

---

## Step 3: Configure Frontend Environment

### 3.1 Create `.env` File

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### 3.2 Fill in Environment Variables

```bash
# Appwrite Configuration
VITE_APPWRITE_ENDPOINT=https://cloud.appwrite.io/v1
VITE_APPWRITE_PROJECT_ID=your_project_id
VITE_APPWRITE_DATABASE_ID=mitate-db
VITE_APPWRITE_BUCKET_ID=poster-images

# Appwrite Functions (use IDs from Step 2.4 and 2.5)
VITE_APPWRITE_FUNCTION_GENERATE_ID=<generate-poster-function-id>

# Optional: Set to 'true' to use mocks during development
VITE_USE_MOCKS=false
```

---

## Step 4: Test Locally

### 4.1 Install Dependencies

```bash
bun install
```

### 4.2 Run Development Server

```bash
bun run dev
```

### 4.3 Test the Flow

1. Open http://localhost:3000
2. Enter query: "Attention Is All You Need"
3. Select knowledge level: "Beginner"
4. Click "Generate Visual Explainer"
5. Watch the loading progress
6. Verify the result displays correctly

### 4.4 Check Logs

- **Frontend:** Browser console (F12)
- **Backend:** Appwrite Console → Functions → Executions

---

## Step 5: Deploy Frontend

### Option A: Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel
```

When prompted:
- Link to existing project or create new
- Set environment variables in Vercel dashboard
- Deploy

### Option B: Deploy to Netlify

```bash
# Build
bun run build

# Deploy dist/ folder to Netlify
netlify deploy --prod --dir=dist
```

### Option C: Deploy to Digital Ocean App Platform

1. Create new App in Digital Ocean
2. Connect GitHub repository
3. Set build command: `bun run build`
4. Set output directory: `dist`
5. Add environment variables
6. Deploy

---

## Step 6: Verify Production Deployment

### 6.1 Test End-to-End

1. Visit your deployed frontend URL
2. Try different queries:
   - ArXiv link: `https://arxiv.org/abs/1706.03762`
   - Topic search: `"transformer architecture"`
3. Test all knowledge levels: beginner, intermediate, advanced
4. Verify image generation and display

### 6.2 Check Function Logs

In Appwrite Console:
1. Go to Functions
2. Select each function
3. View Executions tab
4. Check for errors

### 6.3 Monitor Database

1. Go to Databases → mitate-db
2. Check `requests` collection for new entries
3. Check `results` collection for completed generations

---

## Troubleshooting

### Issue: "Function execution failed"

**Solution:**
- Check function environment variables are set correctly
- Verify API keys are valid
- Check function logs for specific error messages

### Issue: "Request not found"

**Solution:**
- Ensure `generate` function is triggering the `worker` function
- Check that `WORKER_FUNCTION_ID` is set in generate function
- Verify database permissions

### Issue: "Gradient AI error"

**Solution:**
- Verify `GRADIENT_ACCESS_TOKEN` and `GRADIENT_WORKSPACE_ID`
- Check Gradient AI account has sufficient credits
- Review Gradient AI API documentation

### Issue: "FIBO generation failed"

**Solution:**
- Currently using placeholders - full FIBO integration pending
- Check `FIBO_API_KEY` is valid
- The system will fall back to placeholder images

### Issue: Polling never completes

**Solution:**
- Check worker function executions in Appwrite Console
- Look for errors in function logs
- Verify database write permissions
- Check request status manually in database

---

## API Keys Reference

### Where to Get API Keys:

1. **Gradient AI**
   - Sign up at https://gradient.ai
   - Go to Dashboard → API Keys
   - Copy Access Token and Workspace ID

2. **FIBO (Bria AI)**
   - Sign up at https://bria.ai
   - Request API access
   - Get API key from dashboard

3. **FAL.AI**
   - Sign up at https://fal.ai
   - Go to Settings → API Keys
   - Create new key

---

## Performance Optimization

### Caching

Future improvement: Cache summaries for frequently requested papers

```javascript
// In worker function
const cacheKey = `summary:${arxiv_id}:${knowledge_level}`;
// Check cache before calling Gradient AI
```

### Rate Limiting

Current: No rate limiting implemented
Future: Add rate limiting to prevent abuse

### Monitoring

Recommended tools:
- Sentry for error tracking
- LogRocket for session replay
- Appwrite Analytics for usage metrics

---

## Cost Estimation

Per generation:
- **Gradient AI:** ~$0.001-0.01 (depending on model and tokens)
- **FIBO API:** ~$0.05-0.10 per image
- **FAL API:** ~$0.01 per variation
- **Appwrite:** Free tier covers ~1000 executions/month

**Total cost per generation:** ~$0.06-0.12

---

## Security Considerations

### API Keys
- ✅ Never commit API keys to Git
- ✅ Use environment variables
- ✅ Rotate keys periodically

### Database Access
- ✅ Use Appwrite permissions system
- ✅ Limit read/write access per collection
- ⚠️ Currently allows anonymous access - consider adding authentication

### Rate Limiting
- ⚠️ Not implemented - vulnerable to abuse
- 🔜 Add rate limiting in production

---

## Monitoring & Maintenance

### Daily Checks
- [ ] Monitor Appwrite function executions
- [ ] Check for failed generations
- [ ] Review error logs

### Weekly Checks
- [ ] Review API usage and costs
- [ ] Check database storage size
- [ ] Update dependencies

### Monthly Checks
- [ ] Rotate API keys
- [ ] Review and optimize costs
- [ ] Update documentation

---

## Next Steps After Deployment

1. **Add User Authentication**
   - Implement Appwrite Auth
   - Restrict access to authenticated users
   - Track user generation history

2. **Implement Full FIBO Integration**
   - Complete PosterGenerationOrchestrator integration
   - Add layout previews with FAL
   - Enable style variations

3. **Add Analytics**
   - Track most popular papers
   - Monitor generation success rate
   - Analyze knowledge level distribution

4. **Improve Error Handling**
   - Better error messages for users
   - Retry logic for transient failures
   - Graceful degradation

5. **Performance Optimization**
   - Implement caching layer
   - Optimize database queries
   - Add CDN for generated images

---

## Support & Resources

- **Appwrite Docs:** https://appwrite.io/docs
- **Gradient AI Docs:** https://gradient.ai/docs
- **FIBO API Docs:** https://bria.ai/docs
- **FAL API Docs:** https://fal.ai/docs
- **GitHub Issues:** [Your repo]/issues

---

## Deployment Checklist

### Pre-Deployment
- [ ] All environment variables configured
- [ ] Database collections created
- [ ] API keys obtained and tested
- [ ] Functions deployed to Appwrite
- [ ] Frontend tested locally

### Deployment
- [ ] Frontend deployed to hosting platform
- [ ] Environment variables set in production
- [ ] DNS configured (if using custom domain)
- [ ] SSL certificate active

### Post-Deployment
- [ ] End-to-end test in production
- [ ] Monitor function logs for 24 hours
- [ ] Verify database writes
- [ ] Test error scenarios
- [ ] Document any production-specific issues

---

**Deployment Status:** ✅ Ready to deploy

**Last Tested:** 2025-12-13

**Version:** 1.0.0
