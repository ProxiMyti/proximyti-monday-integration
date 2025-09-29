const https = require('https');

const MONDAY_TOKEN = process.env.MONDAY_TOKEN;
const BOARD_ID = '18055552129';
const API_URL = 'https://api.monday.com/v2';

const CITIES = [
  'Burlington',
  'South Burlington',
  'Shelburne',
  'Williston',
  'Colchester',
  'Montpelier',
  'Barre',
  'Middlebury',
  'Winooski',
  'Milton',
  'Hinesburg',
  'Bristol',
  'Swanton',
  'Waterbury',
  'St George',
  'Lincoln',
  'St Albans City',
  'Starksboro',
  'Essex Junction',
  'Underhill',
  'Hyde Park',
  'Other'
];

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

async function getCityColumnId() {
  const query = `
    query ($boardId: [ID!]!) {
      boards (ids: $boardId) {
        columns {
          id
          title
          type
          settings_str
        }
      }
    }
  `;

  const result = await makeMondayRequest(query, { boardId: [BOARD_ID] });
  const columns = result.boards[0].columns;

  const cityColumn = columns.find(col => col.title === 'City');

  if (!cityColumn) {
    throw new Error('City column not found');
  }

  console.log(`📋 City column ID: ${cityColumn.id}`);
  console.log(`   Current settings: ${cityColumn.settings_str}\n`);

  return cityColumn.id;
}

async function updateDropdownSettings(columnId) {
  console.log('🏙️  Updating City dropdown with all options...\n');

  // Monday.com uses a different mutation for updating dropdown settings
  // We need to update the column settings directly
  const labels = CITIES.map((city, index) => ({
    id: index.toString(),
    name: city
  }));

  const settings = JSON.stringify({ labels });

  const query = `
    mutation ($boardId: ID!, $columnId: String!, $settings: JSON!) {
      change_column_metadata (
        board_id: $boardId,
        column_id: $columnId,
        column_property: "labels",
        value: $settings
      ) {
        id
      }
    }
  `;

  try {
    await makeMondayRequest(query, {
      boardId: BOARD_ID,
      columnId: columnId,
      settings: settings
    });

    console.log('✅ Dropdown options updated!\n');

    CITIES.forEach(city => {
      console.log(`   ✓ ${city}`);
    });

  } catch (error) {
    console.error('❌ Error updating dropdown:', error.message);
    console.log('\n⚠️  The API method may not support this operation.');
    console.log('You will need to manually add the cities to the City dropdown.\n');
    console.log('Here is the complete list to copy/paste:\n');
    CITIES.forEach(city => console.log(`   ${city}`));
  }
}

async function main() {
  if (!MONDAY_TOKEN) {
    console.error('❌ MONDAY_TOKEN environment variable not set');
    process.exit(1);
  }

  console.log('🏙️  Adding City dropdown options to ProxiMyti Vendors board\n');

  try {
    const cityColumnId = await getCityColumnId();
    await updateDropdownSettings(cityColumnId);
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\n📝 Manual list of all cities to add:\n');
    CITIES.forEach(city => console.log(`   ${city}`));
  }
}

main().catch(console.error);