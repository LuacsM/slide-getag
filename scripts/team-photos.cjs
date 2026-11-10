/**
 * Padroniza as fotos da equipe: mesmo enquadramento de rosto, fundo branco uniforme,
 * nitidez e tons equalizados. Lê "IMG DA EQUIPE/" e grava assets/equipe/*.jpg + src/equipe.json.
 *   npm run equipe
 */
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SRC = path.join(__dirname, '..', 'IMG DA EQUIPE');
const OUT = path.join(__dirname, '..', 'assets', 'equipe');
const SIZE = 360;

// ordem dos grupos no slide
const GROUPS = ['Gestão', 'Arquitetura', 'Requisitos', 'Desenvolvimento', 'Qualidade', 'Dados', 'Banco de Dados', 'Estágio'];

// nome do arquivo (antes do " - ") → nome exibido, função, grupo e ajustes de recorte opcionais
const PEOPLE = {
  'Daniel Marques': ['Daniel Marques', 'Gerente', 'Gestão'],
  'ANDRE ELIEL': ['André Eliel', 'Arquiteto de Software', 'Arquitetura'],
  'Lucas Maia': ['Lucas Maia', 'Analista de Requisitos', 'Requisitos'],
  'rejane amorim': ['Rejane Amorim', 'Analista de Requisitos Sênior', 'Requisitos'],
  'nadiele praia': ['Nadiele Praia', 'Analista de Requisitos', 'Requisitos'],
  'TAYNARA SILVADA': ['Taynara Silvada', 'Analista de Requisitos', 'Requisitos'],
  'ANDREMAR NEVES': ['Andremar Neves', 'Desenvolvedor', 'Desenvolvimento'],
  'GABRIEL GAMA': ['Gabriel Gama', 'Desenvolvedor', 'Desenvolvimento'],
  'luan Oliveira': ['Luan Oliveira', 'Desenvolvedor', 'Desenvolvimento'],
  'LUCAS VASCONCELOS': ['Lucas Vasconcelos', 'Desenvolvedor', 'Desenvolvimento'],
  'marcia carina': ['Márcia Carina', 'Desenvolvedora', 'Desenvolvimento'],
  'marcos ramos': ['Marcos Ramos', 'Desenvolvedor', 'Desenvolvimento'],
  'MAX CARDOSO': ['Max Cardoso', 'Desenvolvedor', 'Desenvolvimento'],
  'PEDRO HENRIQUE': ['Pedro Henrique', 'Desenvolvedor', 'Desenvolvimento'],
  'RHANIEL MIRANDA': ['Rhaniel Miranda', 'Desenvolvedor', 'Desenvolvimento'],
  'DIEGO SOUSA': ['Diego Sousa', 'Cientista de Dados', 'Dados'],
  'marcio lobato': ['Márcio Lobato', 'Cientista de Dados', 'Dados'],
  'mirian lima': ['Mirian Lima', 'Cientista de Dados', 'Dados'],
  'rafael jesus': ['Rafael Jesus', 'Cientista de Dados', 'Dados'],
  'THUAN MATHEUS': ['Thuan Matheus', 'Cientista de Dados', 'Dados'],
  'Natália Araújo': ['Natália Araújo', 'Analista de Testes', 'Qualidade'],
  'RAFAEL PIRES': ['Rafael Pires', 'Administrador de Banco de Dados', 'Banco de Dados'],
  'Eduardo Barbosa': ['Eduardo Barbosa', 'Administrador de Banco de Dados', 'Banco de Dados'],
  'Giovane Carvalho': ['Giovane Carvalho', 'Estagiário', 'Estágio'],
  'Samarlon de Souza': ['Samarlon de Souza', 'Estagiário', 'Estágio'],
};

const slug = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');

