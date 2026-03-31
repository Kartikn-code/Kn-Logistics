const XLSX = require('xlsx');

// Create a mock workbook with a date inside
const wb = XLSX.utils.book_new();
const ws = XLSX.utils.aoa_to_sheet([
    ['PAYMENT RECEIVED DATE', 'AMOUNT'],
    [45706, 12345], // 18-Feb-2025
    [new Date(2025, 1, 18), 54321]
]);
XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
const buffer = XLSX.write(wb, { type: 'buffer' });

const workbook = XLSX.read(buffer, { type: 'buffer', cellDates: true });
const sheet = workbook.Sheets[workbook.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(sheet, { raw: false });
console.log("Without raw:true:", rows);

const rowsRaw = XLSX.utils.sheet_to_json(sheet, { raw: true });
console.log("With raw:true:", rowsRaw);

