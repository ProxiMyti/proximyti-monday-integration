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

-- Enable Row Level Security (optional but recommended)
ALTER TABLE vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_contacts ENABLE ROW LEVEL SECURITY;

-- Create policies for public access (adjust as needed for your security requirements)
CREATE POLICY "Enable read access for all users" ON vendors FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON vendors FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON vendors FOR UPDATE USING (true);

CREATE POLICY "Enable read access for all users" ON vendor_contacts FOR SELECT USING (true);
CREATE POLICY "Enable insert access for all users" ON vendor_contacts FOR INSERT WITH CHECK (true);
CREATE POLICY "Enable update access for all users" ON vendor_contacts FOR UPDATE USING (true);