// localiza a cabeça: topo do cabelo + largura/centro da silhueta logo abaixo
function headBox(data, w, h) {
  const isFg = (i) => {
    const r = data[i], g = data[i + 1], b = data[i + 2];
    const mx = Math.max(r, g, b), mn = Math.min(r, g, b);
    return mn < 215 || mx - mn > 28;
  };
  const spans = [];
  for (let y = 0; y < h; y++) {
    let l = -1, r = -1, n = 0;
    for (let x = 0; x < w; x++) if (isFg((y * w + x) * 3)) { n++; if (l < 0) l = x; r = x; }
    spans.push({ l, r, n });
  }
  const top = spans.findIndex((s) => s.n > w * 0.06);
  const band = spans.slice(top, top + Math.round((h - top) * 0.3)).filter((s) => s.n > 0);
  const widths = band.map((s) => s.r - s.l).sort((a, b) => a - b);
  const hw = widths[Math.floor(widths.length * 0.85)];
  const cx = band.reduce((a, s) => a + (s.l + s.r) / 2, 0) / band.length;
  return { top, hw, cx };
}

// fundo de parede (cinza/colorido): preenche a partir das bordas superior e laterais e troca por branco,
// com borda suavizada; fotos que já têm fundo branco passam intactas
function whitenBackground(data, w, h) {
  const px = (x, y) => (y * w + x) * 3;
  const border = [];
  for (let x = 0; x < w; x += 4) border.push(px(x, 0));
  for (let y = 0; y < h * 0.5; y += 4) border.push(px(0, y), px(w - 1, y));
  const lum = (i) => (data[i] + data[i + 1] + data[i + 2]) / 3;
  const sat = (i) => Math.max(data[i], data[i + 1], data[i + 2]) - Math.min(data[i], data[i + 1], data[i + 2]);
  const meanBorder = border.reduce((a, i) => a + lum(i), 0) / border.length;
  if (meanBorder > 220) return data; // só paredes claramente cinzas (fotos novas ~211–216; a mais escura das antigas ~226)
  const mask = new Float32Array(w * h);
  const stack = [];
  const seed = (x, y) => { const k = y * w + x; if (!mask[k]) { mask[k] = 1; stack.push(k); } };
  for (let x = 0; x < w; x++) seed(x, 0);
  for (let y = 0; y < h; y++) { seed(0, y); seed(w - 1, y); }
  while (stack.length) {
    const k = stack.pop(), x = k % w, y = (k / w) | 0, i = k * 3;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const nk = ny * w + nx;
      if (mask[nk]) continue;
      const j = nk * 3;
      if (Math.abs(lum(j) - lum(i)) < 7 && sat(j) < 22 && Math.abs(lum(j) - meanBorder) < 40) { mask[nk] = 1; stack.push(nk); }
    }
  }
  // suaviza a máscara (dois passes de caixa) para não serrilhar cabelo e ombros
  const r = Math.max(1, Math.round(w / 300));
  const blur = (src) => {
    const t = new Float32Array(w * h), o = new Float32Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let acc = 0, n = 0;
      for (let d = -r; d <= r; d++) { const xx = x + d; if (xx >= 0 && xx < w) { acc += src[y * w + xx]; n++; } }
      t[y * w + x] = acc / n;
    }
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      let acc = 0, n = 0;
      for (let d = -r; d <= r; d++) { const yy = y + d; if (yy >= 0 && yy < h) { acc += t[yy * w + x]; n++; } }
      o[y * w + x] = acc / n;
    }
    return o;
  };
  const m = blur(blur(mask));
  const out = Buffer.from(data);
  for (let k = 0; k < w * h; k++) {
    const a = Math.min(1, m[k] * 1.15);
    if (a <= 0) continue;
    for (let c = 0; c < 3; c++) out[k * 3 + c] = Math.round(out[k * 3 + c] + (255 - out[k * 3 + c]) * a);
  }
  return out;
}

