const https = require('https');

const MONDAY_TOKEN = process.env.MONDAY_TOKEN;
const BOARD_ID = '18055552129';
const API_URL = 'https://api.monday.com/v2';

function makeMondayRequest(query, variables = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query, variables });

    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': MONDAY_TOKEN,
        'Content-Length': data.length
      }
    };

    const req = https.request(API_URL, options, (res) => {
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

async function addServiceZoneColumn() {
  console.log('📍 Adding Service Zone column to ProxiMyti Vendors board...\n');

  const query = `
    mutation ($boardId: ID!, $title: String!, $columnType: ColumnType!, $description: String) {
      create_column (
        board_id: $boardId,
        title: $title,
        column_type: $columnType,
        description: $description
      ) {
        id
        title
        type
      }
    }
  `;

  const variables = {
    boardId: BOARD_ID,
    title: 'Service Zone',
    columnType: 'dropdown',
    description: 'Geographic service zone for ProxiMyti delivery areas'
  };

  try {
    const result = await makeMondayRequest(query, variables);
    console.log(`✅ Service Zone column created (ID: ${result.create_column.id})\n`);

    console.log('Note: You will need to manually add these dropdown options in Monday.com:');
    console.log('  - Chittenden County (Current)');
    console.log('  - Washington County (Future)');
    console.log('  - Addison County (Future)');
    console.log('  - Lamoille County (Future)');
    console.log('  - Franklin County (Future)');
    console.log('  - Other');

    return result.create_column.id;
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

async function main() {
  if (!MONDAY_TOKEN) {
    console.error('❌ MONDAY_TOKEN environment variable not set');
    process.exit(1);
  }

  await addServiceZoneColumn();
}

main().catch(console.error);