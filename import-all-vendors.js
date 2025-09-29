const https = require('https');
const fs = require('fs');
const { parse } = require('csv-parse/sync');

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

function formatColumnValue(columnInfo, value, columnTitle) {
  if (value === '' || value === null || value === undefined) {
    return '';
  }

  // Force these columns to be treated as text (user converted them but API cache hasn't updated)
  const forceTextColumns = ['City', 'State', 'Zip Code', 'Service Zone', 'Floor Level'];

  if (forceTextColumns.includes(columnTitle)) {
    return value; // Force plain text regardless of API reported type
  }

  if (columnTitle === 'Primary Phone') {
    return { phone: value, countryShortName: 'US' };
  }

  if (columnTitle === 'Active Status') {
    // Convert to boolean for checkbox
    const boolValue = value.toString().toLowerCase() === 'true' || value.toString() === '1' || value.toString().toLowerCase() === 'yes';
    return { checked: boolValue };
  }

  if (columnTitle === 'Pickup Instructions') {
    return value; // Long text column
  }

  // For all other columns, treat as text
  return value;
}

async function addVendor(vendor, columnMap) {
  const columnValuesObj = {};

  for (const [columnTitle, value] of Object.entries(vendor)) {
    if (columnMap[columnTitle]) {
      const columnId = columnMap[columnTitle].id;
      const columnType = columnMap[columnTitle].type;
      const formattedValue = formatColumnValue(columnMap[columnTitle], value, columnTitle);

      // Debug logging for City column
      if (columnTitle === 'City') {
        console.log(`   DEBUG City: type=${columnType}, value="${value}", formatted=`, typeof formattedValue === 'object' ? JSON.stringify(formattedValue) : formattedValue);
      }

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

  console.log('🚀 Importing all ProxiMyti vendors to Monday.com\n');
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

  for (let i = 0; i < vendors.length; i++) {
    const vendor = vendors[i];
    const vendorNum = i + 1;

    console.log(`\n[${vendorNum}/${vendors.length}] 🏪 ${vendor['Shop Name']} (${vendor['Service Zone']})`);

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

      await new Promise(resolve => setTimeout(resolve, 500));
    } catch (error) {
      console.error(`   ❌ Error: ${error.message}`);
      errorCount++;
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 Import Complete!\n');
  console.log(`📊 Summary:`);
  console.log(`   ✅ Vendors imported: ${successCount}/${vendors.length}`);
  console.log(`   ❌ Errors: ${errorCount}`);
  console.log(`   👥 Contacts added: ${contactCount}`);
  console.log('\n👉 Visit Monday.com to view your ProxiMyti Vendors board!');
}

main().catch(console.error);