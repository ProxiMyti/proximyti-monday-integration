const fs = require('fs');
const { parse } = require('csv-parse/sync');

const CHITTENDEN_CORE_ZIPS = [
  '05401', '05402', '05403', '05404', '05405', '05408',
  '05446', '05451', '05452', '05482', '05495'
];

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
  'Hyde Park': 'Lamoille County',
  'Stowe': 'Lamoille County',
  'Morrisville': 'Lamoille County',
  'St Albans': 'Franklin County',
  'St Albans City': 'Franklin County',
  'Swanton': 'Franklin County',
  'Starksboro': 'Addison County'
};

function parseCSV(content) {
  return parse(content, {
    columns: true,
    skip_empty_lines: true,
    trim: true
  });
}

function generateVendorCode(companyName) {
  return companyName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, '-')
    .substring(0, 30);
}

function extractZipCode(address) {
  const zipMatch = address.match(/\b(05\d{3})\b/);
  return zipMatch ? zipMatch[1] : '';
}

function extractWhat3Words(text) {
  const w3wMatch = text.match(/\/{3}([a-z]+\.[a-z]+\.[a-z]+)/i);
  return w3wMatch ? w3wMatch[1] : '';
}

function extractAccessCode(text) {
  const codeMatch = text.match(/#?(\d{4,6})\s+is\s+the\s+(door\s+)?code/i);
  return codeMatch ? codeMatch[1] : '';
}

function cleanPhoneNumber(phone) {
  return phone.replace(/[^0-9]/g, '');
}

function determineServiceZone(city, zip) {
  if (!city) return 'Other';

  const normalizedCity = city.trim();

  // Check if in core service area
  if (zip && CHITTENDEN_CORE_ZIPS.includes(zip)) {
    return 'Chittenden Core';
  }

  if (CHITTENDEN_CORE_CITIES.includes(normalizedCity)) {
    return 'Chittenden Core';
  }

  // Check if in extended Chittenden
  if (CHITTENDEN_EXTENDED_CITIES.includes(normalizedCity)) {
    return 'Chittenden Extended';
  }

  // Check other counties
  if (COUNTY_MAP[normalizedCity]) {
    return COUNTY_MAP[normalizedCity];
  }

  return 'Other';
}

function parseContacts(contactField) {
  if (!contactField || !contactField.trim()) {
    return [];
  }

  // Split by semicolon for multiple contacts
  const contactStrings = contactField.split(';').map(c => c.trim());

  const contacts = [];

  contactStrings.forEach(contactStr => {
    // Pattern: "Name (email)" or just "Name" or just "email"
    const match = contactStr.match(/^([^(]+?)(?:\s*\(([^)]+)\))?$/);

    if (match) {
      const name = match[1] ? match[1].trim() : '';
      const email = match[2] ? match[2].trim() : '';

      if (name || email) {
        contacts.push({
          name: name || email,
          email: email || '',
          phone: '',
          title: ''
        });
      }
    }
  });

  return contacts;
}

function cleanVendor(row) {
  const companyName = row['Company name'];

  if (!companyName) return null;

  const streetAddress = row['Street Address'] || row['Shop Address'] || '';
  const streetAddress2 = row['Street Address 2'] || '';
  const fullAddress = [streetAddress, streetAddress2].filter(Boolean).join(', ');

  const city = row['City'] || '';
  const zipCode = extractZipCode(fullAddress + ' ' + (row['Shop Address'] || ''));

  const serviceZone = determineServiceZone(city, zipCode);

  const pickupInstructions = row['Pickup Instructions'] || '';
  const what3words = extractWhat3Words(pickupInstructions);
  const accessCode = extractAccessCode(pickupInstructions);

  const contacts = parseContacts(row['Contact with Primary Company']);

  // Use first contact as primary, rest as subitems
  const primaryContact = contacts[0] || { name: '', email: '', phone: '', title: '' };
  const additionalContacts = contacts.slice(1);

  const cleaned = {
    'Vendor Code': generateVendorCode(companyName),
    'Shop Name': companyName,
    'Address': fullAddress || streetAddress,
    'City': city,
    'State': 'VT',
    'Zip Code': zipCode,
    'Service Zone': serviceZone,
    'What3Words': what3words,
    'Pickup Door': '',
    'Floor Level': '',
    'Pickup Instructions': pickupInstructions,
    'Access Code': accessCode,
    'Business Hours': row['Hours of Shop'] || '',
    'Primary Contact': primaryContact.name,
    'Primary Phone': cleanPhoneNumber(row['Phone Number'] || ''),
    'Active Status': 'true',
    'Contacts': contacts // All contacts for subitems
  };

  return cleaned;
}

function main() {
  console.log('🧹 Cleaning HubSpot CSV for ProxiMyti Monday.com import\n');

  const csvContent = fs.readFileSync('/Users/bill/workspace/circulate-vt-email-parser/hubspot-crm-exports-all-companies-2025-09-25.csv', 'utf-8');

  const rows = parseCSV(csvContent);

  console.log(`📊 Total vendors in HubSpot: ${rows.length}\n`);

  const cleanedVendors = rows
    .map(cleanVendor)
    .filter(Boolean);

  // Count by zone
  const zoneCounts = {};
  cleanedVendors.forEach(v => {
    const zone = v['Service Zone'];
    zoneCounts[zone] = (zoneCounts[zone] || 0) + 1;
  });

  console.log('📍 Vendors by Service Zone:');
  Object.entries(zoneCounts).sort((a, b) => b[1] - a[1]).forEach(([zone, count]) => {
    console.log(`   ${zone}: ${count}`);
  });

  // Count contacts
  const totalContacts = cleanedVendors.reduce((sum, v) => sum + v.Contacts.length, 0);
  const vendorsWithMultipleContacts = cleanedVendors.filter(v => v.Contacts.length > 1).length;

  console.log(`\n👥 Total contacts: ${totalContacts}`);
  console.log(`   Vendors with multiple contacts: ${vendorsWithMultipleContacts}\n`);

  console.log('Vendors with multiple contacts:');
  cleanedVendors
    .filter(v => v.Contacts.length > 1)
    .forEach(v => {
      console.log(`  - ${v['Shop Name']}: ${v.Contacts.length} contacts`);
      v.Contacts.forEach(c => console.log(`      • ${c.name} ${c.email ? '(' + c.email + ')' : ''}`));
    });

  // Save main CSV (without Contacts array)
  const headers = Object.keys(cleanedVendors[0]).filter(h => h !== 'Contacts');
  const csvLines = [headers.join(',')];

  cleanedVendors.forEach(vendor => {
    const values = headers.map(header => {
      const value = vendor[header] || '';
      return value.includes(',') || value.includes('"') || value.includes('\n')
        ? `"${value.replace(/"/g, '""')}"`
        : value;
    });
    csvLines.push(values.join(','));
  });

  const outputPath = '/Users/bill/workspace/proximyti-monday-integration/vendors-all-zones.csv';
  fs.writeFileSync(outputPath, csvLines.join('\n'));

  // Save contacts JSON for subitem import
  const contactsData = cleanedVendors.map(v => ({
    vendorCode: v['Vendor Code'],
    shopName: v['Shop Name'],
    contacts: v.Contacts
  }));

  const contactsPath = '/Users/bill/workspace/proximyti-monday-integration/vendor-contacts.json';
  fs.writeFileSync(contactsPath, JSON.stringify(contactsData, null, 2));

  console.log(`\n✅ Cleaned CSV saved to: ${outputPath}`);
  console.log(`✅ Contacts JSON saved to: ${contactsPath}`);
  console.log(`\n📋 Ready to import ${cleanedVendors.length} vendors with ${totalContacts} contacts!`);
}

main();