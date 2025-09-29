const https = require('https');
const fs = require('fs');

const MONDAY_TOKEN = process.env.MONDAY_TOKEN;
const BOARD_ID = '18056538407';
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

async function getAllItemsWithSubitems() {
  console.log('📋 Fetching all vendors and subitems...\n');

  const query = `
    query ($boardId: [ID!]!) {
      boards (ids: $boardId) {
        items_page (limit: 100) {
          items {
            id
            name
            subitems {
              id
              name
            }
            column_values {
              id
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

async function updateSubitemName(subitemId, newName) {
  const query = `
    mutation ($itemId: ID!, $itemName: String!) {
      change_item_value (
        item_id: $itemId,
        column_id: "name",
        value: $itemName
      ) {
        id
        name
      }
    }
  `;

  const variables = {
    itemId: subitemId,
    itemName: newName
  };

  try {
    await makeMondayRequest(query, variables);
    return true;
  } catch (error) {
    console.error(`     ❌ Failed to update subitem: ${error.message}`);
    return false;
  }
}

function buildContactDisplay(contact) {
  const parts = [];

  if (contact.name) parts.push(contact.name);
  if (contact.email) parts.push(`📧 ${contact.email}`);
  if (contact.phone) parts.push(`📞 ${contact.phone}`);
  if (contact.title) parts.push(`👔 ${contact.title}`);

  return parts.join(' | ');
}

function findVendorCodeFromName(vendorName, vendors) {
  const vendor = vendors.find(v => v['Shop Name'] === vendorName);
  return vendor ? vendor['Vendor Code'] : null;
}

async function main() {
  if (!MONDAY_TOKEN) {
    console.error('❌ MONDAY_TOKEN environment variable not set');
    process.exit(1);
  }

  console.log('📝 Updating Subitem Contact Details');
  console.log(`📋 Board ID: ${BOARD_ID}\n`);

  // Load contact data
  const contactsData = JSON.parse(
    fs.readFileSync('/Users/bill/workspace/proximyti-monday-integration/vendor-contacts.json', 'utf-8')
  );

  const contactsMap = {};
  contactsData.forEach(v => {
    contactsMap[v.vendorCode] = v.contacts;
  });

  // Load vendor data to map names to codes
  const { parse } = require('csv-parse/sync');
  const csvContent = fs.readFileSync('/Users/bill/workspace/proximyti-monday-integration/vendors-all-zones.csv', 'utf-8');
  const vendors = parse(csvContent, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });

  const { items } = await getAllItemsWithSubitems();

  let updateCount = 0;
  let itemsWithSubitems = 0;

  for (const item of items) {
    if (item.subitems && item.subitems.length > 0) {
      itemsWithSubitems++;
      const vendorName = item.name;
      const vendorCode = findVendorCodeFromName(vendorName, vendors);

      console.log(`\n🏪 ${vendorName} (${item.subitems.length} contacts)`);

      if (!vendorCode) {
        console.log(`   ⚠️  Could not find vendor code for ${vendorName}`);
        continue;
      }

      const contacts = contactsMap[vendorCode] || [];

      if (contacts.length !== item.subitems.length) {
        console.log(`   ⚠️  Contact count mismatch: ${contacts.length} in data vs ${item.subitems.length} subitems`);
      }

      // Update each subitem with detailed contact info
      for (let i = 0; i < Math.min(item.subitems.length, contacts.length); i++) {
        const subitem = item.subitems[i];
        const contact = contacts[i];

        const detailedName = buildContactDisplay(contact);

        console.log(`   📞 Updating: "${subitem.name}" → "${detailedName}"`);

        const success = await updateSubitemName(subitem.id, detailedName);
        if (success) {
          updateCount++;
        }

        await new Promise(resolve => setTimeout(resolve, 500)); // Rate limiting
      }
    }
  }

  console.log('\n' + '='.repeat(60));
  console.log('🎉 Subitem Update Complete!');
  console.log(`📊 Summary:`);
  console.log(`   🏪 Vendors with contacts: ${itemsWithSubitems}`);
  console.log(`   📞 Subitems updated: ${updateCount}`);
  console.log('\n👉 Visit Monday.com to see the updated contact details!');
}

main().catch(console.error);