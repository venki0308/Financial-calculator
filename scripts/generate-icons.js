const sharp = require('sharp');
const path = require('path');

async function generateIcons() {

  // 1. Main icon
  const logoBuffer = await sharp('ic_launcher_512.png')
    .resize(820, 820, { fit: 'contain', 
      background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: { width: 1024, height: 1024, channels: 3,
      background: { r: 10, g: 28, b: 64 } }
  })
  .composite([{ input: logoBuffer, gravity: 'centre' }])
  .png({ quality: 100, compressionLevel: 0 })
  .toFile('resources/icon.png');
  console.log('✓ resources/icon.png');

  // 2. Foreground (transparent, extra safe padding)
  const fgBuffer = await sharp('ic_launcher_foreground_432.png')
    .resize(614, 614, { fit: 'contain',
      background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .toBuffer();

  await sharp({
    create: { width: 1024, height: 1024, channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 } }
  })
  .composite([{ input: fgBuffer, gravity: 'centre' }])
  .png()
  .toFile('resources/icon-foreground.png');
  console.log('✓ resources/icon-foreground.png');

  // 3. Background (solid navy)
  await sharp({
    create: { width: 1024, height: 1024, channels: 3,
      background: { r: 10, g: 28, b: 64 } }
  })
  .png()
  .toFile('resources/icon-background.png');
  console.log('✓ resources/icon-background.png');

  console.log('All icons generated!');
}

generateIcons().catch(console.error);
