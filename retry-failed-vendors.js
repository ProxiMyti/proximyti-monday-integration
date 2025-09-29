const https = require('https');
const fs = require('fs');
const { parse } = require('csv-parse/sync');

const MONDAY_TOKEN = process.env.MONDAY_TOKEN;
const BOARD_ID = '18056538407';
const API_URL = 'https://api.monday.com/v2';

const FAILED_VENDORS = [
  'Butterfly Bakery of Vermont',
  'SmelLit VT',
  'Glow Aesthetics Medical Spa​',
  'Small Oven Pastries',
  '4t2d',
  'Ego Salon',
  'Lenny\'s Shoe and Apparel',
  'Phoenix Books Burlington'
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

async function getColumnIds() {
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

  return columnMap;
}

function formatColumnValue(value, columnTitle) {
  if (value === '' || value === null || value === undefined) {
    return '';
  }

  if (columnTitle === 'Primary Phone') {
    return { phone: value, countryShortName: 'US' };
  }

  if (columnTitle === 'Active Status') {
    return { index: 1 }; // Default to first status option
  }

  return value;
}

async function addVendor(vendor, columnMap) {
  const columnValuesObj = {};

  for (const [columnTitle, value] of Object.entries(vendor)) {
    if (columnMap[columnTitle]) {
      const columnId = columnMap[columnTitle].id;
      const formattedValue = formatColumnValue(value, columnTitle);

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
    itemName: vendor['Shop Name'],
    columnValues: columnValuesString
  };

  const result = await makeMondayRequest(query, variables);
  return result.create_item;
}

async function addContactSubitem(parentItemId, contact, vendorName) {
  const query = `
    mutation ($parentItemId: ID!, $itemName: String!) {
      create_subitem (
        parent_item_id: $parentItemId,
        item_name: $itemName
      ) {
        id
        name
      }
    }
  `;

  const variables = {
    parentItemId: parentItemId,
    itemName: contact.name || contact.email
  };

  try {
    const result = await makeMondayRequest(query, variables);
    console.log(`      ✅ Added contact: ${contact.name || contact.email}`);
    return result.create_subitem;
  } catch (error) {
    console.error(`      ❌ Failed to add contact ${contact.name}:`, error.message);
    return null;
  }
}

async function main() {
  if (!MONDAY_TOKEN) {
    console.error('❌ MONDAY_TOKEN environment variable not set');
    process.exit(1);
  }

  console.log('🔄 Retrying Failed ProxiMyti Vendors');
  console.log(`📋 Board ID: ${BOARD_ID}\n`);

  // Load vendor data
  const csvContent = fs.readFileSync('/Users/bill/workspace/proximyti-monday-integration/vendors-all-zones.csv', 'utf-8');
  const vendors = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  // Load contact data
  const contactsData = JSON.parse(
    fs.readFileSync('/Users/bill/workspace/proximyti-monday-integration/vendor-contacts.json', 'utf-8')
  );

  const contactsMap = {};
  contactsData.forEach(v => {
    contactsMap[v.vendorCode] = v.contacts;
  });

  console.log('📋 Fetching column IDs...\n');
  const columnMap = await getColumnIds();

  let successCount = 0;
  let errorCount = 0;
  let contactCount = 0;

  // Filter to only failed vendors
  const failedVendorData = vendors.filter(vendor =>
    FAILED_VENDORS.includes(vendor['Shop Name'])
  );

  console.log(`Found ${failedVendorData.length} failed vendors to retry\n`);

  for (let i = 0; i < failedVendorData.length; i++) {
    const vendor = failedVendorData[i];
    const vendorNum = i + 1;

    console.log(`\n[${vendorNum}/${failedVendorData.length}] 🔄 ${vendor['Shop Name']} (${vendor['Service Zone']})`);

    try {
      const item = await addVendor(vendor, columnMap);
      console.log(`   ✅ Vendor added (ID: ${item.id})`);
      successCount++;

      // Add contact subitems
      const contacts = contactsMap[vendor['Vendor Code']] || [];
      if (contacts.length > 1) {
        console.log(`   👥 Adding ${contacts.length} contacts...`);
        for (const contact of contacts) {
          await addContactSubitem(item.id, contact, vendor['Shop Name']);
          contactCount++;
          await new Promise(resolve => setTimeout(resolve, 300));
        }
      }

      await new Promise(resolve => setTimeout(resolve, 1000)); // Longer delay to avoid rate limits
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 Retry Complete!');
  console.log(`📊 Summary:`);
  console.log(`   ✅ Vendors imported: ${successCount}/${failedVendorData.length}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   👥 Contacts added: ${contactCount}`);
  console.log('\n👉 Visit Monday.com to view your ProxiMyti Vendors v2 board!');
}

main().catch(console.error);