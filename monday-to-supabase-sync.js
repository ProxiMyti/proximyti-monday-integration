const https = require('https');

// Configuration
const MONDAY_TOKEN = process.env.MONDAY_TOKEN;
const MONDAY_BOARD_ID = '18056538407'; // ProxiMyti Vendors v2
const SUPABASE_URL = 'https://lrrecapmpwjohjkbxqmt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxycmVjYXBtcHdqb2hqa2J4cW10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NTAyMDUsImV4cCI6MjA3NDMyNjIwNX0.2b5EQrfemBcdMSqQDsStug8nCp4RPPGPT6dq-IpuRfU';
const MONDAY_API_URL = 'https://api.monday.com/v2';

// Monday.com API helper
function makeMondayRequest(query, variables = {}) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query, variables });

    const options = {
      method: 'POST',
      hostname: 'api.monday.com',
      path: '/v2',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': MONDAY_TOKEN,
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
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

// Supabase API helper
function makeSupabaseRequest(endpoint, method = 'GET', data = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${endpoint}`);

    const options = {
      method,
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(body ? JSON.parse(body) : null);
          } else {
            reject(new Error(`Supabase ${res.statusCode}: ${body}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    if (data) req.write(JSON.stringify(data));
    req.end();
  });
}

// Get all vendors from Monday.com
async function getMondayVendors() {
  console.log('📋 Fetching vendors from Monday.com...');

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
              value
            }
          }
        }
        columns {
          id
          title
          type
        }
      }
    }
  `;

  const result = await makeMondayRequest(query, { boardId: [MONDAY_BOARD_ID] });
  const items = result.boards[0].items_page.items;
  const columns = result.boards[0].columns;

  // Create column mapping
  const columnMap = {};
  columns.forEach(col => {
    columnMap[col.id] = col.title;
  });

  return { items, columnMap };
}

// Transform Monday item to Supabase vendor format
function transformVendorData(item, columnMap) {
  const vendor = {
    monday_item_id: item.id,
    shop_name: item.name
  };

  // Map column values to vendor fields
  const fieldMapping = {
    'Vendor Code': 'vendor_code',
    'Address': 'address',
    'City': 'city',
    'State': 'state',
    'Zip Code': 'zip_code',
    'Service Zone': 'service_zone',
    'What3Words': 'what3words',
    'Pickup Door': 'pickup_door',
    'Floor Level': 'floor_level',
    'Pickup Instructions': 'pickup_instructions',
    'Access Code': 'access_code',
    'Business Hours': 'business_hours',
    'Primary Contact': 'primary_contact',
    'Primary Phone': 'primary_phone',
    'Active Status': 'active_status'
  };

  item.column_values.forEach(col => {
    const columnTitle = columnMap[col.id];
    const supabaseField = fieldMapping[columnTitle];

    if (supabaseField) {
      // Handle different column types
      if (columnTitle === 'Primary Phone') {
        // Phone column returns JSON, extract phone number
        try {
          const phoneData = JSON.parse(col.value || '{}');
          vendor[supabaseField] = phoneData.phone || col.text;
        } catch {
          vendor[supabaseField] = col.text;
        }
      } else if (columnTitle === 'Active Status') {
        // Status column
        vendor[supabaseField] = col.text;
      } else {
        // Text columns
        vendor[supabaseField] = col.text;
      }
    }
  });

  return vendor;
}

// Transform contact subitems
function transformContactData(subitems, vendorId) {
  return subitems.map(subitem => {
    // Parse contact info from subitem name (format: "Name | 📧 email | 📞 phone | 👔 title")
    const parts = subitem.name.split(' | ');
    const contact = {
      vendor_id: vendorId,
      monday_subitem_id: subitem.id,
      name: parts[0] || subitem.name,
      email: '',
      phone: '',
      title: ''
    };

    // Extract structured data from formatted name
    parts.forEach(part => {
      if (part.includes('📧 ')) {
        contact.email = part.replace('📧 ', '');
      } else if (part.includes('📞 ')) {
        contact.phone = part.replace('📞 ', '');
      } else if (part.includes('👔 ')) {
        contact.title = part.replace('👔 ', '');
      }
    });

    return contact;
  });
}

// Sync vendors to Supabase
async function syncVendorsToSupabase(vendors) {
  console.log(`📤 Syncing ${vendors.length} vendors to Supabase...`);

  let successCount = 0;
  let errorCount = 0;

  for (const vendor of vendors) {
    try {
      // Check if vendor already exists
      const existing = await makeSupabaseRequest(
        `vendors?monday_item_id=eq.${vendor.monday_item_id}&select=id`
      );

      if (existing && existing.length > 0) {
        // Update existing vendor
        await makeSupabaseRequest(
          `vendors?monday_item_id=eq.${vendor.monday_item_id}`,
          'PATCH',
          vendor
        );
        console.log(`   ✅ Updated: ${vendor.shop_name}`);
      } else {
        // Insert new vendor
        const result = await makeSupabaseRequest('vendors', 'POST', vendor);
        console.log(`   ✅ Created: ${vendor.shop_name}`);
      }
      successCount++;
    } catch (error) {
      console.error(`   ❌ Error syncing ${vendor.shop_name}: ${error.message}`);
      errorCount++;
    }
  }

  return { successCount, errorCount };
}

// Sync contacts to Supabase
async function syncContactsToSupabase(allContacts) {
  if (allContacts.length === 0) {
    console.log('📞 No contacts to sync');
    return { successCount: 0, errorCount: 0 };
  }

  console.log(`📤 Syncing ${allContacts.length} contacts to Supabase...`);

  let successCount = 0;
  let errorCount = 0;

  for (const contact of allContacts) {
    try {
      // Check if contact already exists
      const existing = await makeSupabaseRequest(
        `vendor_contacts?monday_subitem_id=eq.${contact.monday_subitem_id}&select=id`
      );

      if (existing && existing.length > 0) {
        // Update existing contact
        await makeSupabaseRequest(
          `vendor_contacts?monday_subitem_id=eq.${contact.monday_subitem_id}`,
          'PATCH',
          contact
        );
        console.log(`   ✅ Updated contact: ${contact.name}`);
      } else {
        // Insert new contact
        await makeSupabaseRequest('vendor_contacts', 'POST', contact);
        console.log(`   ✅ Created contact: ${contact.name}`);
      }
      successCount++;
    } catch (error) {
      console.error(`   ❌ Error syncing contact ${contact.name}: ${error.message}`);
      errorCount++;
    }
  }

  return { successCount, errorCount };
}

// Main sync function
async function syncMondayToSupabase() {
  console.log('🔄 Starting Monday.com → Supabase sync...');
  console.log(`📋 Board: ProxiMyti Vendors v2 (${MONDAY_BOARD_ID})`);
  console.log(`🗄️ Database: circulate-vt\n`);

  try {
    // Get data from Monday
    const { items, columnMap } = await getMondayVendors();
    console.log(`📊 Found ${items.length} vendors in Monday.com\n`);

    // Transform and sync vendors
    const vendors = [];
    const allContacts = [];

    for (const item of items) {
      // Transform vendor data
      const vendor = transformVendorData(item, columnMap);
      vendors.push(vendor);

      // If we have subitems, we need to get the vendor ID first
      if (item.subitems && item.subitems.length > 0) {
        // Store contacts for later processing (after vendors are synced)
        const contacts = transformContactData(item.subitems, null); // Will update vendor_id later
        contacts.forEach(contact => {
          contact.monday_item_id = item.id; // Store Monday item ID for lookup
          allContacts.push(contact);
        });
      }
    }

    // Sync vendors first
    const vendorResults = await syncVendorsToSupabase(vendors);

    // Now sync contacts (need to look up vendor IDs)
    let contactResults = { successCount: 0, errorCount: 0 };
    if (allContacts.length > 0) {
      console.log('\n📞 Processing contacts...');

      // Get vendor IDs for contacts
      for (const contact of allContacts) {
        try {
          const vendorQuery = await makeSupabaseRequest(
            `vendors?monday_item_id=eq.${contact.monday_item_id}&select=id`
          );

          if (vendorQuery && vendorQuery.length > 0) {
            contact.vendor_id = vendorQuery[0].id;
            delete contact.monday_item_id; // Clean up temp field
          }
        } catch (error) {
          console.error(`   ❌ Error looking up vendor for contact: ${error.message}`);
        }
      }

      // Filter out contacts without vendor_id
      const validContacts = allContacts.filter(c => c.vendor_id);
      contactResults = await syncContactsToSupabase(validContacts);
    }

    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('🎉 Sync Complete!');
    console.log('\n📊 Results:');
    console.log(`   🏪 Vendors: ${vendorResults.successCount} synced, ${vendorResults.errorCount} errors`);
    console.log(`   👥 Contacts: ${contactResults.successCount} synced, ${contactResults.errorCount} errors`);
    console.log('\n✅ Monday.com is now synced with Supabase!');
    console.log('🔄 Run this script whenever you update vendors in Monday.com');

  } catch (error) {
    console.error('❌ Sync failed:', error.message);
  }
}

// Check if running directly (not imported)
if (require.main === module) {
  if (!MONDAY_TOKEN) {
    console.error('❌ MONDAY_TOKEN environment variable not set');
    process.exit(1);
  }

  syncMondayToSupabase().catch(console.error);
}

module.exports = { syncMondayToSupabase };