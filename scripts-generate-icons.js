import sharp from 'sharp';
import fs from 'fs';
import path from 'path';

const svgBuffer = fs.readFileSync(path.resolve('public/pwa-icon.svg'));

sharp(svgBuffer)
  .resize(192, 192)
  .png()
  .toFile(path.resolve('public/icon-192.png'))
  .then(() => console.log('Created icon-192.png'));

sharp(svgBuffer)
  .resize(512, 512)
  .png()
  .toFile(path.resolve('public/icon-512.png'))
  .then(() => console.log('Created icon-512.png'));
