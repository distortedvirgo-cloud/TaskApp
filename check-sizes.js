import fs from 'fs';
const stats192 = fs.statSync('public/icon-192.png');
const stats512 = fs.statSync('public/icon-512.png');
console.log('192 size:', stats192.size);
console.log('512 size:', stats512.size);
