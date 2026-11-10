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
const GROUPS = ['Gestão', 'Arquitetura', 'Requisitos', 'Desenvolvimento', 'Dados', 'Banco de Dados', 'Estágio'];

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

(async () => {
  fs.mkdirSync(OUT, { recursive: true });
  const team = [];
  for (const file of fs.readdirSync(SRC).filter((f) => /\.(png|jpe?g)$/i.test(f))) {
    const key = file.split(' - ')[0].trim();
    const p = PEOPLE[key];
    if (!p) throw new Error('Sem cadastro: ' + file);
    const [name, role, group] = p;
    const src = path.join(SRC, file);
    const { data, info } = await sharp(src).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const { top, hw, cx } = headBox(data, info.width, info.height);

    // enquadramento único: cabeça ocupa ~44% da largura, topo do cabelo a 12% do quadro
    // se a foto original for pequena demais, aproxima um pouco em vez de inventar bordas
    let side = Math.round(hw / 0.44);
    side = Math.min(side, info.width, Math.round((info.height - top) / 0.88));
    const left = Math.round(Math.min(Math.max(cx - side / 2, 0), info.width - side));
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
})();
