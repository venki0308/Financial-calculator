// Convert PNG screenshots to WebP for size reduction.
// Run: node scripts/optimize-screenshots.mjs
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const dir = 'public/screenshots';
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.png'));

let totalBefore = 0;
let totalAfter = 0;

for (const f of files) {
    const input = path.join(dir, f);
    const output = path.join(dir, f.replace('.png', '.webp'));
    const before = fs.statSync(input).size;
    totalBefore += before;
    try {
        await sharp(input).webp({ quality: 82 }).toFile(output);
        const after = fs.statSync(output).size;
        totalAfter += after;
        console.log(`${f}: ${(before / 1024).toFixed(0)}KB → ${(after / 1024).toFixed(0)}KB (${Math.round((1 - after / before) * 100)}% smaller)`);
    } catch (err) {
        console.error(`Failed: ${f}`, err.message);
    }
}

console.log(`\nTotal: ${(totalBefore / 1024).toFixed(0)}KB → ${(totalAfter / 1024).toFixed(0)}KB`);
console.log('Note: PNGs kept for backward compatibility. WebP files are next to them.');
