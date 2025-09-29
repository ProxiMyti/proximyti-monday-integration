const https = require('https');
const fs = require('fs');
const { parse } = require('csv-parse/sync');

const MONDAY_TOKEN = process.env.MONDAY_TOKEN;
const BOARD_ID = '18055552129';
const API_URL = 'https://api.monday.com/v2';

const CHITTENDEN_CORE_CITIES = [
  'Burlington', 'South Burlington', 'Winooski', 'Essex Junction',
  'Colchester', 'Williston', 'Shelburne', 'Essex'
];

const CHITTENDEN_EXTENDED_CITIES = [
  'Milton', 'Jericho', 'Underhill', 'Richmond', 'Hinesburg',
  'St George', 'Charlotte', 'Huntington', 'Bolton'
];

const COUNTY_MAP = {
  'Montpelier': 'Washington County',
  'Barre': 'Washington County',
  'Waterbury': 'Washington County',
  'Middlebury': 'Addison County',
  'Bristol': 'Addison County',
  'Lincoln': 'Addison County',
  'Starksboro': 'Addison County',
  'Hyde Park': 'Lamoille County',
  'Stowe': 'Lamoille County',
  'Morrisville': 'Lamoille County',
  'St Albans': 'Franklin County',
  'St Albans City': 'Franklin County',
  'Swanton': 'Franklin County'
};

function determineServiceZone(city) {
  if (!city) return 'Other';

  const normalizedCity = city.trim();

  if (CHITTENDEN_CORE_CITIES.includes(normalizedCity)) {
    return 'Chittenden Core';
  }

  if (CHITTENDEN_EXTENDED_CITIES.includes(normalizedCity)) {
    return 'Chittenden Extended';
  }

  if (COUNTY_MAP[normalizedCity]) {
    return COUNTY_MAP[normalizedCity];
  }

  return 'Other';
}

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

async function getAllItems() {
  console.log('📋 Fetching all vendors from board...\n');

  const query = `
    query ($boardId: [ID!]!) {
      boards (ids: $boardId) {
        items_page (limit: 100) {
          items {
            id
            name
            column_values {
              id
              title
              text
            }
          }
        }
        columns {
          id
          title
        }
      }
    }
  `;

  const result = await makeMondayRequest(query, { boardId: [BOARD_ID] });
  const items = result.boards[0].items_page.items;
  const columns = result.boards[0].columns;

  const columnMap = {};
  columns.forEach(col => {
    columnMap[col.title] = col.id;
  });

  return { items, columnMap };
}

async function updateServiceZone(itemId, itemName, serviceZone, serviceZoneColumnId) {
  const query = `
    mutation ($boardId: ID!, $itemId: ID!, $columnId: String!, $value: JSON!) {
      change_column_value (
        board_id: $boardId,
        item_id: $itemId,
        column_id: $columnId,
        value: $value
      ) {
        id
      }
    }
  `;

  const variables = {
    boardId: BOARD_ID,
    itemId: itemId,
    columnId: serviceZoneColumnId,
    value: JSON.stringify(serviceZone)
  };

  await makeMondayRequest(query, variables);
}

async function main() {
  if (!MONDAY_TOKEN) {
    console.error('❌ MONDAY_TOKEN environment variable not set');
    process.exit(1);
  }

  console.log('🗺️  Updating Service Zones based on City field\n');
  console.log(`📋 Board ID: ${BOARD_ID}\n`);

  const { items, columnMap } = await getAllItems();

  console.log(`Found ${items.length} vendors\n`);

  const serviceZoneColumnId = columnMap['Service Zone'];
  const cityColumnId = columnMap['City'];

  if (!serviceZoneColumnId || !cityColumnId) {
    console.error('❌ Could not find Service Zone or City columns');
    return;
  }

  let updateCount = 0;

  for (const item of items) {
    const cityColumn = item.column_values.find(cv => cv.id === cityColumnId);
    const city = cityColumn ? cityColumn.text : '';

    if (!city) {
      console.log(`⚠️  ${item.name}: No city found, skipping`);
      continue;
    }

    const serviceZone = determineServiceZone(city);

    console.log(`📍 ${item.name} (${city}) → ${serviceZone}`);

    try {
      await updateServiceZone(item.id, item.name, serviceZone, serviceZoneColumnId);
      updateCount++;
      await new Promise(resolve => setTimeout(resolve, 300));
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 Service Zone Update Complete!\n');
  console.log(`📊 Summary:`);
  console.log(`   ✅ Updated: ${updateCount}/${items.length}`);
  console.log('\n👉 Check Monday.com to verify the Service Zone values!');
}

main().catch(console.error);