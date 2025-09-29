const fs = require('fs');
const { parse } = require('csv-parse/sync');

const SERVICE_AREA_CITIES = [
  'Burlington', 'South Burlington', 'Winooski', 'Essex Junction',
  'Colchester', 'Williston', 'Shelburne', 'Essex'
];

const SERVICE_AREA_ZIPS = [
  '05401', '05402', '05403', '05404', '05405', '05408',
  '05446', '05451', '05452', '05482', '05495'
];

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

function extractPrimaryContact(contactField) {
  if (!contactField) return '';

  const match = contactField.match(/^([^(]+)/);
  return match ? match[1].trim() : '';
}

function isInServiceArea(city, zip) {
  if (!city) return false;

  const normalizedCity = city.trim();

  if (SERVICE_AREA_CITIES.includes(normalizedCity)) return true;

  if (zip && SERVICE_AREA_ZIPS.includes(zip)) return true;

  return false;
}

function cleanVendor(row) {
  const companyName = row['Company name'];

  if (!companyName) return null;

  const streetAddress = row['Street Address'] || row['Shop Address'] || '';
  const streetAddress2 = row['Street Address 2'] || '';
  const fullAddress = [streetAddress, streetAddress2].filter(Boolean).join(', ');

  const city = row['City'] || '';
  const zipCode = extractZipCode(fullAddress + ' ' + row['Shop Address'] || '');

  const inServiceArea = isInServiceArea(city, zipCode);

  const pickupInstructions = row['Pickup Instructions'] || '';
  const what3words = extractWhat3Words(pickupInstructions);
  const accessCode = extractAccessCode(pickupInstructions);

  const cleaned = {
    'Vendor Code': generateVendorCode(companyName),
    'Shop Name': companyName,
    'Address': fullAddress || streetAddress,
    'City': city,
    'State': 'VT',
    'Zip Code': zipCode,
    'What3Words': what3words,
    'Pickup Door': '',
    'Floor Level': '',
    'Pickup Instructions': pickupInstructions,
    'Access Code': accessCode,
    'Business Hours': row['Hours of Shop'] || '',
    'Primary Contact': extractPrimaryContact(row['Contact with Primary Company']),
    'Primary Phone': cleanPhoneNumber(row['Phone Number'] || ''),
    'Active Status': 'true',
    'In Service Area': inServiceArea ? 'YES' : 'NO'
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

  const inServiceArea = cleanedVendors.filter(v => v['In Service Area'] === 'YES');
  const outOfArea = cleanedVendors.filter(v => v['In Service Area'] === 'NO');

  console.log(`✅ Vendors in Chittenden County service area: ${inServiceArea.length}`);
  console.log(`⚠️  Vendors outside service area: ${outOfArea.length}\n`);

  console.log('In-service vendors:');
  inServiceArea.forEach(v => {
    console.log(`  - ${v['Shop Name']} (${v.City}, ${v['Zip Code']})`);
  });

  const headers = Object.keys(cleanedVendors[0]);
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

  const outputPath = '/Users/bill/workspace/proximyti-monday-integration/cleaned-vendors.csv';
  fs.writeFileSync(outputPath, csvLines.join('\n'));

  console.log(`\n✅ Cleaned CSV saved to: ${outputPath}`);
  console.log(`\n📋 Ready to import ${inServiceArea.length} vendors into Monday.com!`);
}

main();