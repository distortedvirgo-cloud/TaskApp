import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

let svgText = fs.readFileSync(path.resolve('public/pwa-icon.svg'), 'utf-8');

// Replace gradients with solid colors for sharp compatibility
svgText = svgText.replace('url(#bg)', '#0f172a');
svgText = svgText.replace('url(#sword)', '#fbbf24');

// Wrap in Buffer
const svgBuffer = Buffer.from(svgText);

async function generate() {
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.resolve('public/icon-192.png'));
  console.log('Created icon-192.png');

  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.resolve('public/icon-512.png'));
  console.log('Created icon-512.png');
}

generate().catch(console.error);
