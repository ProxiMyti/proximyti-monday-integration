const https = require('https');

const SUPABASE_URL = 'https://lrrecapmpwjohjkbxqmt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxycmVjYXBtcHdqb2hqa2J4cW10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NTAyMDUsImV4cCI6MjA3NDMyNjIwNX0.2b5EQrfemBcdMSqQDsStug8nCp4RPPGPT6dq-IpuRfU';

function makeSupabaseRequest(endpoint) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/${endpoint}`);

    const options = {
      method: 'GET',
      hostname: url.hostname,
      path: url.pathname + url.search,
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode === 200) {
            resolve(JSON.parse(body));
          } else {
            reject(new Error(`Status ${res.statusCode}: ${body}`));
          }
        } catch (e) {
          reject(e);
        }
      });
    });

    req.on('error', reject);
    req.end();
  });
}

async function checkTables() {
  console.log('🔍 Checking Supabase tables for circulate-vt...\n');

  // Try common table names
  const tablesToCheck = [
    'vendors',
    'shops',
    'stores',
    'businesses',
    'contacts',
    'vendor_contacts',
    'shop_contacts'
  ];

  for (const table of tablesToCheck) {
    try {
      console.log(`📋 Checking table: ${table}`);
      const result = await makeSupabaseRequest(`${table}?limit=1`);

      if (Array.isArray(result)) {
        console.log(`   ✅ Table exists!`);
        if (result.length > 0) {
          console.log(`   📊 Sample structure:`);
          console.log(`   ${JSON.stringify(Object.keys(result[0]), null, 2)}\n`);
        } else {
          console.log(`   ⚠️  Table is empty\n`);
        }
      }
    } catch (error) {
      if (error.message.includes('404') || error.message.includes('does not exist')) {
        console.log(`   ❌ Table does not exist\n`);
      } else {
        console.log(`   ❌ Error: ${error.message}\n`);
      }
    }
  }
}

checkTables().catch(console.error);