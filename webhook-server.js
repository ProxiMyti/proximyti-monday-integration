const express = require('express');
const crypto = require('crypto');
const { syncMondayToSupabase } = require('./monday-to-supabase-sync');

const app = express();
const PORT = process.env.PORT || 3000;

// Your webhook signing secret from Monday.com
const WEBHOOK_SECRET = process.env.MONDAY_WEBHOOK_SECRET;

// Middleware to parse JSON and verify webhook signature
app.use('/webhook', express.raw({ type: 'application/json' }));

// Verify Monday.com webhook signature
function verifyWebhookSignature(payload, signature, secret) {
  if (!signature || !secret) {
    console.log('⚠️  Warning: No webhook signature verification (missing secret)');
    return true; // Allow through for testing
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');

  const providedSignature = signature.replace('sha256=', '');

  return crypto.timingSafeEqual(
    Buffer.from(expectedSignature, 'hex'),
    Buffer.from(providedSignature, 'hex')
  );
}

// Webhook endpoint
app.post('/webhook', async (req, res) => {
  console.log('📨 Webhook received from Monday.com');

  try {
    const signature = req.headers['x-monday-signature-256'];
    const payload = req.body;

    // Verify signature
    if (!verifyWebhookSignature(payload, signature, WEBHOOK_SECRET)) {
      console.error('❌ Invalid webhook signature');
      return res.status(401).send('Unauthorized');
    }

    const data = JSON.parse(payload.toString());
    console.log('📋 Event type:', data.type);
    console.log('📊 Board ID:', data.boardId);

    // Only sync for our ProxiMyti Vendors v2 board
    if (data.boardId && data.boardId.toString() === '18056538407') {
      console.log('🔄 Triggering sync for ProxiMyti Vendors v2...');

      // Add a small delay to let Monday.com process the change
      setTimeout(async () => {
        try {
          await syncMondayToSupabase();
          console.log('✅ Automated sync completed successfully');
        } catch (error) {
          console.error('❌ Automated sync failed:', error.message);
        }
      }, 2000);

    } else {
      console.log('ℹ️  Ignoring webhook for different board:', data.boardId);
    }

    res.status(200).send('OK');

  } catch (error) {
    console.error('❌ Webhook error:', error.message);
    res.status(500).send('Internal Server Error');
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'ProxiMyti Monday.com Webhook Handler'
  });
});

// Start server
app.listen(PORT, () => {
  console.log('🚀 Monday.com Webhook Server Started');
  console.log(`📡 Listening on port ${PORT}`);
  console.log(`🔗 Webhook URL: http://localhost:${PORT}/webhook`);
  console.log(`💚 Health check: http://localhost:${PORT}/health`);
  console.log('🔄 Monitoring ProxiMyti Vendors v2 board for changes...');
});

module.exports = app;