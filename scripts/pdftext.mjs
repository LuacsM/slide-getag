import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';
import fs from 'node:fs';
const doc = await getDocument({ data: new Uint8Array(fs.readFileSync(process.argv[2])) }).promise;
let out = '';
for (let p = 1; p <= doc.numPages; p++) {
  const c = await (await doc.getPage(p)).getTextContent();
  let line = '', lastY = null;
  out += `\n===== PÁGINA ${p} =====\n`;
  for (const it of c.items) {
    const y = Math.round(it.transform[5]);
    if (lastY !== null && Math.abs(y - lastY) > 3) { out += line.trim() + '\n'; line = ''; }
    line += it.str + (it.hasEOL ? ' ' : ''); lastY = y;
  }
  out += line.trim() + '\n';
}
fs.writeFileSync(process.argv[3], out);
console.log('pages', doc.numPages, 'chars', out.length);
