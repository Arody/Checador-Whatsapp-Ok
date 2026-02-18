const XLSX = require('xlsx');
const fs = require('fs-extra');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

const EXCEL_FILE = 'nomina_total_kadmiel_fiscal_y_no_fiscal ACTUAL.xlsx';
const USERS_FILE = path.join(__dirname, '../data/users.json');

const LOCATION_MAP = {
  'TERAN': '184055f9-ad92-43b2-903c-f83a573b317e',
  'AERO': 'd9e3f6a2-0g5h-5b4d-9e3f-2c6g0h8i7j9k',
  'SAN CRISTOBAL': 'c8d2a5e1-9f4b-4a3c-8d2e-1b5f9a7c6d3e'
};

function normalizeName(name) {
  return name ? name.toString().trim().toUpperCase() : '';
}

function shouldExclude(name) {
  return false;
}

function generateCode(name) {
  // Simple code: first name + '123' or random
  const parts = name.split(' ');
  const first = parts[0].toLowerCase().replace(/[^a-z0-9]/g, '');
  return `${first}${Math.floor(1000 + Math.random() * 9000)}`;
}

async function main() {
  if (!fs.existsSync(EXCEL_FILE)) {
    console.error('Excel file not found');
    return;
  }

  const workbook = XLSX.readFile(EXCEL_FILE);
  let users = [];

  if (fs.existsSync(USERS_FILE)) {
    users = await fs.readJson(USERS_FILE);
  }

  let count = 0;

  for (const sheetName of Object.keys(LOCATION_MAP)) {
    if (!workbook.SheetNames.includes(sheetName)) {
      console.warn(`Sheet ${sheetName} not found in Excel`);
      continue;
    }

    const sheet = workbook.Sheets[sheetName];
    const data = XLSX.utils.sheet_to_json(sheet);
    const locationId = LOCATION_MAP[sheetName];

    console.log(`Processing ${sheetName}...`);

    for (const row of data) {
      const rawName = row['Empleado'];
      if (!rawName) continue;

      if (shouldExclude(rawName)) {
        console.log(`Skipping excluded: ${rawName}`);
        continue;
      }

      // Check for duplicate by name
      const existing = users.find(u => normalizeName(u.name) === normalizeName(rawName));
      if (existing) {
        console.log(`Skipping existing: ${rawName}`);
        continue;
      }

      const newUser = {
        id: uuidv4(),
        name: rawName,
        phone: `52100000${Date.now()}${count}`, // Unique placeholder phone
        role: 'employee',
        code: generateCode(rawName),
        active: true,
        locationId: locationId
      };
      
      users.push(newUser);
      console.log(`Added: ${newUser.name} to ${sheetName}`);
      count++;
    }
  }

  await fs.writeJson(USERS_FILE, users, { spaces: 2 });
  console.log(`\nImport completed. Added ${count} new users.`);
}

main().catch(console.error);
