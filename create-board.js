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
            reject(new Error(JSON.stringify(result.errors)));
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

async function createProximyTiBoard() {
  console.log('🏗️ Creating ProximyTi Vendors board...');

  const query = `
    mutation {
      create_board (
        board_name: "ProximyTi Vendors",
        board_kind: public,
        description: "Vendor management for ProximyTi delivery platform"
      ) {
        id
        name
      }
    }
  `;

  try {
    const result = await makeMondayRequest(query);
    console.log('✅ Board created:', result.create_board);
    return result.create_board.id;
  } catch (error) {
    console.error('❌ Error creating board:', error.message);
    throw error;
  }
}

async function listBoards() {
  console.log('📋 Fetching existing boards...');

  const query = `
    query {
      boards (limit: 20) {
        id
        name
        description
      }
    }
  `;

  try {
    const result = await makeMondayRequest(query);
    console.log('Existing boards:');
    result.boards.forEach(board => {
      console.log(`  - ${board.name} (ID: ${board.id})`);
    });
    return result.boards;
  } catch (error) {
    console.error('❌ Error listing boards:', error.message);
    throw error;
  }
}

async function main() {
  if (!MONDAY_TOKEN) {
    console.error('❌ MONDAY_TOKEN environment variable not set');
    process.exit(1);
  }

  console.log('🚀 ProximyTi Monday.com Board Setup\n');

  const boards = await listBoards();

  const existingBoard = boards.find(b => b.name === 'ProximyTi Vendors');

  if (existingBoard) {
    console.log(`\n⚠️  Board "ProximyTi Vendors" already exists (ID: ${existingBoard.id})`);
    console.log('Do you want to use this board? If not, delete it first from Monday.com');
    return existingBoard.id;
  }

  const boardId = await createProximyTiBoard();
  console.log(`\n🎉 Board created successfully! ID: ${boardId}`);

  return boardId;
}

main().catch(console.error);