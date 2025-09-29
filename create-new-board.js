const https = require('https');

const MONDAY_TOKEN = process.env.MONDAY_TOKEN;
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

async function createNewBoard() {
  console.log('🏗️ Creating new ProxiMyti Vendors board...');

  const query = `
    mutation {
      create_board (
        board_name: "ProxiMyti Vendors v2",
        board_kind: public,
        description: "Vendor management for ProxiMyti delivery platform (v2 - fresh board)"
      ) {
        id
        name
      }
    }
  `;

  const result = await makeMondayRequest(query);
  const boardId = result.create_board.id;

  console.log(`✅ Board created: ${result.create_board.name}`);
  console.log(`📋 Board ID: ${boardId}\n`);

  return boardId;
}

async function addColumn(boardId, columnTitle, columnType, description = '') {
  const query = `
    mutation ($boardId: ID!, $columnTitle: String!, $columnType: ColumnType!, $description: String) {
      create_column (
        board_id: $boardId,
        title: $columnTitle,
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
    boardId: boardId,
    columnTitle: columnTitle,
    columnType: columnType,
    description: description
  };

  const result = await makeMondayRequest(query, variables);
  const column = result.create_column;

  console.log(`   ✅ ${column.title} (${column.type}) - ID: ${column.id}`);
  return column;
}

async function main() {
  if (!MONDAY_TOKEN) {
    console.error('❌ MONDAY_TOKEN environment variable not set');
    process.exit(1);
  }

  console.log('🚀 Creating fresh ProxiMyti Vendors board with correct column types\n');

  try {
    // Create the board
    const boardId = await createNewBoard();

    console.log('📋 Adding columns...\n');

    // Add all columns with correct types
    const columns = [
      { title: 'Vendor Code', type: 'text', description: 'Unique identifier for vendor' },
      { title: 'Shop Name', type: 'text', description: 'Business name' },
      { title: 'Address', type: 'text', description: 'Street address' },
      { title: 'City', type: 'text', description: 'City name' },
      { title: 'State', type: 'text', description: 'State abbreviation' },
      { title: 'Zip Code', type: 'text', description: 'ZIP code' },
      { title: 'Service Zone', type: 'text', description: 'Geographic service area' },
      { title: 'What3Words', type: 'text', description: 'What3Words location' },
      { title: 'Pickup Door', type: 'text', description: 'Specific pickup location' },
      { title: 'Floor Level', type: 'text', description: 'Floor or level' },
      { title: 'Pickup Instructions', type: 'long_text', description: 'Detailed pickup instructions' },
      { title: 'Access Code', type: 'text', description: 'Building access code' },
      { title: 'Business Hours', type: 'text', description: 'Operating hours' },
      { title: 'Primary Contact', type: 'text', description: 'Main contact person' },
      { title: 'Primary Phone', type: 'phone', description: 'Main phone number' },
      { title: 'Active Status', type: 'status', description: 'Current vendor status' }
    ];

    for (const col of columns) {
      await addColumn(boardId, col.title, col.type, col.description);
      await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎉 New Board Creation Complete!\n');
    console.log(`📋 Board ID: ${boardId}`);
    console.log('📝 Board Name: ProxiMyti Vendors v2');
    console.log('\n🔧 Next steps:');
    console.log('1. Update the board ID in import script');
    console.log('2. Import all 73 vendors');
    console.log('3. Archive the old board');

    console.log(`\n📝 Update BOARD_ID to: ${boardId}`);

  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

main().catch(console.error);