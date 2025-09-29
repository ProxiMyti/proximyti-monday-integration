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

const columns = [
  {
    title: 'Vendor Code',
    type: 'text',
    description: 'Unique identifier for vendor (e.g., phoenix-books)'
  },
  {
    title: 'Shop Name',
    type: 'text',
    description: 'Full business name (e.g., Phoenix Books)'
  },
  {
    title: 'Address',
    type: 'text',
    description: 'Street address for pickup (e.g., 191 Bank Street)'
  },
  {
    title: 'City',
    type: 'dropdown',
    description: 'City for pickup location',
    labels: ['Burlington', 'South Burlington', 'Winooski', 'Essex Junction', 'Colchester', 'Williston', 'Shelburne', 'Essex']
  },
  {
    title: 'State',
    type: 'dropdown',
    description: 'State (Vermont only for MVP)',
    labels: ['VT']
  },
  {
    title: 'Zip Code',
    type: 'dropdown',
    description: 'Zip code for service area validation',
    labels: ['05401', '05402', '05403', '05404', '05405', '05408', '05446', '05451', '05452', '05482', '05495']
  },
  {
    title: 'What3Words',
    type: 'text',
    description: '3m x 3m location precision (e.g., panels.behalf.likes)'
  },
  {
    title: 'Pickup Door',
    type: 'long_text',
    description: 'Specific entrance instructions (e.g., "Front entrance on Bank Street")'
  },
  {
    title: 'Floor Level',
    type: 'dropdown',
    description: 'Floor level for pickup',
    labels: ['Ground', '2nd floor', '3rd floor', 'Basement', 'Mezzanine']
  },
  {
    title: 'Pickup Instructions',
    type: 'long_text',
    description: 'Detailed pickup instructions for drivers'
  },
  {
    title: 'Access Code',
    type: 'text',
    description: 'Door code or security information if needed'
  },
  {
    title: 'Business Hours',
    type: 'long_text',
    description: 'Operating hours for pickup availability'
  },
  {
    title: 'Primary Contact',
    type: 'text',
    description: 'Main contact person name'
  },
  {
    title: 'Primary Phone',
    type: 'phone',
    description: 'Main contact phone number'
  },
  {
    title: 'Active Status',
    type: 'checkbox',
    description: 'Is this vendor currently active?'
  }
];

async function addColumn(columnSpec, index) {
  console.log(`\n📝 Adding column ${index + 1}/15: ${columnSpec.title}...`);

  const query = `
    mutation ($boardId: ID!, $title: String!, $columnType: ColumnType!, $description: String) {
      create_column (
        board_id: $boardId,
        title: $title,
        column_type: $columnType,
        description: $description
      ) {
        id
        title
        type
      }
    }
  `;

  const variables = {
    boardId: BOARD_ID,
    title: columnSpec.title,
    columnType: columnSpec.type,
    description: columnSpec.description
  };

  let columnId;

  try {
    const result = await makeMondayRequest(query, variables);
    columnId = result.create_column.id;
    console.log(`✅ ${columnSpec.title} created (ID: ${columnId})`);

    if (columnSpec.type === 'dropdown' && columnSpec.labels) {
      console.log(`   Adding ${columnSpec.labels.length} dropdown options...`);

      for (const label of columnSpec.labels) {
        const settingsQuery = `
          mutation ($boardId: ID!, $columnId: String!, $label: String!) {
            create_column_value_dropdown_setting (
              board_id: $boardId,
              column_id: $columnId,
              label: $label
            ) {
              id
              name
            }
          }
        `;

        await makeMondayRequest(settingsQuery, {
          boardId: BOARD_ID,
          columnId: columnId,
          label: label
        });
      }

      console.log(`   ✅ All dropdown options added`);
    }

    return result.create_column;
  } catch (error) {
    console.error(`❌ Error adding ${columnSpec.title}:`, error.message);
    throw error;
  }
}

async function main() {
  if (!MONDAY_TOKEN) {
    console.error('❌ MONDAY_TOKEN environment variable not set');
    process.exit(1);
  }

  console.log('🚀 Adding columns to ProximyTi Vendors board');
  console.log(`📋 Board ID: ${BOARD_ID}\n`);

  for (let i = 0; i < columns.length; i++) {
    await addColumn(columns[i], i);
    await new Promise(resolve => setTimeout(resolve, 500));
  }

  console.log('\n🎉 All columns added successfully!');
  console.log('\n📊 Summary:');
  console.log(`   Board ID: ${BOARD_ID}`);
  console.log(`   Columns added: ${columns.length}`);
  console.log('\n👉 Next step: Add vendor data (Phoenix Books, VCET, City Market)');
}

main().catch(console.error);