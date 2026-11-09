// Verificação visual com Playwright: para cada slide, captura um quadro intermediário exato
// (timeline congelada) e o estado final, em 1920×1080 e 1280×720; reporta erros de console,
// sobreposições de layout e elementos fora da tela.
// Uso: node scripts/shoot.mjs [url] [--only=1,5,7] [--sizes=1920,1280]
import { chromium } from 'playwright';
import fs from 'node:fs';

const args = process.argv.slice(2);
const URL = args.find((a) => a.startsWith('http')) || 'http://localhost:5173';
const only = (args.find((a) => a.startsWith('--only=')) || '').slice(7).split(',').filter(Boolean).map(Number);
const sizes = ((args.find((a) => a.startsWith('--sizes=')) || '--sizes=1920,1280').slice(8)).split(',').map(Number);
const OUT = (args.find((a) => a.startsWith('--out=')) || '--out=shots').slice(6);
fs.mkdirSync(OUT, { recursive: true });

const SEL = [
  '.eyebrow', '.title', '.headline', '.lede', '.chip', '.hero-num', '.donut-wrap', '.legend', '.types', '.pillar', '.sub',
  '.units', '.ratio', '.evolve', '.ledger', '.cols', '.board', '.alert-num', '.alert-cap', '.eol', '.facts', '.source',
  '.prio', '.tri', '.signoff', '.cover-title', '.triad', '.cover-foot', '.chapter-title', '.chapter-sub',
].join(',');

const browser = await chromium.launch({ args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader', '--ignore-gpu-blocklist'] });
const report = { errors: [], overlaps: [], offscreen: [] };

for (const w of sizes) {
  const h = Math.round((w * 9) / 16);
  const page = await browser.newPage({ viewport: { width: w, height: h } });
  page.setDefaultTimeout(180000);
  page.on('console', (m) => m.type() === 'error' && report.errors.push(`${w}: ${m.text()}`));
  page.on('pageerror', (e) => report.errors.push(`${w}: ${e.message}`));
  await page.goto(URL + '/?capture#/0');
  await page.waitForFunction(() => window.deck?.isReady());
  await page.mouse.move(w / 2, h / 2);
  const total = await page.evaluate(() => window.deck.getTotalSlides());

  for (let i = 0; i < total; i++) {
    if (only.length && !only.includes(i + 1)) continue;
    await page.evaluate((i) => window.deck.slide(i), i);
    await page.waitForTimeout(2500);
    const id = await page.evaluate(() => window.deck.getCurrentSlide().dataset.id);
    const tag = `${String(i + 1).padStart(2, '0')}_${id}`;
    if (w === 1920) {
      await page.evaluate(() => window.__seek(1.1));
      await page.screenshot({ path: `${OUT}/${tag}_mid.png` });
    }
    await page.evaluate(() => window.__seek(99));
    await page.waitForTimeout(1200);
    await page.screenshot({ path: `${OUT}/${tag}_${w}.png` });

    const issues = await page.evaluate((SEL) => {
      const sec = document.querySelector('.reveal .slides > section.present');
      const els = [...sec.querySelectorAll(SEL)];
      const boxes = els.map((e) => ({ n: String(e.className.baseVal ?? e.className).split(' ')[0], t: e.textContent.trim().replace(/\s+/g, ' ').slice(0, 22), r: e.getBoundingClientRect(), e }));
      const overlaps = [], off = [];
      for (let a = 0; a < boxes.length; a++) {
        const A = boxes[a].r;
        if (A.width === 0) continue;
        if (A.right > innerWidth + 1 || A.bottom > innerHeight + 1 || A.left < -1 || A.top < -1) off.push(`${boxes[a].n}:${boxes[a].t}`);
        for (let b = a + 1; b < boxes.length; b++) {
          if (boxes[a].e.contains(boxes[b].e) || boxes[b].e.contains(boxes[a].e)) continue;
          const B = boxes[b].r;
          const ix = Math.min(A.right, B.right) - Math.max(A.left, B.left);
          const iy = Math.min(A.bottom, B.bottom) - Math.max(A.top, B.top);
          if (ix > 4 && iy > 4) overlaps.push(`${boxes[a].n}:${boxes[a].t} × ${boxes[b].n}:${boxes[b].t} (${Math.round(ix)}×${Math.round(iy)})`);
        }
      }
      return { overlaps, off };
    }, SEL);
    issues.overlaps.forEach((o) => report.overlaps.push(`${w} ${tag}: ${o}`));
    issues.off.forEach((o) => report.offscreen.push(`${w} ${tag}: ${o}`));
    console.error(`ok ${w} ${tag}`);
  }
  await page.close();
}
await browser.close();
fs.writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 2));
console.log(JSON.stringify(report, null, 2));
