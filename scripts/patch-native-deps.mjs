// Run by `npm install` / `npm ci` (package.json "postinstall"). Keeps the Android build working
// after a clean install: some Capacitor plugins (@capacitor-community/date-picker 7.1.0,
// @capacitor-community/file-opener 8.0.0) still name getDefaultProguardFile('proguard-android.txt'),
// which the current Android Gradle plugin rejects. Their release builds have minifyEnabled false,
// so the file name has no effect on the APK; switching to 'proguard-android-optimize.txt' only
// satisfies the check. A plugin that minifies is left alone (and will fail loudly instead).
// Safe to run repeatedly; does nothing when node_modules has no Capacitor plugins (e.g. on Vercel).
import fs from 'node:fs';
import path from 'node:path';

const OLD = "getDefaultProguardFile('proguard-android.txt')";
const NEW = "getDefaultProguardFile('proguard-android-optimize.txt')";
for (const scope of ['@capacitor', '@capacitor-community', '@capacitor-firebase']) {
    const dir = path.join('node_modules', scope);
    if (!fs.existsSync(dir)) continue;
    for (const pkg of fs.readdirSync(dir)) {
        const file = path.join(dir, pkg, 'android', 'build.gradle');
        if (!fs.existsSync(file)) continue;
        const src = fs.readFileSync(file, 'utf8');
        if (!src.includes(OLD) || /minifyEnabled\s+true/.test(src)) continue;
        fs.writeFileSync(file, src.split(OLD).join(NEW));
        console.log(`patch-native-deps: ${scope}/${pkg} proguard file updated`);
    }
}
