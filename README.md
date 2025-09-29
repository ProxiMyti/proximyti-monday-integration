# ProxiMyti Monday Sync Service

Core vendor management service for the ProxiMyti delivery platform. Automatically syncs vendor data from Monday.com to Supabase database.

## 🎯 Overview

This integration automatically syncs vendor data from Monday.com to Supabase whenever changes occur, making Monday.com your source of truth for vendor management.

## 🚀 Features

- **Real-time Sync**: Automatic sync when vendors are added, updated, or modified in Monday.com
- **Bi-directional Data**: Syncs both vendor information and contact subitems
- **Error Handling**: Robust error handling and retry logic
- **Webhook Security**: Signature verification for secure webhook endpoints
- **Multiple Triggers**: Responds to column changes, item creation, and more

## 📋 Prerequisites

- Node.js 16+
- Monday.com account with API access
- Supabase project (circulate-vt)
- Public webhook endpoint (ngrok, server, etc.)

## ⚙️ Setup

### 1. Environment Variables

Create a `.env` file:

```bash
# Monday.com API Token (GraphQL)
MONDAY_TOKEN=your_monday_token_here

# Webhook Configuration
WEBHOOK_URL=https://your-domain.com/webhook
MONDAY_WEBHOOK_SECRET=your_webhook_secret

# Optional: Custom port for webhook server
PORT=3000
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Database Setup

The Supabase tables should already be set up. To verify:

```bash
npm run check-supabase
```

### 4. Test Authentication

```bash
npm run test-auth
```

## 🔄 Usage

### Manual Sync

Run a one-time sync:

```bash
npm run sync
```

### Start Webhook Server

```bash
npm start
```

The webhook server will:
- Listen on port 3000 (or PORT env variable)
- Handle Monday.com webhook events
- Automatically trigger syncs when board changes occur

### Set Up Webhooks (One-time)

**Important**: Update `WEBHOOK_URL` in your environment before running this:

```bash
export WEBHOOK_URL="https://your-actual-domain.com/webhook"
npm run setup-webhook
```

This creates webhooks in Monday.com for:
- Column value changes
- Item creation/deletion
- Subitem changes

## 🔧 Development

### Local Development with ngrok

1. Start the webhook server:
   ```bash
   npm start
   ```

2. In another terminal, expose it publicly:
   ```bash
   ngrok http 3000
   ```

3. Update webhook URL:
   ```bash
   export WEBHOOK_URL="https://your-ngrok-id.ngrok.io/webhook"
   npm run setup-webhook
   ```

### Available Scripts

- `npm start` - Start webhook server
- `npm run sync` - Manual sync Monday.com → Supabase
- `npm run setup-webhook` - Configure Monday.com webhooks
- `npm run check-supabase` - Verify Supabase connection
- `npm run test-auth` - Test Monday.com authentication
- `npm run dev` - Development mode with auto-restart

## 📊 Monitoring

### Health Check

Check if webhook server is running:
```bash
curl http://localhost:3000/health
```

### Logs

The webhook server provides detailed logging:
- 📨 Webhook events received
- 🔄 Sync operations triggered
- ✅ Success confirmations
- ❌ Error details

## 🏗️ Architecture

```
Monday.com Board (ProxiMyti Vendors v2)
    ↓ (webhook on change)
Webhook Server (Express.js)
    ↓ (trigger sync)
Sync Script (monday-to-supabase-sync.js)
    ↓ (upsert data)
Supabase Database (vendors + vendor_contacts tables)
```

## 📋 Board Configuration

**Board**: ProxiMyti Vendors v2 (ID: 18056538407)

**Vendor Columns**:
- Vendor Code, Shop Name, Address, City, State, Zip Code
- Service Zone, What3Words, Pickup Door, Floor Level
- Pickup Instructions, Access Code, Business Hours
- Primary Contact, Primary Phone, Active Status

**Contact Subitems**:
- Name, Email, Phone, Title

## 🔒 Security

- Webhook signature verification using HMAC-SHA256
- Environment variable protection for sensitive tokens
- Request validation and sanitization

## 🚨 Troubleshooting

### Common Issues

1. **Authentication Failed**
   - Check MONDAY_TOKEN is current (tokens expire every few days)
   - Regenerate token in Monday.com Developer settings

2. **Webhook Not Triggering**
   - Verify WEBHOOK_URL is publicly accessible
   - Check webhook exists in Monday.com
   - Review server logs for errors

3. **Sync Errors**
   - Check Supabase connection and table structure
   - Verify board structure matches expected columns

### Debug Commands

```bash
# Test Monday.com connection
npm run test-auth

# Check Supabase tables
npm run check-supabase

# Manual sync with full logging
DEBUG=* npm run sync
```

## 📈 Production Deployment

For production, deploy the webhook server to:
- Heroku, Railway, or similar PaaS
- AWS Lambda with API Gateway
- Your own server with PM2 or similar

Ensure:
1. Environment variables are properly set
2. Webhook URL points to production endpoint
3. Monday.com webhooks are configured for production URL
4. Health monitoring is in place

## 📝 Notes

- Sync runs with a 2-second delay after webhook trigger to allow Monday.com to process changes
- Failed syncs are logged but don't retry automatically (add retry logic as needed)
- Each sync is idempotent - safe to run multiple times
- Vendor and contact relationships are maintained via foreign keys