const norm = (s) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
const KEYS = Object.keys(PEOPLE).sort((a, b) => b.length - a.length);

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  // cada pessoa usa a foto mais recente da pasta (ex.: "max cardoso atualizado.png" substitui a antiga)
  const latest = new Map();
  for (const file of fs.readdirSync(SRC).filter((f) => /\.(png|jpe?g)$/i.test(f))) {
    const key = KEYS.find((k) => norm(file).startsWith(norm(k)));
    if (!key) throw new Error('Sem cadastro: ' + file);
    const t = fs.statSync(path.join(SRC, file)).mtimeMs;
    if (!latest.has(key) || latest.get(key).t < t) latest.set(key, { file, t });
  }
  const team = [];
  for (const [key, { file }] of latest) {
    const [name, role, group] = PEOPLE[key];
    // descarta ~0,6% de cada borda: algumas fotos vêm com moldura fina cinza
    const meta = await sharp(path.join(SRC, file)).metadata();
    const cut = Math.max(1, Math.round(Math.min(meta.width, meta.height) * 0.006));
    const decoded = await sharp(path.join(SRC, file)).removeAlpha()
      .extract({ left: cut, top: cut, width: meta.width - 2 * cut, height: meta.height - 2 * cut }).raw().toBuffer({ resolveWithObject: true });
    const info = decoded.info;
    const data = whitenBackground(decoded.data, info.width, info.height);
    const src = await sharp(data, { raw: info }).png().toBuffer();
    const { top, hw, cx } = headBox(data, info.width, info.height);

    // enquadramento único: cabeça ocupa ~44% da largura, topo do cabelo a 12% do quadro
    // se a foto original for pequena demais, aproxima um pouco em vez de inventar bordas
    let side = Math.round(hw / 0.44);
    side = Math.min(side, Math.round(info.width * (info.width > 400 ? 1.15 : 1)), Math.round((info.height - top) / 0.88));
    const left = side > info.width ? Math.round((info.width - side) / 2)
      : Math.round(Math.min(Math.max(cx - side / 2, 0), info.width - side));
    const tp = Math.round(top - side * 0.12);
    const pad = { top: Math.max(0, -tp), left: Math.max(0, -left),
      right: Math.max(0, left + side - info.width), bottom: Math.max(0, tp + side - info.height) };
    const white = { r: 255, g: 255, b: 255 };
    const padded = await sharp(src).removeAlpha().extend({ ...pad, background: white }).toBuffer();
    let img = sharp(padded)
      .extract({ left: left + pad.left, top: tp + pad.top, width: side, height: side })
      .resize(SIZE, SIZE, { kernel: 'lanczos3' })
      .normalise({ lower: 0.5, upper: 99.5 })
      .modulate({ saturation: 1.06 })
      .sharpen({ sigma: 0.9, m1: 0.6, m2: 1.4 });

    // fundo: tudo que já é quase branco vira branco puro (transição suave)
    const raw = await img.raw().toBuffer({ resolveWithObject: true });
    const d = raw.data;
    for (let i = 0; i < d.length; i += 3) {
      const mn = Math.min(d[i], d[i + 1], d[i + 2]), mx = Math.max(d[i], d[i + 1], d[i + 2]);
      if (mx - mn > 30) continue;
      const t = Math.min(1, Math.max(0, (mn - 218) / 22));
      for (let k = 0; k < 3; k++) d[i + k] = Math.round(d[i + k] + (255 - d[i + k]) * t);
    }
    const out = slug(name) + '.jpg';
    await sharp(d, { raw: raw.info }).jpeg({ quality: 88, mozjpeg: true }).toFile(path.join(OUT, out));
    team.push({ name, role, group, img: './assets/equipe/' + out });
  }
  team.sort((a, b) => GROUPS.indexOf(a.group) - GROUPS.indexOf(b.group) || a.name.localeCompare(b.name, 'pt'));
  fs.writeFileSync(path.join(__dirname, '..', 'src', 'equipe.json'), JSON.stringify({ groups: GROUPS, team }, null, 2));
  console.log(team.length + ' fotos padronizadas em assets/equipe');
  for (const [k, v] of latest) if (/atuali/i.test(v.file)) console.log('  ' + k + ' ← ' + v.file);
})();
