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

const vendors = [
  {
    name: 'Phoenix Books',
    columnValues: {
      'Vendor Code': 'phoenix-books',
      'Shop Name': 'Phoenix Books',
      'Address': '191 Bank Street',
      'City': 'Burlington',
      'State': 'VT',
      'Zip Code': '05401',
      'What3Words': 'panels.behalf.likes',
      'Pickup Door': 'Front entrance on Bank Street. Ring bell if door is locked.',
      'Floor Level': 'Ground',
      'Pickup Instructions': 'Park in loading zone on Bank Street. Ring doorbell. Orders will be packaged and ready at front desk.',
      'Access Code': '',
      'Business Hours': 'Mon-Sat: 10am-7pm, Sun: 11am-5pm',
      'Primary Contact': 'Front Desk',
      'Primary Phone': '8024483350',
      'Active Status': true
    }
  }
];

async function getColumnIds() {
  console.log('📋 Fetching column IDs...');

  const query = `
    query ($boardId: [ID!]!) {
      boards (ids: $boardId) {
        columns {
          id
          title
          type
        }
      }
    }
  `;

  const result = await makeMondayRequest(query, { boardId: [BOARD_ID] });
  const columns = result.boards[0].columns;

  const columnMap = {};
  columns.forEach(col => {
    columnMap[col.title] = { id: col.id, type: col.type };
  });

  console.log('✅ Column mapping created\n');
  return columnMap;
}

function formatColumnValue(columnInfo, value) {
  const { type } = columnInfo;

  if (value === '' || value === null || value === undefined) {
    return '';
  }

  switch (type) {
    case 'text':
    case 'long_text':
    case 'dropdown':
      return value;

    case 'phone':
      return { phone: value, countryShortName: 'US' };

    case 'boolean':
      return { checked: value.toString() };

    default:
      return value;
  }
}

async function addVendor(vendor, columnMap) {
  console.log(`\n🏪 Adding vendor: ${vendor.name}...`);

  const columnValuesObj = {};

  for (const [columnTitle, value] of Object.entries(vendor.columnValues)) {
    if (columnMap[columnTitle]) {
      const columnId = columnMap[columnTitle].id;
      const formattedValue = formatColumnValue(columnMap[columnTitle], value);
      if (formattedValue !== '') {
        columnValuesObj[columnId] = formattedValue;
      }
    }
  }

  const columnValuesString = JSON.stringify(columnValuesObj);

  const query = `
    mutation ($boardId: ID!, $itemName: String!, $columnValues: JSON!) {
      create_item (
        board_id: $boardId,
        item_name: $itemName,
        column_values: $columnValues
      ) {
        id
        name
      }
    }
  `;

  const variables = {
    boardId: BOARD_ID,
    itemName: vendor.name,
    columnValues: columnValuesString
  };

  try {
    const result = await makeMondayRequest(query, variables);
    console.log(`✅ ${vendor.name} added (ID: ${result.create_item.id})`);
    return result.create_item;
  } catch (error) {
    console.error(`❌ Error adding ${vendor.name}:`, error.message);
    throw error;
  }
}

async function main() {
  if (!MONDAY_TOKEN) {
    console.error('❌ MONDAY_TOKEN environment variable not set');
    process.exit(1);
  }

  console.log('🚀 Adding vendors to ProximyTi Vendors board');
  console.log(`📋 Board ID: ${BOARD_ID}\n`);

  const columnMap = await getColumnIds();

  for (const vendor of vendors) {
    await addVendor(vendor, columnMap);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n🎉 All vendors added successfully!');
  console.log('\n📊 Summary:');
  console.log(`   Board ID: ${BOARD_ID}`);
  console.log(`   Vendors added: ${vendors.length}`);
  console.log('\n👉 Visit Monday.com to view your board!');
}

main().catch(console.error);