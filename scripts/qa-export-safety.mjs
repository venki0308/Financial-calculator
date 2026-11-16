// QA audit: spreadsheet formula-injection guard for CSV and Excel exports.
// Runs the REAL helper (src/utils/csvSafe.ts, loaded through Node's built-in
// TypeScript type stripping — Node 22.18+/24) and SheetJS.
//   node scripts/qa-export-safety.mjs
import { createRequire } from 'node:module';
import { guardText, csvCell, csvRow, guardAoa } from '../src/utils/csvSafe.ts';

const require = createRequire(import.meta.url);
const XLSX = require('xlsx');

let passed = 0;
let failed = 0;
const check = (label, actual, expected) => {
    const ok = Object.is(actual, expected);
    if (ok) passed++; else failed++;
    console.log(`  ${ok ? '✓' : '✗'} ${label}: ${JSON.stringify(actual)}${ok ? '' : `  (expected ${JSON.stringify(expected)})`}`);
};

const ATTACK = '=HYPERLINK("http://evil.example","Click")';

console.log('\n1. Text cells that look like formulas are neutralised');
check('= prefix', guardText(ATTACK), `'${ATTACK}`);
check('+ prefix', guardText('+SUM(A1:A9)'), "'+SUM(A1:A9)");
check('- prefix', guardText('-1+cmd|x!A0'), "'-1+cmd|x!A0");
check('@ prefix', guardText('@SUM(A1)'), "'@SUM(A1)");
check('tab prefix', guardText('\t=1+1'), "'\t=1+1");
check('carriage-return prefix', guardText('\r=1+1'), "'\r=1+1");
check('phone number with +', guardText('+91 98765 43210'), "'+91 98765 43210");

console.log('\n2. Ordinary text and app-built signed figures are untouched');
check('plain text', guardText('Groceries'), 'Groceries');
check('hyphen inside text', guardText('A-1 Sweets'), 'A-1 Sweets');
check('signed percent', guardText('-3.2%'), '-3.2%');
check('signed rupee amount', guardText('+₹1,200'), '+₹1,200');
check('negative decimal string', guardText('-500.00'), '-500.00');
check('date', guardText('2026-11-16'), '2026-11-16');

console.log('\n3. Numbers stay numeric in CSV');
check('negative number', csvCell(-1250.5), '-1250.5');
check('zero', csvCell(0), '0');
check('empty for null', csvCell(null), '');

console.log('\n4. CSV record: attack text neutralised and quoted, amount numeric');
const record = csvRow(['2026-11-16', 'expense', 'Food', ATTACK, -1250.5, 'upi']);
check(
    'record',
    record,
    `2026-11-16,expense,Food,"'=HYPERLINK(""http://evil.example"",""Click"")",-1250.5,upi`
);
// Parse the record back the way a spreadsheet would (RFC 4180).
const fields = [];
record.replace(/("([^"]|"")*"|[^,]*)(,|$)/g, (_, f) => { fields.push(f.startsWith('"') ? f.slice(1, -1).replace(/""/g, '"') : f); return ''; });
check('parsed description starts with apostrophe', fields[3].startsWith("'="), true);
check('parsed amount is a number', Number(fields[4]), -1250.5);

console.log('\n5. Excel (SheetJS): text cell stays text, negative amount stays a number');
const sheet = XLSX.utils.aoa_to_sheet(guardAoa([['Name', 'Amount'], [ATTACK, -1250.5]]));
const book = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(book, sheet, 'Test');
const reread = XLSX.read(XLSX.write(book, { type: 'buffer', bookType: 'xlsx' }), { type: 'buffer' }).Sheets.Test;
check('A2 cell type is string', reread.A2.t, 's');
check('A2 has no formula', reread.A2.f, undefined);
check('A2 value is neutralised', reread.A2.v, `'${ATTACK}`);
check('B2 cell type is number', reread.B2.t, 'n');
check('B2 value', reread.B2.v, -1250.5);

console.log('\n═══════════════════════════════════════════════════════════════');
console.log(`  RESULTS: ${passed} passed, ${failed} failed`);
console.log('═══════════════════════════════════════════════════════════════');
process.exit(failed ? 1 : 0);
