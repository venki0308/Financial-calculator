import fs from 'fs';
import path from 'path';

const gradleFile = path.resolve('node_modules/@capacitor-community/file-opener/android/build.gradle');

if (fs.existsSync(gradleFile)) {
    let content = fs.readFileSync(gradleFile, 'utf8');
    if (content.includes("proguard-android.txt")) {
        console.log('Patching @capacitor-community/file-opener/android/build.gradle...');
        content = content.replace(
            "proguardFiles getDefaultProguardFile('proguard-android.txt'), 'proguard-rules.pro'",
            "proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'"
        );
        fs.writeFileSync(gradleFile, content);
        console.log('Successfully patched!');
    } else {
        console.log('Gradle file already patched or correct.');
    }
} else {
    console.warn('Could not find @capacitor-community/file-opener build.gradle. Skipping patch.');
}
