#!/usr/bin/env node
// Bundle the viewer + every capture (screenshots inlined) into ONE html file: node build.mjs [slug...]
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const ROOT = path.dirname(fileURLToPath(import.meta.url));
const want = process.argv.slice(2);
const caps = fs.readdirSync(path.join(ROOT, 'captures'), { withFileTypes: true }).filter(d => d.isDirectory())
  .map(d => path.join(ROOT, 'captures', d.name)).filter(d => fs.existsSync(path.join(d, 'data.json')))
  .map(d => { const c = JSON.parse(fs.readFileSync(path.join(d, 'data.json'), 'utf8')); delete c.dbg;
    c.shot = 'data:image/jpeg;base64,' + fs.readFileSync(path.join(d, 'shot.jpg')).toString('base64'); return c; })
  .filter(c => !want.length || want.includes(c.slug))
  .sort((a, b) => want.length ? want.indexOf(a.slug) - want.indexOf(b.slug) : a.capturedAt.localeCompare(b.capturedAt));
const tag = '<script src="captures/all.js"></script>';
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');
if (!html.includes(tag)) throw new Error('data script tag not found in index.html');
const data = JSON.stringify(caps).replace(/</g, '\\u003c');
const out = html.replace(tag, () => `<script>window.STANDALONE = true; window.CAPTURES = ${data};</script>`);
fs.mkdirSync(path.join(ROOT, 'dist'), { recursive: true });
const file = path.join(ROOT, 'dist', 'changes-requested.html');
fs.writeFileSync(file, out);
console.log(`${file}: ${(out.length / 1e6).toFixed(1)} MB, ${caps.map(c => c.slug).join(', ')}`);
