#!/usr/bin/env node
// Put a QR code + link on the prompt page:  node qr.mjs <url>   (then node build.mjs)
import QRCode from 'qrcode';
import fs from 'node:fs';
const url = process.argv[2];
if (!/^https:\/\/[\w./~%-]+$/.test(url || '')) { console.error('usage: node qr.mjs https://...'); process.exit(1); }
const svg = (await QRCode.toString(url, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' })).replace(/<\?xml[^>]*\?>/, '').replace('<svg ', '<svg role="img" aria-label="QR code for the project link" ');
const block = `<!--QR--><aside class="qr">${svg.trim()}<a href="${url}">${url.replace('https://', '')}</a><small>Real app. Scan it, run it on your own site.</small></aside><!--/QR-->`;
const f = new URL('./index.html', import.meta.url);
const html = fs.readFileSync(f, 'utf8');
if (!/<!--QR-->[\s\S]*?<!--\/QR-->/.test(html)) throw new Error('QR marker not found in index.html');
fs.writeFileSync(f, html.replace(/<!--QR-->[\s\S]*?<!--\/QR-->/, () => block));
console.log('QR set to', url);
