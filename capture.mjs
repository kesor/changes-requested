#!/usr/bin/env node
// Capture any web page for the accessibility review: screenshot + axe-core findings with pixel positions.
// Usage: node capture.mjs <url> [more urls...]      (HEADLESS=1 to hide the browser window)
import puppeteer from 'puppeteer-core';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { execSync, spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const CAP = path.join(ROOT, 'captures');
const AXE = fs.readFileSync(path.join(ROOT, 'node_modules/axe-core/axe.min.js'), 'utf8');
const W = 1280, VH = 800, MAX_H = 14000;

function findBrowser() {
  if (process.env.BROWSER_BIN) return process.env.BROWSER_BIN;
  for (const b of ['brave', 'chromium', 'google-chrome-stable', 'google-chrome']) {
    try { return execSync(`command -v ${b}`, { encoding: 'utf8' }).trim(); } catch {}
  }
  throw new Error('No Chromium-family browser found. Set BROWSER_BIN.');
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

// One long-lived browser with its own profile: launched on first use, reused (and left open) afterwards.
const DEBUG_PORT = +process.env.DEBUG_PORT || 9333;
const PROFILE = path.join(ROOT, '.browser-profile');
async function getBrowser() {
  const connect = () => puppeteer.connect({ browserURL: `http://127.0.0.1:${DEBUG_PORT}`, defaultViewport: { width: W, height: VH, deviceScaleFactor: 1 } });
  try { return await connect(); } catch {}
  const args = [`--remote-debugging-port=${DEBUG_PORT}`, `--user-data-dir=${PROFILE}`, '--no-first-run', '--no-default-browser-check',
    `--window-size=${W},${VH + 90}`, '--disable-features=Translate', ...(process.env.HEADLESS ? ['--headless=new'] : []), 'about:blank'];
  spawn(findBrowser(), args, { detached: true, stdio: 'ignore' }).unref();
  for (let i = 0; i < 40; i++) { await sleep(300); try { return await connect(); } catch {} }
  throw new Error('Browser did not start');
}

export async function capture(url) {
  if (!/^https?:\/\//.test(url)) url = 'https://' + url;
  const slug = new URL(url).hostname.replace(/^www\./, '').replace(/[^a-z0-9.-]/gi, '_');
  const browser = await getBrowser();
  try {
    const page = await browser.newPage();
    await page.bringToFront();
    await page.setBypassCSP(true);
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await page.waitForNetworkIdle({ idleTime: 700, timeout: 8000 }).catch(() => {});
    // "click to continue" interstitials (not captchas): press the button and wait for the real page
    const gate = await page.evaluate(() => {
      const b = [...document.querySelectorAll('button, input[type=submit], a')].find(e => /^continue shopping$/i.test((e.innerText || e.value || '').trim()));
      if (b) b.click(); return !!b;
    }).catch(() => false);
    if (gate) { await page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {}); await page.waitForNetworkIdle({ idleTime: 700, timeout: 8000 }).catch(() => {}); }
    // scroll through the page so lazy content loads
    await page.evaluate(async (MAX_H) => {
      for (let y = 0; y < Math.min(document.documentElement.scrollHeight, MAX_H); y += 600) {
        scrollTo(0, y); await new Promise(r => setTimeout(r, 120));
      }
      scrollTo(0, 0);
    }, MAX_H);
    await sleep(1200);
    // Dismiss pop-ups, consent bars and big ads so the review shows the page itself (NO_TIDY=1 keeps them).
    const tidied = process.env.NO_TIDY ? null : await page.evaluate(async () => {
      const out = { clicked: [], hidden: 0 };
      const vw = innerWidth, vh = innerHeight;
      const inOverlay = el => { for (let e = el; e && e !== document.body; e = e.parentElement) { const p = getComputedStyle(e).position; if (p === 'fixed' || p === 'sticky' || e.getAttribute('role') === 'dialog' || e.getAttribute('aria-modal') === 'true') return true; } return false; };
      const words = /^(accept( all)?( cookies)?|agree|i agree|agree (and|&) (close|continue)|got it|ok(ay)?|allow all|dismiss|no,? thanks|not now|maybe later|close|×|✕|x|סגור|סגירה|אישור|מאשר|הבנתי|אני מסכים|同意する|閉じる)$/i;
      for (const el of document.querySelectorAll('button, [role=button], input[type=button], a:not([href]), a[href^="#"], a[href^="javascript"], [aria-label]')) {
        const t = (el.innerText || el.value || el.getAttribute('aria-label') || '').trim();
        const r = el.getBoundingClientRect();
        if (t && t.length < 25 && words.test(t) && r.width > 0 && r.height > 0 && inOverlay(el)) { try { el.click(); out.clicked.push(t); } catch {} if (out.clicked.length >= 6) break; }
      }
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', keyCode: 27, bubbles: true }));
      await new Promise(r => setTimeout(r, 700));
      const hide = el => { el.style.setProperty('display', 'none', 'important'); out.hidden++; };
      // whatever still floats over the page: modals, sticky ad bars, chat bubbles (a slim top navigation bar is kept)
      for (const el of document.querySelectorAll('body *')) {
        const cs = getComputedStyle(el); if (cs.position !== 'fixed' || cs.display === 'none') continue;
        const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) continue;
        const isTopBar = r.top <= 2 && r.height <= 160 && r.width >= vw * .8 && el.querySelector('a, nav, input');
        if (!isTopBar) hide(el);
      }
      // advertising slots near the top
      const adName = /(^|[\s_-])(ad|ads|advert|advertisement|adunit|adslot|banner|dfp|gpt|sponsor|promo|taboola|outbrain)([\s_-]|\d|$)/i;
      for (const el of document.querySelectorAll('body div, body section, body aside, body ins, body iframe')) {
        if (el.style.display === 'none') continue;
        const r = el.getBoundingClientRect(); if (r.top + scrollY > 900 || r.height < 90 || r.width < 300 || r.height > 700) continue;
        const named = adName.test(el.id + ' ' + (typeof el.className === 'string' ? el.className : '')) || el.matches('ins.adsbygoogle, [id^="google_ads"], [id^="div-gpt-ad"], [aria-label="Advertisement"], [data-ad], [data-google-query-id]');
        const adFrame = el.tagName === 'IFRAME' && /ads|doubleclick|googlesyndication|adservice/i.test(el.src + el.id + el.name);
        if ((named || adFrame) && (el.innerText || '').trim().length < 200) hide(el);
      }
      for (const el of [document.documentElement, document.body]) if (getComputedStyle(el).overflowY === 'hidden') el.style.setProperty('overflow', 'auto', 'important');   // undo scroll lock
      scrollTo(0, 0);
      return out;
    }).catch(() => null);
    if (tidied) await sleep(600);
    await page.evaluate(AXE);
    const data = await page.evaluate(async (MAX_H) => {
      const res = await axe.run(document, {
        resultTypes: ['violations'], iframes: false,
        runOnly: { type: 'tag', values: ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa', 'best-practice'] },
      });
      scrollTo(-99999, 0); const ox = -scrollX;   // right-to-left pages can extend left of x=0; screenshots are measured from that far edge
      scrollTo(0, 0);
      const H = Math.min(Math.max(document.documentElement.scrollHeight, document.body ? document.body.scrollHeight : 0), MAX_H);
      const rectOf = el => {
        const r = el.getBoundingClientRect();
        const cs = getComputedStyle(el);
        if (r.width < 2 || r.height < 2 || cs.visibility === 'hidden' || +cs.opacity === 0) return null;
        const x = r.left + scrollX, y = r.top + scrollY;
        if (x + r.width < 0 || x > innerWidth || y < 0 || y + r.height > H) return null;
        return { x: Math.round(Math.max(0, x)), y: Math.round(y), w: Math.round(Math.min(r.width, innerWidth - Math.max(0, x))), h: Math.round(r.height) };
      };
      const findings = [];
      for (const v of res.violations) {
        let kept = 0;
        const pageLevel = /^(html-|document-title|landmark-one-main|page-has-heading-one|meta-viewport|bypass|region)/.test(v.id);
        for (const n of v.nodes) {
          if (kept >= (pageLevel ? 1 : 8)) break;
          const sel = n.target[n.target.length - 1];
          let el = null;
          try { if (typeof sel === 'string' && n.target.length === 1) el = document.querySelector(sel); } catch {}
          let rect = el ? rectOf(el) : null;
          if (!rect && !pageLevel) continue;
          if (pageLevel) rect = { x: 0, y: 0, w: innerWidth, h: Math.min(innerHeight, 500), page: true };
          const check = [...n.any, ...n.all, ...n.none].find(c => c.data && c.data.contrastRatio);
          const f = {
            rule: v.id, impact: n.impact || v.impact, help: v.help, description: v.description, helpUrl: v.helpUrl,
            wcag: v.tags.filter(t => /^wcag\d{3,}$/.test(t)).map(t => t.slice(4).split('').join('.')),
            html: n.html.slice(0, 600), why: (n.failureSummary || '').replace(/^Fix (any|all) of the following:\s*/, '').split('\n')[0].trim(),
            rect, tag: el ? el.tagName.toLowerCase() : 'html',
            text: el ? (el.innerText || '').trim().replace(/\s+/g, ' ').slice(0, 90) : '',
          };
          if (el) {
            const src = el.currentSrc || el.src || '';
            if (el.tagName === 'IMG' && src) f.file = src.startsWith('data:') ? 'inline image data' : src.split('?')[0].split('/').pop().slice(0, 60);
            if (el.tagName === 'A') f.href = (el.getAttribute('href') || '').slice(0, 80);
            if (/^(INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) f.inputType = el.type || el.tagName.toLowerCase();
            f.placeholder = el.getAttribute('placeholder') || undefined;
          }
          if (check) { const d = check.data; f.contrast = { fg: d.fgColor, bg: d.bgColor, ratio: d.contrastRatio, need: parseFloat(d.expectedContrastRatio), size: d.fontSize }; }
          findings.push(f); kept++;
        }
        if (kept) findings.push({ ruleTotal: v.id, total: v.nodes.length });
      }
      // keyboard tab order
      const foc = [...document.querySelectorAll('a[href],button,input,select,textarea,[tabindex]')]
        .filter(e => !e.disabled && e.tabIndex >= 0 && e.type !== 'hidden');
      const pos = foc.filter(e => e.tabIndex > 0).sort((a, b) => a.tabIndex - b.tabIndex);
      const tab = [...pos, ...foc.filter(e => e.tabIndex === 0)].map(e => ({ r: rectOf(e), e })).filter(o => o.r).slice(0, 40)
        .map(o => ({ x: o.r.x + o.r.w / 2 | 0, y: o.r.y + o.r.h / 2 | 0, label: (o.e.innerText || o.e.getAttribute('aria-label') || o.e.name || o.e.tagName).trim().slice(0, 30) }));
      const totals = {};
      const list = findings.filter(f => { if (f.ruleTotal) { totals[f.ruleTotal] = f.total; return false; } return true; });
      return { dbg: { passes: res.passes.length, incomplete: res.incomplete.length, violations: res.violations.map(v => v.id + '×' + v.nodes.length).join(' '), url: location.href }, title: document.title, lang: document.documentElement.lang || '', height: H, findings: list, totals, tab, focusable: foc.length, ox };
    }, MAX_H);

    fs.mkdirSync(path.join(CAP, slug), { recursive: true });
    await page.screenshot({
      path: path.join(CAP, slug, 'shot.jpg'), type: 'jpeg', quality: 72,
      clip: { x: data.ox || 0, y: 0, width: W, height: data.height }, captureBeyondViewport: true,
    });
    const out = { slug, url, width: W, capturedAt: new Date().toISOString(), shot: `captures/${slug}/shot.jpg?t=${Date.now()}`, tidied, ...data };
    fs.writeFileSync(path.join(CAP, slug, 'data.json'), JSON.stringify(out));
    rebuildIndex();
    return out;
  } finally {
    await browser.disconnect().catch(() => {}); // the browser and the tab stay open
  }
}

export function rebuildIndex() {
  const all = fs.readdirSync(CAP, { withFileTypes: true }).filter(d => d.isDirectory())
    .map(d => path.join(CAP, d.name, 'data.json')).filter(f => fs.existsSync(f)).map(f => JSON.parse(fs.readFileSync(f, 'utf8')));
  all.sort((a, b) => a.capturedAt.localeCompare(b.capturedAt));
  fs.writeFileSync(path.join(CAP, 'all.js'), 'window.CAPTURES = ' + JSON.stringify(all) + ';\n');
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const urls = process.argv.slice(2);
  if (!urls.length) { console.error('usage: node capture.mjs <url> [url...]'); process.exit(1); }
  for (const u of urls) {
    try {
      const d = await capture(u);
      console.log(`${d.slug}: "${d.title.slice(0, 50)}" ${d.width}x${d.height}, ${d.findings.length} located findings, tidied: ${d.tidied ? d.tidied.clicked.length + ' clicked, ' + d.tidied.hidden + ' hidden' : 'off'}, ox ${d.ox}, rules: ${Object.entries(d.totals).map(([k, v]) => k + '×' + v).join(' ')}`);
    } catch (e) { console.error(`${u}: FAILED ${e.message}`); }
  }
}
