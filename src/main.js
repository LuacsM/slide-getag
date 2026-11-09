import Reveal from 'reveal.js';
import Notes from 'reveal.js/plugin/notes';
import gsap from 'gsap';
import { createScene } from './scene.js';
import data from './data.json';

/* ------------------------------------------------------------------ */
/* dados do portfólio                                                  */
/* ------------------------------------------------------------------ */
const S = { paralisado: 0, sem_status: 0, ...data.porStatus };
const P = data.producaoPorTipo;
const pct = (a, b) => Math.round((a / b) * 100);
const VALUES = {
  total: data.total,
  producao: S.producao,
  andamento: S.andamento,
  futuro: S.futuro,
  descontinuado: S.descontinuado,
  paralisado: S.paralisado,
  atencao: S.paralisado + S.sem_status,
  pipeline: S.futuro + S.andamento,
  prodPct: pct(S.producao, data.total),
  prod2026: data.producao2026,
  prod2026Pct: pct(data.producao2026, S.producao),
  descPainel: data.descontinuadosPainel,
  semSuporte: data.tecnologia.semSuporte,
  comVersao: data.tecnologia.comVersao,
  laravelLegado: data.tecnologia.laravelLegado,
  nodeLegado: data.tecnologia.nodeLegado,
  semStatus: data.qualidade.semStatus,
  semAno: data.qualidade.semAno,
  linhasRef: data.qualidade.linhasRef,
};

const STATUS_SEGMENTS = [
  { label: 'Em produção', v: S.producao, color: '#224c9c' },
  { label: 'Em desenvolvimento ou homologação', v: S.andamento, color: '#0093d3' },
  { label: 'Entrega futura', v: S.futuro, color: '#22a33c' },
  { label: 'Descontinuadas', v: S.descontinuado, color: '#b6bdd0' },
  { label: 'Paralisadas ou sem status', v: S.paralisado + S.sem_status, color: '#e39aa7' },
].filter((s) => s.v > 0);
const TYPES = [
  { label: 'Aplicações web', v: P.web || 0 },
  { label: 'Painéis analíticos', v: P.analytics || 0 },
  { label: 'Geoprocessamento', v: P.geo || 0 },
  { label: 'Aplicativo móvel', v: P.app || 0 },
].filter((t) => t.v > 0);

const $ = (sel, root = document) => [...root.querySelectorAll(sel)];
const NS = 'http://www.w3.org/2000/svg';

/* ------------------------------------------------------------------ */
/* construção de elementos gerados                                     */
/* ------------------------------------------------------------------ */
// donut (portfólio por status)
const R = 170, C = 2 * Math.PI * R, GAP = 6;
const donut = document.getElementById('donut');
donut.innerHTML = `<circle class="track" cx="200" cy="200" r="${R}"/>`;
const segG = document.createElementNS(NS, 'g');
segG.setAttribute('transform', 'rotate(-90 200 200)');
donut.appendChild(segG);
let acc = 0;
const segs = STATUS_SEGMENTS.map((s) => {
  const len = (s.v / data.total) * C;
  const c = document.createElementNS(NS, 'circle');
  Object.entries({ cx: 200, cy: 200, r: R, stroke: s.color }).forEach(([k, v]) => c.setAttribute(k, v));
  c.style.strokeDasharray = `0 ${C}`;
  c.style.strokeDashoffset = -acc;
  c.dataset.len = Math.max(len - GAP, 2);
  if (s.color === '#224c9c') c.style.filter = 'drop-shadow(0 8px 14px rgba(34,76,156,.28))';
  segG.appendChild(c);
  acc += len;
  return c;
});
document.getElementById('legend').innerHTML = STATUS_SEGMENTS.map(
  (s) => `<li><i style="background:${s.color}"></i><span><b>${s.v}</b>${s.label}</span></li>`
).join('');
document.getElementById('types').style.gridTemplateColumns = `repeat(${TYPES.length}, 1fr)`;
document.getElementById('types').innerHTML = TYPES.map(
  (t) => `<div class="type"><div class="t-row"><span class="t-name">${t.label}</span>
    <span class="t-val" data-v="${t.v}">0</span></div>
    <div class="bar"><i style="--w:${(t.v / TYPES[0].v) * 100}%"></i></div></div>`
).join('');

// unidades (1 ponto = 1 iniciativa)
const UNIT_GROUPS = {
  passado: Array(S.descontinuado).fill('descontinuado'),
  presente: [
    ...Array(S.producao).fill('producao'), ...Array(S.andamento).fill('andamento'),
    ...Array(S.paralisado).fill('paralisado'), ...Array(S.sem_status).fill('sem_status'),
  ],
  futuro: Array(S.futuro).fill('futuro'),
};
$('.ugroup').forEach((g) => {
  g.querySelector('.ugrid').innerHTML = UNIT_GROUPS[g.dataset.group].map((k) => `<i class="u ${k}"></i>`).join('');
});

// texto dividido em caracteres
$('.split').forEach((el) => {
  el.innerHTML = [...el.textContent].map((c) => (c === ' ' ? ' ' : `<span class="ch">${c}</span>`)).join('');
});
// traço do ledger e varredura das colunas
$('.ledger .lrow:not(.head)').forEach((r) => r.insertAdjacentHTML('beforeend', '<i class="strike"></i>'));
$('.col').forEach((c) => c.insertAdjacentHTML('afterbegin', '<i class="sweep"></i>'));
$('.p-n').forEach((el) => (el.dataset.v = el.textContent));
$('.risks li').forEach((li) => li.insertAdjacentHTML('afterbegin', '<i class="dot"></i>'));

