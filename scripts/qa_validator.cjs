const fs = require('fs');
const path = require('path');

const PAGES_DIR = path.join(__dirname, '../src/pages');

// Core QA logic lists
const issues = [];
const passed = [];

function scanDirectory(dir) {
    let files = [];
    const items = fs.readdirSync(dir);
    for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = fs.statSync(fullPath);
        if (stat.isDirectory()) {
            files = files.concat(scanDirectory(fullPath));
        } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
            files.push(fullPath);
        }
    }
    return files;
}

function analyzeFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath);
    let hasIssues = false;

    // 1. Check Excel Export for Numeric Values
    // Bad Pattern: Passing string-formatted currency to Excel arrays
    // Usually: `fmt(` or `₹` or `.toLocaleString` inside the array passed to exportToExcel
    if (content.includes('exportToExcel(')) {
        // Regex to find arrays containing formatted strings, e.g., ['Name', fmt(val)] passed to exportToExcel
        const badExcelRegex = /exportToExcel\([^;]+fmt\(/g;
        if (badExcelRegex.test(content) || (content.includes('exportToExcel') && !content.includes('Number(') && content.includes('toLocaleString'))) {
            issues.push(`[EXCEL FORMAT] ${fileName}: Excel export contains formatted currency strings instead of raw numeric values.`);
            hasIssues = true;
        }
    }

    // 2. Check GST Invoice object structure
    if (fileName === 'GSTCalculator.tsx' || fileName.includes('Invoice')) {
        if (content.match(/\[object Object\]/i) || !content.includes('item.name') || content.includes('\$\{item\}')) {
            issues.push(`[GST UI] ${fileName}: Potential object rendering error or missing properties mapped to UI/Export string.`);
            hasIssues = true;
        }
    }

    // 3. Saved Calculations Validation
    // Check if useCalculatorStore / addSaved is used, it should pass calculatorType, inputValues, resultValues
    if (content.includes('addSaved(')) {
        if (!content.includes('calculatorType:') || !content.includes('inputValues:') || !content.includes('resultValues:')) {
            issues.push(`[SAVED STATE] ${fileName}: addSaved payload is missing exact keys (calculatorType, inputValues, resultValues).`);
            hasIssues = true;
        }
    }

    if (!hasIssues) {
        passed.push(fileName);
    }
}

console.log("Starting QA Validation Scan...");
const allFiles = scanDirectory(PAGES_DIR);
allFiles.forEach(analyzeFile);

console.log("\n==== QA REPORT ====");
console.log(`\nPASSED MODULES (${passed.length}):\n` + passed.join(', '));
console.log(`\nFAILED MODULES (${issues.length}):`);
issues.forEach(i => console.log("- " + i));

fs.writeFileSync(path.join(__dirname, 'qa_report.txt'), issues.join('\n'));
