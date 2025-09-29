const https = require('https');

const MONDAY_TOKEN = process.env.MONDAY_TOKEN;
const MONDAY_BOARD_ID = '18056538407';

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

async function testAuth() {
  console.log('🔍 Testing Monday.com authentication...');

  const query = `
    query {
      me {
        name
        id
        email
      }
    }
  `;

  try {
    const result = await makeMondayRequest(query);
    console.log('✅ Authentication successful!');
    console.log('User:', result.me);

    // Now test board access
    const boardQuery = `
      query ($boardId: [ID!]!) {
        boards (ids: $boardId) {
          name
          id
          items_page (limit: 3) {
            items {
              id
              name
            }
          }
        }
      }
    `;

    const boardResult = await makeMondayRequest(boardQuery, { boardId: [MONDAY_BOARD_ID] });
    console.log('✅ Board access successful!');
    console.log('Board:', boardResult.boards[0].name);
    console.log('Sample items:', boardResult.boards[0].items_page.items.length);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testAuth().catch(console.error);