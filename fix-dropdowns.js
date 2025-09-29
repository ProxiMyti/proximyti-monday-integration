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

const dropdownColumns = {
  'City': ['Burlington', 'South Burlington', 'Winooski', 'Essex Junction', 'Colchester', 'Williston', 'Shelburne', 'Essex'],
  'State': ['VT'],
  'Zip Code': ['05401', '05402', '05403', '05404', '05405', '05408', '05446', '05451', '05452', '05482', '05495'],
  'Floor Level': ['Ground', '2nd floor', '3rd floor', 'Basement', 'Mezzanine']
};

async function getColumnIds() {
  console.log('📋 Fetching column IDs...\n');

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

  const dropdownCols = columns.filter(col => col.type === 'dropdown');

  console.log('Dropdown columns found:');
  dropdownCols.forEach(col => {
    console.log(`  - ${col.title} (ID: ${col.id})`);
    console.log(`    Settings: ${col.settings_str}`);
  });

  return columns;
}

async function addDropdownOptions(columnId, columnTitle, labels) {
  console.log(`\n🎯 Adding options to "${columnTitle}"...`);

  for (const label of labels) {
    const query = `
      mutation ($boardId: ID!, $columnId: String!, $label: String!) {
        create_column_value_dropdown_setting (
          board_id: $boardId,
          column_id: $columnId,
          label: $label
        ) {
          id
          name
        }
      }
    `;

    try {
      await makeMondayRequest(query, {
        boardId: BOARD_ID,
        columnId: columnId,
        label: label
      });
      console.log(`  ✅ Added: ${label}`);
      await new Promise(resolve => setTimeout(resolve, 200));
    } catch (error) {
      console.error(`  ❌ Failed to add "${label}":`, error.message);
    }
  }
}

async function main() {
  if (!MONDAY_TOKEN) {
    console.error('❌ MONDAY_TOKEN environment variable not set');
    process.exit(1);
  }

  console.log('🚀 Adding dropdown options to ProximyTi Vendors board');
  console.log(`📋 Board ID: ${BOARD_ID}\n`);

  const columns = await getColumnIds();

  const columnMap = {};
  columns.forEach(col => {
    columnMap[col.title] = col.id;
  });

  console.log('\n');

  for (const [columnTitle, labels] of Object.entries(dropdownColumns)) {
    const columnId = columnMap[columnTitle];
    if (columnId) {
      await addDropdownOptions(columnId, columnTitle, labels);
    } else {
      console.log(`⚠️  Column "${columnTitle}" not found`);
    }
  }

  console.log('\n🎉 All dropdown options added!');
}

main().catch(console.error);