import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SRC_DIR = path.resolve(__dirname, '../src');

// Map of hardcoded tailwind classes to their new CSS variable dynamic classes
// E.g., bg-gray-900 -> bg-[var(--bg-primary)]
const replacementsList = [
    // Backgrounds
    { rx: /\bbg-gray-900\b/g, to: 'bg-[var(--bg-primary)]' },
    { rx: /\bbg-gray-800\b/g, to: 'bg-[var(--bg-secondary)]' },
    { rx: /\bbg-gray-700\b/g, to: 'bg-[var(--bg-card)]' },
    { rx: /\bbg-gray-600\b/g, to: 'bg-[var(--bg-muted)]' },
    { rx: /\bbg-white\b/g, to: 'bg-[var(--bg-primary)]' },
    
    // Text
    { rx: /\btext-gray-100\b/g, to: 'text-[var(--text-primary)]' },
    { rx: /\btext-gray-200\b/g, to: 'text-[var(--text-primary)]' },
    { rx: /\btext-gray-300\b/g, to: 'text-[var(--text-secondary)]' },
    { rx: /\btext-gray-400\b/g, to: 'text-[var(--text-muted)]' },
    { rx: /\btext-gray-500\b/g, to: 'text-[var(--text-muted)]' },
    { rx: /\btext-gray-600\b/g, to: 'text-[var(--text-muted)]' },
    
    // Borders
    { rx: /\bborder-gray-800\b/g, to: 'border-[var(--border-color)]' },
    { rx: /\bborder-gray-700\b/g, to: 'border-[var(--border-color)]' },
    { rx: /\bborder-gray-600\b/g, to: 'border-[var(--border-color)]' },
];

// Replaces text-white intelligently inside className strings
function replaceTextWhite(str) {
    // Only target text-white within class strings or standard react strings
    // But be careful not to replace it if bg-blue, bg-brand, bg-green, bg-red, etc., are in the same block
    return str.replace(/className=["']([^"']*)["']/g, (match, classes) => {
        if (!classes.includes('text-white')) return match;
        
        // Check if there are colored backgrounds that justify keeping text-white
        const hasColoredBg = /\bbg-(blue|brand|red|green|orange|pink|purple|emerald|indigo)-[456]00\b/.test(classes) ||
                             /\bbg-gradient-to\b/.test(classes) ||
                             /\bbg-brand-/.test(classes) ||
                             classes.includes('bg-primary') ||
                             classes.includes('bg-[#EF4444]') || 
                             classes.includes('button');
                             
        if (hasColoredBg) return match; // Keep text-white
        
        const newClasses = classes.replace(/\btext-white\b/g, 'text-[var(--text-primary)]');
        return match.replace(classes, newClasses);
    });
}

