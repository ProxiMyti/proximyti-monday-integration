const https = require('https');

const MONDAY_TOKEN = process.env.MONDAY_TOKEN;
const BOARD_ID = '18056538407';
const WEBHOOK_URL = process.env.WEBHOOK_URL || 'https://your-domain.com/webhook';

function makeMondayRequest(query, variables = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query, variables });

    const options = {
      method: 'POST',
      hostname: 'api.monday.com',
      path: '/v2',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': MONDAY_TOKEN,
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(body);
          if (result.errors) {
            reject(new Error(JSON.stringify(result.errors, null, 2)));
          } else {
            resolve(result.data);
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function listExistingWebhooks() {
  console.log('🔍 Checking existing webhooks...');

  const query = `
    query ($boardId: ID!) {
      boards(ids: [$boardId]) {
        id
        name
      }
    }
  `;

  try {
    const result = await makeMondayRequest(query, { boardId: BOARD_ID });
    console.log('📋 Board found:', result.boards[0]?.name);
    return [];
  } catch (error) {
    console.error('❌ Error checking board:', error.message);
    return [];
  }
}

async function createWebhook() {
  console.log('🔗 Setting up Monday.com webhook...');
  console.log(`📋 Board: ProxiMyti Vendors v2 (${BOARD_ID})`);
  console.log(`📡 Webhook URL: ${WEBHOOK_URL}`);

  const mutation = `
    mutation CreateWebhook($boardId: ID!, $url: String!) {
      create_webhook (
        board_id: $boardId,
        url: $url,
        event: change_column_value
      ) {
        id
        board_id
      }
    }
  `;

  const variables = {
    boardId: BOARD_ID,
    url: WEBHOOK_URL
  };

  try {
    const result = await makeMondayRequest(mutation, variables);
    console.log('✅ Webhook created successfully!');
    console.log('🆔 Webhook ID:', result.create_webhook.id);
    console.log('📋 Board ID:', result.create_webhook.board_id);
    console.log('🔗 URL:', result.create_webhook.url);

    return result.create_webhook;
  } catch (error) {
    console.error('❌ Error creating webhook:', error.message);
    throw error;
  }
}

async function createItemWebhook() {
  console.log('🔗 Setting up item creation/deletion webhook...');

  const mutation = `
    mutation CreateItemWebhook($boardId: ID!, $url: String!) {
      create_webhook (
        board_id: $boardId,
        url: $url,
        event: create_item
      ) {
        id
        board_id
      }
    }
  `;

  const variables = {
    boardId: BOARD_ID,
    url: WEBHOOK_URL
  };

  try {
    const result = await makeMondayRequest(mutation, variables);
    console.log('✅ Item webhook created successfully!');
    console.log('🆔 Webhook ID:', result.create_webhook.id);

    return result.create_webhook;
  } catch (error) {
    console.error('❌ Error creating item webhook:', error.message);
    throw error;
  }
}

async function main() {
  if (!MONDAY_TOKEN) {
    console.error('❌ MONDAY_TOKEN environment variable not set');
    process.exit(1);
  }

  if (!process.env.WEBHOOK_URL) {
    console.log('⚠️  WEBHOOK_URL not set, using placeholder');
    console.log('📝 Update WEBHOOK_URL to your actual webhook endpoint');
  }

  try {
    // List existing webhooks
    await listExistingWebhooks();

    // Create webhooks for column changes and item creation
    await createWebhook();
    await createItemWebhook();

    console.log('\\n' + '='.repeat(60));
    console.log('🎉 Webhook Setup Complete!');
    console.log('\\n📋 What happens now:');
    console.log('   🔄 Any changes to vendor data → automatic sync');
    console.log('   ➕ New vendors added → automatic sync');
    console.log('   📞 Contact changes → automatic sync');
    console.log('\\n🚀 Next steps:');
    console.log('   1. Start your webhook server: node webhook-server.js');
    console.log('   2. Make your server publicly accessible (ngrok, etc.)');
    console.log('   3. Update WEBHOOK_URL environment variable');
    console.log('   4. Test by making changes in Monday.com');

  } catch (error) {
    console.error('❌ Setup failed:', error.message);
  }
}

main().catch(console.error);