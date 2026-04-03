const fs = require('fs');
const files = fs.readdirSync('src/locales').filter(f => f.endsWith('.json'));

let updated = 0;
for (const file of files) {
  const path = 'src/locales/' + file;
  let text = fs.readFileSync(path, 'utf8');
  
  if (!text.includes('"advancedMortgage":')) {
    const replacement = '        "advancedMortgage": {\n            "name": "Adv. Mortgage Calculator",\n            "desc": "Calculate home loan with prepayments, extra EMI and 80C/24 tax benefits"\n        },\n        "personalLoan": {';
    text = text.replace('        "personalLoan": {', replacement);
    fs.writeFileSync(path, text, 'utf8');
    updated++;
  }
}
console.log(`Updated ${updated} files`);
