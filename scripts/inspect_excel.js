const XLSX = require('xlsx');
const fs = require('fs');

const file = 'nomina_total_kadmiel_fiscal_y_no_fiscal ACTUAL.xlsx';

if (!fs.existsSync(file)) {
  console.error('File not found:', file);
  process.exit(1);
}

const workbook = XLSX.readFile(file);
console.log('Sheet Names:', workbook.SheetNames);

workbook.SheetNames.forEach(sheetName => {
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });
  console.log(`\n--- Sheet: ${sheetName} ---`);
  if (data.length > 0) {
    console.log('Header Row:', data[0]);
    console.log('First 3 rows:', data.slice(1, 4));
  } else {
    console.log('Empty Sheet');
  }
});