// linha do tempo de fim de suporte
const T0 = new Date('2025-01-01'), T1 = new Date('2027-06-01'), TODAY = new Date('2026-11-01');
const tpos = (d) => ((new Date(d) - T0) / (T1 - T0)) * 100;
$('.eol [data-date]').forEach((el) => (el.style.left = `${tpos(el.dataset.date + '-01')}%`));
const TODAY_PCT = tpos(TODAY);

// ondas da marca: linhas finas que se cruzam (azul e verdes), como na papelaria SEDUC/GOVAM
const WAVE_COLORS = ['#224c9c', '#0a7434', '#22a33c', '#5bb463'];
$('svg.waves').forEach((svg, si) => {
  const [, , W, H] = svg.getAttribute('viewBox').split(' ').map(Number);
  const mid = H * 0.55;
  svg.innerHTML = WAVE_COLORS.map((col, j) => {
    const A = H * (0.16 + j * 0.06), f = (Math.PI * 2 * (1.1 + j * 0.18)) / W, ph = j * 1.7 + si * 0.9;
    const tilt = (j % 2 ? -1 : 1) * H * 0.12;
    let d = '';
    for (let x = -60; x <= W + 60; x += 20) {
      const y = mid + A * Math.sin(x * f + ph) + tilt * (x / W - 0.5) + H * 0.06 * Math.sin(x * f * 2.3 + ph * 2);
      d += (d ? ' L ' : 'M ') + x.toFixed(0) + ' ' + y.toFixed(1);
    }
    return `<path d="${d}" stroke="${col}" opacity="${0.55 + j * 0.1}"/>`;
  }).join('');
});

/* ------------------------------------------------------------------ */
/* utilidades de animação                                              */
/* ------------------------------------------------------------------ */
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

function countUp(el, to, duration = 1.8, ease = 'power3.out') {
  const o = { v: 0 };
  el.textContent = '0';
  return gsap.to(o, { v: to, duration, ease, onUpdate: () => (el.textContent = Math.round(o.v)) });
}
function counters(root, tl, at, dur = 2) {
  $('.counter', root).forEach((el) => tl.add(countUp(el, VALUES[el.dataset.to], dur), at));
}
function eyebrowIn(root, tl, at = 0) {
  const eb = root.querySelector('.eyebrow');
  if (!eb) return;
  tl.fromTo(eb.querySelector('.line'), { scaleX: 0 }, { scaleX: 1, duration: 0.9, ease: 'expo.inOut' }, at)
    .fromTo(eb, { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.9, ease: 'power3.out' }, at + 0.1);
}
function wordsIn(root, tl, at) {
  tl.fromTo($('.mask .w', root), { yPercent: 115, rotate: 5 },
    { yPercent: 0, rotate: 0, duration: 1.25, ease: 'expo.out', stagger: 0.09 }, at);
}
function wordsOut(root, tl, at = 0) {
  tl.to($('.mask .w', root), { yPercent: -115, duration: 0.6, ease: 'power3.in', stagger: 0.04 }, at);
}
function fadeUp(tl, targets, at, opts = {}) {
  tl.fromTo(targets, { opacity: 0, y: 26, filter: 'blur(8px)' },
    { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1, ease: 'power3.out', ...opts }, at);
}
// "decodifica" o texto: caracteres aleatórios que se resolvem da esquerda para a direita
const GLYPHS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789#/·';
function scramble(el, duration = 0.9) {
  const final = el.dataset.text || (el.dataset.text = el.textContent);
  const o = { p: 0 };
  return gsap.to(o, {
    p: 1, duration, ease: 'none',
    onUpdate: () => {
      const n = Math.floor(o.p * final.length);
      let out = final.slice(0, n);
      for (let i = n; i < final.length; i++) out += final[i] === ' ' ? ' ' : GLYPHS[(Math.random() * GLYPHS.length) | 0];
      el.textContent = out;
    },
    onComplete: () => (el.textContent = final),
  });
}
// saída padrão: título sobe pela máscara, demais elementos se dissolvem para cima
function genericExit(root) {
  const tl = gsap.timeline();
  wordsOut(root, tl, 0);
  const rest = [...root.children].filter((c) => !c.matches('aside, h1, h2'));
  tl.to(rest, { opacity: 0, y: -30, filter: 'blur(10px)', duration: 0.6, ease: 'power2.in', stagger: 0.03 }, 0);
  return tl;
}

// ondas: desenho em traço e depois uma ondulação lenta contínua
function wavesIn(root, tl, at = 0) {
  const paths = $('.waves path', root);
  if (!paths.length) return;
  paths.forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.dataset.l = L; });
  tl.fromTo(paths, { strokeDashoffset: (i, p) => +p.dataset.l }, { strokeDashoffset: 0, duration: 2.6, ease: 'power2.inOut', stagger: 0.18 }, at);
  tl.add(() => {
    const a = paths.map((p, i) => gsap.to(p, { x: (i % 2 ? -1 : 1) * 50, y: i % 2 ? 8 : -8, duration: 5 + i, ease: 'sine.inOut', yoyo: true, repeat: -1 }));
    idle.set(root, [...(idle.get(root) || []), ...a]);
  });
}