// Replaces insight boxes (bg-amber-50 rounded-xl p-4...)
function replaceInsightBoxes(str) {
    let result = str;
    
    // Warning boxes
    result = result.replace(/className=["']([^"']*\b(bg-amber-50|bg-yellow-50|bg-orange-50).*?)["']/g, (match, css) => {
        let n = css.replace(/\bbg-(amber|yellow|orange)-[0-9]{2,3}(\/[0-9]+)?\b/g, 'bg-[var(--warning-bg)]');
        n = n.replace(/\btext-(amber|yellow|orange)-[0-9]{3}\b/g, 'text-[var(--warning-text)]');
        n = n.replace(/\bborder-(amber|yellow|orange)-[0-9]{3}\b/g, 'border-[var(--warning-border)]');
        n = n.replace(/\bdark:bg-\S+\b/g, ''); // strip dark mode specific overrides for background since variables handle it
        n = n.replace(/\bdark:text-\S+\b/g, ''); 
        n = n.replace(/\bdark:border-\S+\b/g, '');
        return match.replace(css, n);
    });

    // Info boxes
    result = result.replace(/className=["']([^"']*\bbg-blue-50.*?)["']/g, (match, css) => {
        let n = css.replace(/\bbg-blue-[0-9]{2,3}(\/[0-9]+)?\b/g, 'bg-[var(--info-bg)]');
        n = n.replace(/\btext-blue-[0-9]{3}\b/g, 'text-[var(--info-text)]');
        n = n.replace(/\bborder-blue-[0-9]{3}\b/g, 'border-[var(--info-border)]');
        n = n.replace(/\bdark:bg-\S+\b/g, '');
        n = n.replace(/\bdark:text-\S+\b/g, '');
        n = n.replace(/\bdark:border-\S+\b/g, '');
        return match.replace(css, n);
    });

    // Success boxes 
    result = result.replace(/className=["']([^"']*\bbg-green-50.*?)["']/g, (match, css) => {
        let n = css.replace(/\bbg-green-[0-9]{2,3}(\/[0-9]+)?\b/g, 'bg-[var(--success-bg)]');
        n = n.replace(/\btext-green-[0-9]{3}\b/g, 'text-[var(--success-text)]');
        n = n.replace(/\bborder-green-[0-9]{3}\b/g, 'border-[var(--success-border)]');
        n = n.replace(/\bdark:bg-\S+\b/g, '');
        n = n.replace(/\bdark:text-\S+\b/g, '');
        n = n.replace(/\bdark:border-\S+\b/g, '');
        return match.replace(css, n);
    });

    // Error boxes
    result = result.replace(/className=["']([^"']*\bbg-red-50.*?)["']/g, (match, css) => {
        let n = css.replace(/\bbg-red-[0-9]{2,3}(\/[0-9]+)?\b/g, 'bg-[var(--error-bg)]');
        n = n.replace(/\btext-red-[0-9]{3}\b/g, 'text-[var(--error-text)]');
        n = n.replace(/\bborder-red-[0-9]{3}\b/g, 'border-[var(--error-border)]');
        n = n.replace(/\bdark:bg-\S+\b/g, '');
        n = n.replace(/\bdark:text-\S+\b/g, '');
        n = n.replace(/\bdark:border-\S+\b/g, '');
        return match.replace(css, n);
    });

    return result;
}

function walkDir(dir, callback) {
    fs.readdirSync(dir).forEach(f => {
        const dirPath = path.join(dir, f);
        const isDirectory = fs.statSync(dirPath).isDirectory();
        if (isDirectory) {
            walkDir(dirPath, callback);
        } else if (f.endsWith('.tsx') || f.endsWith('.ts')) {
            callback(dirPath);
        }
    });
}

console.log('Starting mass replacement...');
let updatedCount = 0;

walkDir(SRC_DIR, (filePath) => {
    let content = fs.readFileSync(filePath, 'utf8');
    let originalStr = content;

    // Remove dark mode overrides that conflict with variables
    // E.g., dark:bg-slate-800, dark:bg-[#0F172A], dark:text-white
    content = content.replace(/\bdark:bg-[a-z0-9-/[\]#]+\b/g, '');
    content = content.replace(/\bdark:text-[a-z0-9-/[\]#]+\b/g, '');
    content = content.replace(/\bdark:border-[a-z0-9-/[\]#]+\b/g, '');
    
    // Apply exact replacements
    replacementsList.forEach(rep => {
        content = content.replace(rep.rx, rep.to);
    });

    content = replaceTextWhite(content);
    content = replaceInsightBoxes(content);
    
    // Clean up multiple spaces that might have been left behind by empty replacements
    content = content.replace(/className=["']\s+/g, 'className="');
    // REMOVED dangerous regex: content = content.replace(/\s+["']/g, '"');
    content = content.replace(/className=" /g, 'className="');
    content = content.replace(/ \s+/g, ' ');

    if (content !== originalStr) {
        fs.writeFileSync(filePath, content);
        updatedCount++;
    }
});

console.log(`Finished mass replacement. Updated ${updatedCount} files.`);
