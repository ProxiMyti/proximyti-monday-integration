# Railway Deployment Guide

## 🚀 Quick Deploy to Railway

### 1. Deploy from GitHub

[![Deploy on Railway](https://railway.app/button.svg)](https://railway.app/new/template?template=https%3A%2F%2Fgithub.com%2Fbillcalfee%2Fproximyti-monday-integration)

Or manually:

1. Go to [Railway](https://railway.app)
2. Click "Deploy from GitHub repo"
3. Connect: `billcalfee/proximyti-monday-integration`
4. Railway will auto-detect and deploy

### 2. Set Environment Variables

In Railway dashboard, go to **Variables** tab and set:

```bash
MONDAY_TOKEN=your_monday_graphql_token_here
NODE_ENV=production
```

**Optional:**
```bash
MONDAY_WEBHOOK_SECRET=your_webhook_secret
PORT=3000
```

### 3. Get Your Railway URL

After deployment, Railway provides a URL like:
```
https://proximyti-monday-integration-production.up.railway.app
```

### 4. Configure Monday.com Webhooks

Update webhook URL and run setup:

```bash
# Locally, set your Railway URL
export WEBHOOK_URL="https://your-railway-url.up.railway.app/webhook"
export MONDAY_TOKEN="your_token"
npm run setup-webhook
```

### 5. Test the Deployment

**Health Check:**
```bash
curl https://your-railway-url.up.railway.app/health
```

**Manual Sync Test:**
```bash
curl -X POST https://your-railway-url.up.railway.app/webhook \
  -H "Content-Type: application/json" \
  -d '{"type": "test", "boardId": "18056538407"}'
```

## 📋 Post-Deployment Checklist

- [ ] ✅ Service is running (health check returns 200)
- [ ] ✅ Environment variables are set
- [ ] ✅ Monday.com webhooks are configured
- [ ] ✅ Test webhook triggers sync
- [ ] ✅ Supabase data is updating
- [ ] ✅ Logs show successful operations

## 🔧 Monitoring

**View Logs:**
Railway dashboard → **Deployments** → **View Logs**

**Key Log Messages:**
- `🚀 Monday.com Webhook Server Started` - Server running
- `📨 Webhook received from Monday.com` - Webhook triggered
- `✅ Automated sync completed successfully` - Sync worked
- `❌ Automated sync failed` - Check for errors

## 🚨 Troubleshooting

**Common Issues:**

1. **Build Fails**
   - Check Node.js version (requires 16+)
   - Verify package.json dependencies

2. **Webhook Not Triggering**
   - Verify WEBHOOK_URL is correct Railway URL
   - Check Monday.com webhook configuration
   - Test webhook manually

3. **Sync Fails**
   - Check MONDAY_TOKEN is valid (regenerate if needed)
   - Verify Supabase is accessible
   - Check logs for specific error messages

4. **Environment Variables**
   - Redeploy after changing variables
   - Ensure no extra spaces in values

## 🔄 Updates

To update the deployment:

1. Push changes to GitHub
2. Railway auto-deploys from main branch
3. Check logs to confirm successful deployment

## 💰 Railway Pricing

- **Free Tier**: 500 hours/month (good for testing)
- **Pro**: $5/month (recommended for production)
- **Usage-based**: Pay for resource consumption

## 🔒 Security

- Railway handles HTTPS automatically
- Environment variables are encrypted
- Webhook signature verification is enabled
- No sensitive data in logs