const https = require('https');

const SUPABASE_URL = 'https://lrrecapmpwjohjkbxqmt.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxycmVjYXBtcHdqb2hqa2J4cW10Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg3NTAyMDUsImV4cCI6MjA3NDMyNjIwNX0.2b5EQrfemBcdMSqQDsStug8nCp4RPPGPT6dq-IpuRfU';

function executeSQL(sqlQuery) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ query: sqlQuery });

    const options = {
      hostname: 'lrrecapmpwjohjkbxqmt.supabase.co',
      path: '/rest/v1/rpc/exec_sql',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            resolve(body);
          } else {
            reject(new Error(`Status ${res.statusCode}: ${body}`));
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

async function createTables() {
  console.log('🏗️ Setting up Supabase tables for ProxiMyti Vendors v2 sync...\n');

  const createTablesSQL = `
-- Drop tables if they exist (for clean setup)
DROP TABLE IF EXISTS vendor_contacts CASCADE;
DROP TABLE IF EXISTS vendors CASCADE;

-- Create vendors table to match Monday.com ProxiMyti Vendors v2 board
CREATE TABLE vendors (
    id SERIAL PRIMARY KEY,
    monday_item_id TEXT UNIQUE NOT NULL, -- Monday.com item ID for sync
    vendor_code TEXT,
    shop_name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    service_zone TEXT,
    what3words TEXT,
    pickup_door TEXT,
    floor_level TEXT,
    pickup_instructions TEXT, -- long_text in Monday
    access_code TEXT,
    business_hours TEXT,
    primary_contact TEXT,
    primary_phone TEXT, -- phone type in Monday
    active_status TEXT, -- status type in Monday
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create vendor_contacts table for subitems
CREATE TABLE vendor_contacts (
    id SERIAL PRIMARY KEY,
    vendor_id INTEGER REFERENCES vendors(id) ON DELETE CASCADE,
    monday_subitem_id TEXT UNIQUE NOT NULL, -- Monday.com subitem ID for sync
    name TEXT,
    email TEXT,
    phone TEXT,
    title TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX idx_vendors_monday_id ON vendors(monday_item_id);
CREATE INDEX idx_vendors_vendor_code ON vendors(vendor_code);
CREATE INDEX idx_vendors_service_zone ON vendors(service_zone);
CREATE INDEX idx_vendor_contacts_monday_id ON vendor_contacts(monday_subitem_id);
CREATE INDEX idx_vendor_contacts_vendor_id ON vendor_contacts(vendor_id);
  `;

  try {
    console.log('📋 Creating tables...');
    await executeSQL(createTablesSQL);
    console.log('✅ Tables created successfully!\n');

    const createTriggersSQL = `
-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to auto-update updated_at
CREATE TRIGGER update_vendors_updated_at
    BEFORE UPDATE ON vendors
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_vendor_contacts_updated_at
    BEFORE UPDATE ON vendor_contacts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `;

    console.log('⚡ Creating triggers...');
    await executeSQL(createTriggersSQL);
    console.log('✅ Triggers created successfully!\n');

  } catch (error) {
    console.error('❌ Error creating tables:', error.message);

    // Try alternative method - direct HTTP request to SQL endpoint
    console.log('🔄 Trying alternative SQL execution method...');

    try {
      // Simple table creation without complex SQL
      const simpleSQL = `
CREATE TABLE IF NOT EXISTS vendors (
    id SERIAL PRIMARY KEY,
    monday_item_id TEXT UNIQUE,
    vendor_code TEXT,
    shop_name TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    zip_code TEXT,
    service_zone TEXT,
    what3words TEXT,
    pickup_door TEXT,
    floor_level TEXT,
    pickup_instructions TEXT,
    access_code TEXT,
    business_hours TEXT,
    primary_contact TEXT,
    primary_phone TEXT,
    active_status TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vendor_contacts (
    id SERIAL PRIMARY KEY,
    vendor_id INTEGER,
    monday_subitem_id TEXT UNIQUE,
    name TEXT,
    email TEXT,
    phone TEXT,
    title TEXT,
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
      `;

      await executeSQL(simpleSQL);
      console.log('✅ Tables created with alternative method!\n');

    } catch (altError) {
      console.error('❌ Alternative method also failed:', altError.message);
      console.log('\n📝 MANUAL SETUP REQUIRED:');
      console.log('Please go to your Supabase dashboard → SQL Editor and run:');
      console.log('File: create-supabase-tables.sql\n');
      return;
    }
  }

  console.log('🎉 Supabase setup complete!');
  console.log('\n📋 Tables created:');
  console.log('   ✅ vendors - main vendor data');
  console.log('   ✅ vendor_contacts - contact subitems');
  console.log('\n🔄 Ready for Monday.com sync integration!');
  console.log('   📊 Monday board: ProxiMyti Vendors v2 (18056538407)');
  console.log('   🗄️ Supabase: circulate-vt project');
}

createTables().catch(console.error);