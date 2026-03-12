import fs from 'fs';
import path from 'path';

const SRC_DIR = './src';

const regexReplacements = [
  // Text Colors
  { regex: /text-slate-900 dark:text-white/g, replacement: 'text-foreground' },
  { regex: /text-white dark:text-slate-900/g, replacement: 'text-background' },
  { regex: /text-slate-800 dark:text-slate-100/g, replacement: 'text-foreground' },
  { regex: /text-slate-800 dark:text-slate-200/g, replacement: 'text-foreground' },
  { regex: /text-slate-700 dark:text-slate-300/g, replacement: 'text-muted-foreground' },
  { regex: /text-slate-600 dark:text-slate-400/g, replacement: 'text-muted-foreground' },
  { regex: /text-slate-500 dark:text-slate-400/g, replacement: 'text-muted-foreground' },
  { regex: /text-slate-500 md:dark:text-slate-400/g, replacement: 'text-muted-foreground' },
  
  // Background Colors
  { regex: /bg-white dark:bg-slate-900\/50/g, replacement: 'bg-card' },
  { regex: /bg-white dark:bg-slate-900/g, replacement: 'bg-card' },
  { regex: /bg-slate-50 dark:bg-slate-800\/50/g, replacement: 'bg-muted' },
  { regex: /bg-slate-50 dark:bg-slate-800/g, replacement: 'bg-muted' },
  { regex: /bg-slate-100 dark:bg-slate-800/g, replacement: 'bg-muted' },
  { regex: /bg-slate-100 dark:bg-slate-800\/50/g, replacement: 'bg-muted' },
  { regex: /bg-slate-200 dark:bg-slate-700/g, replacement: 'bg-muted' },
  { regex: /bg-slate-900 dark:bg-slate-800/g, replacement: 'bg-foreground dark:bg-muted' },
  { regex: /bg-slate-900 dark:bg-white/g, replacement: 'bg-foreground' },

  // Borders
  { regex: /border-slate-200 dark:border-slate-800/g, replacement: 'border-border' },
  { regex: /border-slate-200 dark:border-slate-700/g, replacement: 'border-border' },
  { regex: /border-slate-300 dark:border-slate-700/g, replacement: 'border-border' },
  { regex: /border-slate-100 dark:border-slate-800/g, replacement: 'border-border' },

  // Fills/Strokes/Shadows if any common ones exist
  { regex: /ring-slate-200 dark:ring-slate-800/g, replacement: 'ring-border' }
];

function processDirectory(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      processDirectory(fullPath);
    } else if (fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let modified = false;

      for (const { regex, replacement } of regexReplacements) {
        if (regex.test(content)) {
          content = content.replace(regex, replacement);
          modified = true;
        }
      }

      if (modified) {
        fs.writeFileSync(fullPath, content, 'utf8');
        console.log(`Updated: ${fullPath}`);
      }
    }
  }
}

processDirectory(SRC_DIR);
console.log('Theme replacement complete.');
