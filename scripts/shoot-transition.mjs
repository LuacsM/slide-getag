// Captura quadros de uma transição entre slides com relógio controlado (determinístico).
// Uso: node scripts/shoot-transition.mjs <url> <deIndice> <paraIndice> [--out=dir]
import { chromium } from 'playwright';
import fs from 'node:fs';

const args = process.argv.slice(2);
const URL = args.find((a) => a.startsWith('http')) || 'http://localhost:5173/clara';
const [from, to] = args.filter((a) => /^\d+$/.test(a)).map(Number);
const OUT = (args.find((a) => a.startsWith('--out=')) || '--out=shots-transition').slice(6);
fs.mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
page.setDefaultTimeout(180000);
await page.clock.install();
await page.goto(`${URL}/?capture#/${from}`);
await page.clock.runFor(1000);
await page.waitForFunction(() => window.deck?.isReady());
await page.clock.runFor(8000); // entrada completa do slide de origem
await page.evaluate((i) => window.deck.slide(i), to);
for (const ms of [0, 300, 600, 900, 1200, 1600, 2200]) {
  if (ms) await page.clock.runFor(ms - (ms > 300 ? [0, 300, 600, 900, 1200, 1600, 2200][[0, 300, 600, 900, 1200, 1600, 2200].indexOf(ms) - 1] : 0));
  await page.screenshot({ path: `${OUT}/t${String(ms).padStart(4, '0')}.png`, scale: 'css' });
  console.error('ok', ms);
}
await browser.close();