/* trilho do futuro: Catmull-Rom passando pelos marcadores de cada pilar */
function buildRail(root) {
  const pts = $('.pillar', root).map((p) => [p.offsetLeft + 37, p.offsetTop + p.offsetHeight + 19]);
  const first = pts[0], last = pts[pts.length - 1];
  const dx = (last[0] - first[0]) / (pts.length - 1), dy = (last[1] - first[1]) / (pts.length - 1);
  const all = [[first[0] - dx * 0.9, first[1] - dy * 0.6 + 30], ...pts, [last[0] + dx * 1.05, last[1] + dy * 1.4 - 40]];
  let d = `M ${all[0][0]} ${all[0][1]}`;
  for (let i = 0; i < all.length - 1; i++) {
    const p0 = all[i - 1] || all[i], p1 = all[i], p2 = all[i + 1], p3 = all[i + 2] || p2;
    const c1 = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2 = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1} ${c2} ${p2}`;
  }
  root.querySelector('#railPath').setAttribute('d', d);
}

/* ------------------------------------------------------------------ */
/* coreografia de cada slide                                           */
/* ------------------------------------------------------------------ */
const idle = new Map();

// capítulos compartilham a mesma assinatura: número desenhado em traço + voo de câmera
const chapter = {
  enter(root) {
    const tl = gsap.timeline();
    const num = root.querySelector('.bignum text');
    tl.fromTo(num, { strokeDashoffset: 2600, fillOpacity: 0 }, { strokeDashoffset: 0, duration: 2.4, ease: 'power2.inOut' }, 0)
      .to(num, { fillOpacity: 0.07, duration: 1.2, ease: 'power2.out' }, 1.9)
      .fromTo(root.querySelector('.bignum'), { scale: 1.12, x: 60, transformOrigin: '100% 50%' }, { scale: 1, x: 0, duration: 3.2, ease: 'expo.out' }, 0);
    eyebrowIn(root, tl, 0.3);
    wordsIn(root, tl, 0.45);
    fadeUp(tl, root.querySelector('.chapter-sub'), 1.1);
    wavesIn(root, tl, 0.4);
    return tl;
  },
  exit(root) {
    const tl = gsap.timeline();
    tl.to(root.querySelector('.bignum'), { scale: 1.5, opacity: 0, filter: 'blur(16px)', duration: 0.9, ease: 'power3.in' }, 0);
    wordsOut(root, tl, 0);
    tl.to([root.querySelector('.eyebrow'), root.querySelector('.chapter-sub')], { opacity: 0, y: -20, duration: 0.5, ease: 'power2.in' }, 0);
    tl.to(root.querySelector('.waves'), { opacity: 0, y: 40, duration: 0.7, ease: 'power2.in' }, 0);
    return tl;
  },
};

const choreo = {
  capa: {
    enter(root) {
      const tl = gsap.timeline();
      eyebrowIn(root, tl, 0.2);
      tl.fromTo($('.cover-title .ch', root),
        { opacity: 0, yPercent: 60, rotateX: -80, filter: 'blur(12px)', transformPerspective: 600 },
        { opacity: 1, yPercent: 0, rotateX: 0, filter: 'blur(0px)', duration: 1.4, ease: 'expo.out', stagger: 0.035 }, 0.35);
      // tríade acende em sequência, com um ponto de luz que percorre as setas
      const [t1, t2, t3] = $('.triad .t', root);
      const dots = $('.triad .arrow b', root);
      tl.fromTo(root.querySelector('.triad'), { opacity: 0 }, { opacity: 1, duration: 0.6 }, 1.3)
        .fromTo(t1, { color: '#9aa2b9' }, { color: '#c9374f', duration: 0.5 }, 1.5)
        .fromTo(dots[0], { left: 0, opacity: 1 }, { left: 133, duration: 0.7, ease: 'power2.inOut' }, 1.8)
        .to(dots[0], { opacity: 0, duration: 0.2 }, 2.4)
        .fromTo(t2, { color: '#9aa2b9' }, { color: '#224c9c', duration: 0.5 }, 2.4)
        .fromTo(dots[1], { left: 0, opacity: 1 }, { left: 133, duration: 0.7, ease: 'power2.inOut' }, 2.7)
        .to(dots[1], { opacity: 0, duration: 0.2 }, 3.3)
        .fromTo(t3, { color: '#9aa2b9' }, { color: '#0a7434', duration: 0.5 }, 3.3);
      fadeUp(tl, root.querySelector('.cover-foot'), 2.2);
      wavesIn(root, tl, 0.6);
      tl.fromTo($('.cover-logos > *', root), { opacity: 0, y: 24, filter: 'blur(8px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.1, ease: 'power3.out', stagger: 0.15 }, 0.2);
      return tl;
    },
    exit(root) {
      const tl = gsap.timeline();
      tl.to($('.cover-title .ch', root), { opacity: 0, yPercent: -60, filter: 'blur(10px)', duration: 0.6, ease: 'power3.in', stagger: 0.012 }, 0);
      tl.to([root.querySelector('.triad'), root.querySelector('.cover-foot'), root.querySelector('.cover-logos'), root.querySelector('.waves')], { opacity: 0, y: -20, duration: 0.5 }, 0);
      return tl;
    },
  },

  tempos: {
    enter(root) {
      const tl = gsap.timeline();
      eyebrowIn(root, tl);
      wordsIn(root, tl, 0.15);
      // cada ponto parte de um lugar aleatório da tela e "encaixa" no seu grupo: do caos à ordem
      tl.fromTo($('.u', root),
        { x: () => gsap.utils.random(-900, 900), y: () => gsap.utils.random(-500, 300), scale: 0, opacity: 0 },
        { x: 0, y: 0, scale: 1, opacity: 1, duration: 1.6, ease: 'expo.out', stagger: { each: 0.012, from: 'random' } }, 0.4);
      fadeUp(tl, $('.ulabel', root), 1.5, { stagger: 0.15 });
      counters(root, tl, 0.2);
      return tl;
    },
    exit(root) {
      const tl = genericExit(root);
      tl.to($('.u', root), { scale: 0, opacity: 0, duration: 0.5, ease: 'power2.in', stagger: { each: 0.004, from: 'center' } }, 0);
      return tl;
    },
  },

  cap1: chapter, cap2: chapter, capRisco: chapter, cap3: chapter,

  areas: {
    enter(root) {
      const tl = gsap.timeline();
      eyebrowIn(root, tl);
      wordsIn(root, tl, 0.15);
      gsap.set($('.ill [data-anim], [data-anim="steam"] path, [data-anim="grow"] rect, [data-anim="blink"] > *', root), { clearProps: 'all' });
      fadeUp(tl, root.querySelector('.areas-note'), 0.7);
      const tot = root.querySelector('.areas-total');
      tl.add(countUp(tot, $('.a-n', root).reduce((s, el) => s + +el.dataset.v, 0), 2.2), 0.7);
      // cartões "saltam" na tela como figurinhas coladas num álbum
      const cards = $('.area', root);
      tl.fromTo(cards, { opacity: 0, scale: 0.6, y: 60, rotation: () => gsap.utils.random(-7, 7) },
        { opacity: 1, scale: 1, y: 0, rotation: 0, duration: 1.1, ease: 'back.out(1.8)', stagger: { each: 0.11, grid: [3, 3], from: 'start' } }, 0.5);
      cards.forEach((card, i) => {
        const at = 0.75 + i * 0.11;
        tl.fromTo(card.querySelector('.bg'), { scale: 0, transformOrigin: '50% 50%' }, { scale: 1, duration: 1, ease: 'elastic.out(1, 0.5)' }, at);
        tl.fromTo($('.p', card), { scale: 0, opacity: 0, transformOrigin: '50% 50%' },
          { scale: 1, opacity: 1, duration: 0.7, ease: 'back.out(2.6)', stagger: 0.09 }, at + 0.2);
        const n = card.querySelector('.a-n');
        tl.add(countUp(n, +n.dataset.v, 1.1), at + 0.3);
      });
      // depois, cada ilustração ganha vida com um movimento próprio
      tl.add(() => {
        const a = [];
        const r = (min, max) => gsap.utils.random(min, max);
        $('[data-anim="bob"]', root).forEach((el) => a.push(gsap.to(el, { y: -6, duration: r(1.2, 1.7), ease: 'sine.inOut', yoyo: true, repeat: -1 })));
        $('[data-anim="swing"]', root).forEach((el) => a.push(gsap.to(el, { rotation: -10, transformOrigin: '50% 100%', duration: 0.9, ease: 'sine.inOut', yoyo: true, repeat: -1 })));
        $('[data-anim="pulse"]', root).forEach((el) => a.push(gsap.to(el, { scale: 1.3, rotation: 20, transformOrigin: '50% 50%', duration: 1, ease: 'sine.inOut', yoyo: true, repeat: -1 })));
        $('[data-anim="steam"] path', root).forEach((el, i) => a.push(gsap.fromTo(el, { y: 4, opacity: 0 }, { y: -8, opacity: 1, duration: 1.6, ease: 'sine.out', repeat: -1, delay: i * 0.8, yoyo: true })));
        $('[data-anim="bounce"]', root).forEach((el) => a.push(gsap.to(el, { y: -9, duration: 0.55, ease: 'power1.out', yoyo: true, repeat: -1, repeatDelay: 0.25 })));
        $('[data-anim="grow"] rect', root).forEach((el, i) => a.push(gsap.fromTo(el, { scaleY: 0.55 }, { scaleY: 1, transformOrigin: '50% 100%', duration: 1.1, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: i * 0.2 })));
        $('[data-anim="blink"]', root).forEach((g) => [...g.children].forEach((el, i) =>
          a.push(gsap.fromTo(el, { opacity: 0.25 }, { opacity: 1, duration: 0.7, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: i * 0.25 }))));
        idle.set(root, a);
      }, 2.2);
      return tl;
    },
    exit(root) {
      const tl = genericExit(root);
      tl.to($('.area', root), { scale: 0.7, y: 40, opacity: 0, duration: 0.55, ease: 'back.in(1.6)', stagger: { each: 0.04, from: 'end' } }, 0);
      return tl;
    },
  },

  infra: {
    enter(root) {
      const tl = gsap.timeline();
      eyebrowIn(root, tl);
      wordsIn(root, tl, 0.15);
      // cada hospedagem sobe como um cartão; os riscos acendem um a um, como alertas
      tl.fromTo($('.host', root), { opacity: 0, y: 60, clipPath: 'inset(100% 0% 0% 0% round 22px)' },
        { opacity: 1, y: 0, clipPath: 'inset(0% 0% 0% 0% round 22px)', duration: 1.2, ease: 'expo.out', stagger: 0.25 }, 0.6);
      $('.host-n', root).forEach((el, i) => tl.add(countUp(el, +el.dataset.v, 0.9), 1.1 + i * 0.25));
      const lis = $('.risks li', root);
      tl.fromTo(lis, { opacity: 0, x: -30 }, { opacity: 1, x: 0, duration: 0.7, ease: 'power3.out', stagger: 0.22 }, 1.3);
      tl.fromTo($('.risks .dot', root), { scale: 0 }, { scale: 1, duration: 0.6, ease: 'back.out(3)', stagger: 0.22 }, 1.35);
      tl.add(() => {
        const a = $('.risks .dot', root).map((d, i) => gsap.to(d, {
          boxShadow: '0 0 0 12px rgba(201, 55, 79, 0)', duration: 1.4, ease: 'power2.out', repeat: -1, delay: i * 0.25,
        }));
        idle.set(root, a);
      });
      return tl;
    },
    exit(root) {
      const tl = genericExit(root);
      tl.to($('.host', root), { clipPath: 'inset(0% 0% 100% 0% round 22px)', duration: 0.7, ease: 'power3.in', stagger: 0.08 }, 0);
      return tl;
    },
  },

  nuvem: {
    enter(root) {
      const tl = gsap.timeline();
      eyebrowIn(root, tl);
      wordsIn(root, tl, 0.15);
      fadeUp(tl, root.querySelector('.lede'), 0.8);
      // os dois servidores de hoje aparecem, perdem cor e convergem para a nuvem
      const fbs = $('.fb', root);
      tl.fromTo(fbs, { opacity: 0, y: -20 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.15 }, 0.6);
      const paths = $('.links path', root);
      paths.forEach((p) => { const L = p.getTotalLength(); p.style.strokeDasharray = L; p.dataset.l = L; });
      tl.fromTo(paths, { strokeDashoffset: (i, p) => +p.dataset.l }, { strokeDashoffset: 0, duration: 1.1, ease: 'power2.inOut' }, 1.3);
      tl.to(fbs, { opacity: 0.45, filter: 'grayscale(1)', duration: 0.8 }, 1.6);
      tl.fromTo(root.querySelector('.cloud-card'), { opacity: 0, y: 60, scale: 0.94, filter: 'blur(12px)' },
        { opacity: 1, y: 0, scale: 1, filter: 'blur(0px)', duration: 1.3, ease: 'expo.out' }, 2.0);
      tl.fromTo($('.layer', root), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out', stagger: -0.18 }, 2.4);
      tl.fromTo(root.querySelector('.owner'), { opacity: 0, scale: 0.8 }, { opacity: 1, scale: 1, duration: 0.7, ease: 'back.out(2)' }, 3.0);
      // cada resposta recebe seu "ok"
      tl.fromTo($('.answers li', root), { opacity: 0, x: -24 }, { opacity: 1, x: 0, duration: 0.7, ease: 'power3.out', stagger: 0.2 }, 1.2);
      tl.fromTo($('.answers li i', root), { scale: 0, rotate: -90 }, { scale: 1, rotate: 0, duration: 0.6, ease: 'back.out(2.5)', stagger: 0.2 }, 1.3);
      return tl;
    },
    exit(root) {
      const tl = genericExit(root);
      tl.to(root.querySelector('.cloud-card'), { y: -40, duration: 0.6, ease: 'power2.in' }, 0);
      return tl;
    },
  },

  passado: {
    enter(root) {
      const tl = gsap.timeline();
      eyebrowIn(root, tl);
      wordsIn(root, tl, 0.2);
      tl.fromTo(root.querySelector('.lede'), { opacity: 0, y: 24, filter: 'blur(8px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.2, ease: 'power3.out' }, 0.9);
      const chips = $('.chip', root);
      tl.fromTo(chips,
        { opacity: 0, z: -1100, rotationY: () => gsap.utils.random(-35, 35), rotationX: () => gsap.utils.random(-15, 15), filter: 'blur(22px)' },
        { opacity: 1, z: 0, rotationY: 0, rotationX: 0, filter: 'blur(0px)', duration: 1.9, ease: 'expo.out', stagger: { each: 0.14, from: 'random' } },
        0.6);
      tl.add(() => {
        idle.set(root, chips.map((c, i) => gsap.to(c, {
          y: gsap.utils.random(-14, 14), rotationZ: gsap.utils.random(-1.2, 1.2),
          duration: gsap.utils.random(3, 5), ease: 'sine.inOut', yoyo: true, repeat: -1, delay: i * 0.2,
        })));
      });
      return tl;
    },
    exit(root) {
      const tl = gsap.timeline();
      tl.to($('.chip', root), {
        x: (i, el) => 1250 - el.offsetLeft, y: (i, el) => 430 - el.offsetTop, z: -600,
        scale: 0.2, opacity: 0, filter: 'blur(12px)', duration: 0.95, ease: 'power3.in', stagger: 0.05,
      }, 0);
      wordsOut(root, tl, 0);
      tl.to([root.querySelector('.lede'), root.querySelector('.eyebrow')], { opacity: 0, y: -20, duration: 0.5, ease: 'power2.in' }, 0);
      return tl;
    },
  },

  ciclo: {
    enter(root) {
      const tl = gsap.timeline();
      eyebrowIn(root, tl);
      wordsIn(root, tl, 0.15);
      // o "arquivo": linhas decodificadas em sequência e depois riscadas
      tl.fromTo(root.querySelector('.ledger'), { opacity: 0, y: 50, clipPath: 'inset(0% 0% 100% 0% round 22px)' },
        { opacity: 1, y: 0, clipPath: 'inset(0% 0% 0% 0% round 22px)', duration: 1.1, ease: 'expo.out' }, 0.6);
      tl.fromTo($('.lrow', root), { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: 0.6, ease: 'power3.out', stagger: 0.07 }, 0.75);
      $('.lrow:not(.head) span:first-child', root).forEach((s, i) => tl.add(scramble(s, 0.55), 0.5 + i * 0.07));
      tl.fromTo($('.strike', root), { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: 'power2.inOut', stagger: 0.08 }, 1.6);
      tl.to($('.lrow:not(.head):not(.hl)', root), { opacity: 0.42, duration: 0.6, stagger: 0.05 }, 1.9);
      tl.fromTo(root.querySelector('.ratio-num'), { opacity: 0, scale: 0.8, filter: 'blur(18px)', transformOrigin: '0% 100%' },
        { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 1.4, ease: 'expo.out' }, 0.9);
      counters(root, tl, 0.9, 1.6);
      fadeUp(tl, root.querySelector('.ratio p'), 1.4);
      // evolução: o antigo dá lugar ao novo
      $('.ev', root).forEach((ev, i) => {
        const at = 2.5 + i * 0.4;
        tl.fromTo(ev.querySelector('.old'), { opacity: 0, x: -20 }, { opacity: 1, x: 0, duration: 0.6, ease: 'power3.out' }, at)
          .fromTo(ev.querySelector('i'), { scaleX: 0 }, { scaleX: 1, duration: 0.6, ease: 'expo.inOut' }, at + 0.2)
          .fromTo(ev.querySelector('.new'), { opacity: 0, x: -16, filter: 'blur(6px)' }, { opacity: 1, x: 0, filter: 'blur(0px)', duration: 0.8, ease: 'power3.out' }, at + 0.55);
      });
      return tl;
    },
    exit: genericExit,
  },

  presente: {
    enter(root) {
      const tl = gsap.timeline();
      eyebrowIn(root, tl);
      const big = root.querySelector('.big');
      tl.fromTo(big, { opacity: 0, scale: 0.82, filter: 'blur(24px)', transformOrigin: '0% 80%' },
        { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 1.6, ease: 'expo.out' }, 0.15);
      wordsIn(root, tl, 0.55);
      tl.fromTo(root.querySelector('.sub'), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }, 1.0);
      counters(root, tl, 0.15);
      tl.fromTo(root.querySelector('.donut-wrap'), { opacity: 0, rotate: -25, scale: 0.85 },
        { opacity: 1, rotate: 0, scale: 1, duration: 1.8, ease: 'expo.out' }, 0.3);
      const legend = $('.legend li', root);
      segs.forEach((c, i) => {
        const at = 0.7 + i * 0.32;
        tl.fromTo(c, { strokeDasharray: `0 ${C}` }, { strokeDasharray: `${c.dataset.len} ${C}`, duration: 0.9, ease: 'power2.inOut' }, at);
        tl.fromTo(legend[i], { opacity: 0, x: 30 }, { opacity: 1, x: 0, duration: 0.7, ease: 'power3.out' }, at + 0.1);
      });
      tl.fromTo($('.type', root), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.1 }, 1.4);
      tl.fromTo($('.bar i', root), { scaleX: 0 }, { scaleX: 1, duration: 1.3, ease: 'expo.out', stagger: 0.1 }, 1.6);
      $('.t-val', root).forEach((el, i) => tl.add(countUp(el, +el.dataset.v, 1.3), 1.6 + i * 0.1));
      return tl;
    },
    exit(root) {
      const tl = gsap.timeline();
      tl.to(root.querySelector('.big'), { scale: 1.6, opacity: 0, filter: 'blur(30px)', duration: 0.9, ease: 'power3.in' }, 0);
      wordsOut(root, tl, 0);
      tl.to(root.querySelector('.donut-wrap'), { rotate: 40, scale: 0.6, opacity: 0, duration: 0.9, ease: 'power3.in' }, 0);
      tl.to([...$('.type', root), root.querySelector('.sub'), root.querySelector('.eyebrow')],
        { y: 40, opacity: 0, duration: 0.6, ease: 'power2.in', stagger: 0.04 }, 0);
      return tl;
    },
  },

  frentes: {
    enter(root) {
      const tl = gsap.timeline();
      eyebrowIn(root, tl);
      wordsIn(root, tl, 0.15);
      // colunas sobem como cortinas, com uma faixa de luz que varre de cima a baixo
      const cols = $('.col', root);
      tl.fromTo(cols, { clipPath: 'inset(100% 0% 0% 0% round 22px)', y: 60 },
        { clipPath: 'inset(0% 0% 0% 0% round 22px)', y: 0, duration: 1.2, ease: 'expo.out', stagger: 0.14 }, 0.45);
      tl.fromTo($('.sweep', root), { y: -160, opacity: 1 }, { y: 620, opacity: 0, duration: 1.6, ease: 'power2.inOut', stagger: 0.14 }, 0.6);
      cols.forEach((col, ci) => {
        const at = 0.9 + ci * 0.14;
        tl.fromTo([col.querySelector('.col-idx'), col.querySelector('h3')], { opacity: 0, y: 16 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.08 }, at);
        $('li', col).forEach((li, i) => {
          tl.fromTo(li, { opacity: 0 }, { opacity: 1, duration: 0.2 }, at + 0.3 + i * 0.12);
          tl.add(scramble(li, 0.6), at + 0.3 + i * 0.12);
        });
        fadeUp(tl, col.querySelector('.out'), at + 1.2);
      });
      return tl;
    },
    exit(root) {
      const tl = genericExit(root);
      tl.to($('.col', root), { clipPath: 'inset(0% 0% 100% 0% round 22px)', duration: 0.7, ease: 'power3.in', stagger: 0.06 }, 0);
      return tl;
    },
  },

  curso: {
    enter(root) {
      const tl = gsap.timeline();
      eyebrowIn(root, tl);
      wordsIn(root, tl, 0.15);
      counters(root, tl, 0.2, 1.4);
      tl.fromTo($('.lane-h', root), { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.7, ease: 'power3.out', stagger: 0.1 }, 0.4);
      // esteira: os cartões entram pela esquerda e correm até sua etapa (quanto mais avançada, mais longe vão)
      const flow = $('.lane:not(.lane-warn) .kc', root);
      const laneX = (el) => el.closest('.lane').offsetLeft + el.offsetLeft;
      tl.fromTo(flow,
        { x: (i, el) => -(laneX(el) + 520), opacity: 0 },
        { x: 0, opacity: 1, duration: (i, el) => 1.0 + laneX(el) / 1400, ease: 'expo.out', stagger: 0.09 }, 0.6);
      // paralisadas: caem e "travam"; sem status: aparecem apagadas
      tl.fromTo($('.kc.stop', root), { y: -120, opacity: 0, rotation: -4 },
        { y: 0, opacity: 1, rotation: 0, duration: 1.1, ease: 'bounce.out', stagger: 0.18 }, 1.6);
      tl.fromTo($('.kc.ghost', root), { opacity: 0 }, { opacity: 1, duration: 0.8, stagger: 0.1 }, 2.1);
      tl.to($('.kc.stop', root), { keyframes: { x: [0, -6, 6, -4, 4, 0] }, duration: 0.5, ease: 'none' }, 2.9);
      return tl;
    },
    exit(root) {
      const tl = genericExit(root);
      tl.to($('.kc', root), { x: 300, opacity: 0, duration: 0.6, ease: 'power3.in', stagger: 0.025 }, 0);
      return tl;
    },
  },

  risco: {
    enter(root) {
      const tl = gsap.timeline();
      eyebrowIn(root, tl);
      wordsIn(root, tl, 0.15);
      tl.fromTo(root.querySelector('.alert-num'), { opacity: 0, scale: 0.85, filter: 'blur(20px)', transformOrigin: '0% 100%' },
        { opacity: 1, scale: 1, filter: 'blur(0px)', duration: 1.4, ease: 'expo.out' }, 0.4);
      counters(root, tl, 0.4, 1.6);
      fadeUp(tl, root.querySelector('.alert-cap'), 1.0);
      // a agulha "hoje" avança e cada versão que ela ultrapassa perde suporte
      const marks = $('.mk', root);
      marks.forEach((m) => m.classList.remove('dead', 'lit'));
      tl.fromTo([root.querySelector('.axis'), root.querySelector('.years')], { opacity: 0 }, { opacity: 1, duration: 0.6 }, 0.6);
      tl.fromTo(marks, { opacity: 0, y: 14 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out', stagger: 0.08 }, 0.8);
      const T = 2.6, start = 1.4;
      tl.fromTo(root.querySelector('.playhead'), { left: '0%', opacity: 0 }, { left: `${TODAY_PCT}%`, opacity: 1, duration: T, ease: 'power1.inOut' }, start);
      tl.fromTo(root.querySelector('.axis-fill'), { width: '0%' }, { width: `${TODAY_PCT}%`, duration: T, ease: 'power1.inOut' }, start);
      marks.forEach((m) => {
        const p = parseFloat(m.style.left);
        if (m.classList.contains('safe')) {
          tl.add(() => m.classList.add('lit'), start + T + 0.1);
        } else {
          const at = start + T * Math.min(1, p / TODAY_PCT);
          tl.add(() => m.classList.add('dead'), at);
          tl.to(m.querySelector('b'), { keyframes: { x: [0, -5, 5, -3, 0] }, duration: 0.35 }, at);
        }
      });
      tl.fromTo($('.fact', root), { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.15 }, 3.4);
      fadeUp(tl, root.querySelector('.source'), 3.8);
      return tl;
    },
    exit: genericExit,
  },

  futuro: {
    enter(root) {
      const tl = gsap.timeline();
      eyebrowIn(root, tl);
      wordsIn(root, tl, 0.2);
      tl.fromTo(root.querySelector('.lede'), { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 1, ease: 'power3.out' }, 0.8);
      counters(root, tl, 0.3);
      const stage = root.querySelector('.stage');
      tl.fromTo(stage, { z: -900, rotationX: 22, rotationY: -26, opacity: 0 },
        { z: 0, rotationX: 3, rotationY: -2.5, opacity: 1, duration: 2.6, ease: 'expo.out' }, 0.1);
      buildRail(root); // precisa do slide visível para medir os pilares
      const path = root.querySelector('#railPath');
      const L = path.getTotalLength();
      tl.fromTo(path, { strokeDasharray: L, strokeDashoffset: L }, { strokeDashoffset: 0, duration: 2.6, ease: 'power2.inOut' }, 0.5);
      tl.fromTo($('.pillar', root),
        { opacity: 0, y: 80, z: -260, rotationX: -25, filter: 'blur(14px)' },
        { opacity: 1, y: 0, z: 0, rotationX: 0, filter: 'blur(0px)', duration: 1.3, ease: 'expo.out', stagger: 0.36 }, 0.85);
      $('.p-n', root).forEach((el, i) => tl.add(countUp(el, +el.dataset.v, 1), 1.1 + i * 0.36));
      tl.add(() => {
        const rx = gsap.quickTo(stage, 'rotationX', { duration: 1.4, ease: 'power3.out' });
        const ry = gsap.quickTo(stage, 'rotationY', { duration: 1.4, ease: 'power3.out' });
        const onMove = (e) => {
          ry(-2.5 + (e.clientX / innerWidth - 0.5) * 4);
          rx(3 - (e.clientY / innerHeight - 0.5) * 4);
        };
        window.addEventListener('pointermove', onMove);
        idle.set(root, [{ kill: () => window.removeEventListener('pointermove', onMove) }]);
      });
      return tl;
    },
    exit(root) {
      const tl = gsap.timeline();
      tl.to(root.querySelector('.stage'), { z: 500, opacity: 0, filter: 'blur(10px)', duration: 0.9, ease: 'power3.in' }, 0);
      wordsOut(root, tl, 0);
      tl.to([root.querySelector('.lede'), root.querySelector('.eyebrow')], { opacity: 0, y: -20, duration: 0.5, ease: 'power2.in' }, 0);
      return tl;
    },
  },

  prioridades: {
    enter(root) {
      const tl = gsap.timeline();
      eyebrowIn(root, tl);
      wordsIn(root, tl, 0.15);
      // cada prioridade "tomba" para frente como uma placa articulada, guiada pela espinha
      tl.fromTo(root.querySelector('.spine'), { scaleY: 0 }, { scaleY: 1, duration: 2.4, ease: 'power2.inOut' }, 0.4);
      tl.fromTo($('.pr', root), { rotationX: -95, opacity: 0, transformPerspective: 1400 },
        { rotationX: 0, opacity: 1, duration: 1.1, ease: 'back.out(1.4)', stagger: 0.32 }, 0.5);
      tl.fromTo($('.pn', root), { scale: 1.6, opacity: 0, filter: 'blur(10px)' },
        { scale: 1, opacity: 1, filter: 'blur(0px)', duration: 0.9, ease: 'expo.out', stagger: 0.32 }, 0.65);
      counters(root, tl, 1.4, 1.2);
      return tl;
    },
    exit(root) {
      const tl = genericExit(root);
      tl.to($('.pr', root), { rotationX: 90, opacity: 0, duration: 0.5, ease: 'power2.in', stagger: 0.05 }, 0);
      return tl;
    },
  },

  sintese: {
    enter(root) {
      const tl = gsap.timeline();
      eyebrowIn(root, tl);
      // um feixe de luz cruza os três tempos e acende cada coluna quando passa
      tl.fromTo(root.querySelector('.beam'), { scaleX: 0 }, { scaleX: 1, duration: 2.2, ease: 'power2.inOut' }, 0.3);
      $('.tc', root).forEach((tc, i) => {
        const at = 0.55 + i * 0.6;
        tl.fromTo(tc.querySelector('span'), { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power3.out' }, at)
          .fromTo(tc.querySelector('p'), { opacity: 0, y: 30, filter: 'blur(10px)' }, { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.1, ease: 'expo.out' }, at + 0.12);
      });
      counters(root, tl, 1.0, 1.4);
      tl.fromTo($('.signoff .ch', root), { opacity: 0, y: 80, filter: 'blur(16px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.4, ease: 'expo.out', stagger: 0.06 }, 2.4);
      fadeUp(tl, root.querySelector('.cover-foot'), 3.2);
      wavesIn(root, tl, 1.6);
      tl.fromTo($('.end-logos .govam, .end-logos .row > *', root), { opacity: 0, y: 24, filter: 'blur(8px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.1, ease: 'power3.out', stagger: 0.15 }, 2.8);
      return tl;
    },
    exit: genericExit,
  },
};

/* paralaxe dos cartões do passado: usa xPercent/yPercent para não conflitar com o "float" */
const chipMovers = $('.chip').map((c) => ({
  d: +c.dataset.depth,
  x: gsap.quickTo(c, 'xPercent', { duration: 1.2, ease: 'power3.out' }),
  y: gsap.quickTo(c, 'yPercent', { duration: 1.2, ease: 'power3.out' }),
}));
window.addEventListener('pointermove', (e) => {
  const mx = e.clientX / innerWidth - 0.5, my = e.clientY / innerHeight - 0.5;
  chipMovers.forEach((m) => { m.x(-mx * 14 * m.d); m.y(-my * 30 * m.d); });
});

/* ------------------------------------------------------------------ */
/* Reveal + orquestração                                               */
/* ------------------------------------------------------------------ */
if (location.search.includes('capture')) gsap.ticker.lagSmoothing(0);
const scene = createScene(document.getElementById('gl'));
const deck = new Reveal({
  width: 1920, height: 1080, margin: 0, minScale: 0.05, maxScale: 4, center: false,
  transition: 'none', backgroundTransition: 'none',
  controls: false, progress: false, hash: true, keyboard: true, overview: false,
  plugins: [Notes],
});
window.deck = deck;

const running = new Map();
function killSlide(root) {
  running.get(root)?.kill();
  running.delete(root);
  (idle.get(root) || []).forEach((a) => a.kill());
  idle.delete(root);
}
function resetSlide(root) {
  // ilustrações SVG ficam de fora: limpar transform apagaria os atributos transform originais
  gsap.set(root.querySelectorAll('*:not(.ill *)'), { clearProps: 'transform,opacity,filter,x,y,z,scale,rotate,clipPath' });
}

function updateChrome(root) {
  const idx = deck.getIndices().h;
  const total = deck.getTotalSlides();
  const n = (v) => String(v).padStart(2, '0');
  document.getElementById('era').innerHTML = `<span>${n(idx + 1)} / ${n(total)}</span> ${root.dataset.era}`;
  gsap.to('#progress', { width: `${((idx + 1) / total) * 100}%`, duration: 1.4, ease: 'expo.inOut' });
  gsap.fromTo('#era', { opacity: 0, y: -8 }, { opacity: 1, y: 0, duration: 0.8, ease: 'power3.out' });
}

function enter(root, delay = 0) {
  killSlide(root);
  root.classList.remove('leaving');
  resetSlide(root);
  const tl = choreo[root.dataset.id].enter(root);
  if (reduce) tl.progress(1);
  tl.delay(delay);
  running.set(root, tl);
}

// modo captura: congela a timeline do slide atual em um instante exato
if (location.search.includes('capture')) {
  window.__seek = (t) => { const tl = running.get(deck.getCurrentSlide()); tl?.pause(); tl?.seek(t, false); };
}

deck.initialize().then(() => {
  const cur = deck.getCurrentSlide();
  scene.set(cur.dataset.id);
  scene.intro();
  updateChrome(cur);
  enter(cur, 0.3);
});

deck.on('slidechanged', ({ previousSlide: prev, currentSlide: cur }) => {
  scene.to(cur.dataset.id);
  updateChrome(cur);
  if (prev) {
    killSlide(prev);
    prev.classList.add('leaving');
    const out = choreo[prev.dataset.id].exit(prev);
    out.eventCallback('onComplete', () => { prev.classList.remove('leaving'); resetSlide(prev); });
    running.set(prev, out);
  }
  enter(cur, prev ? 0.55 : 0);
});
