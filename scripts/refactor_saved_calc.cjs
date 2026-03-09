const fs = require('fs');
const path = require('path');

const SRC_DIR = path.join(__dirname, '../src');

function getAllFiles(dir, fileList = []) {
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const filePath = path.join(dir, file);
        if (fs.statSync(filePath).isDirectory()) {
            getAllFiles(filePath, fileList);
        } else if (filePath.endsWith('.tsx') || filePath.endsWith('.ts')) {
            fileList.push(filePath);
        }
    }
    return fileList;
}

const files = getAllFiles(SRC_DIR);

let modifiedCount = 0;

files.forEach(file => {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // 1. In useCalculatorStore.ts
    if (file.endsWith('useCalculatorStore.ts')) {
        content = content.replace(/type: string;/g, 'calculatorType: string;');
        content = content.replace(/inputs: Record<string, any>;/g, 'inputValues: Record<string, any>;');
        content = content.replace(/result: any;/g, 'resultValues: any;');
    }
    
    // 2. In SavedCalculations.tsx & CalculationHistory.tsx & Home.tsx (reading the object)
    if (file.endsWith('SavedCalculations.tsx') || file.endsWith('CalculationHistory.tsx') || file.endsWith('Home.tsx') || file.endsWith('Calculators.tsx')) {
        content = content.replace(/calc\.type/g, 'calc.calculatorType');
        content = content.replace(/calc\.inputs/g, 'calc.inputValues');
        content = content.replace(/calc\.result/g, 'calc.resultValues');
        content = content.replace(/c\.type/g, 'c.calculatorType');
    }

    // 3. Usage of addSaved / addHistory
    // Example: addSaved({ id: '...', type: '...', inputs: {...}, result: {...}, timestamp: ... })
    // We regex match the specific keys when they are part of addSaved or addHistory objects.
    
    // Using simple regex replacements for known patterns inside those files
    if (content.includes('addSaved({') || content.includes('addHistory({')) {
        content = content.replace(/type: /g, 'calculatorType: ');
        content = content.replace(/inputs:/g, 'inputValues:');
        content = content.replace(/inputs,/g, 'inputValues: inputs,'); // where inputs was shorthand
        content = content.replace(/result:/g, 'resultValues:');
        content = content.replace(/result,/g, 'resultValues: result,'); // where result was shorthand
    }

    if (content !== original) {
        fs.writeFileSync(file, content);
        modifiedCount++;
        console.log(`Updated: ${path.basename(file)}`);
    }
});

console.log(`Refactored ${modifiedCount} files.`);
