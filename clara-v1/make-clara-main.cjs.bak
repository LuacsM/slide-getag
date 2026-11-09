// Gera clara/main.js a partir de src/main.js (versão escura), aplicando as mudanças da versão clara.
// A versão escura não é alterada.
const fs = require('fs');
const path = require('path');
const root = path.join(__dirname, '..');
let h = fs.readFileSync(path.join(root, 'src/main.js'), 'utf8');
const rep = (a, b) => { if (!h.includes(a)) throw new Error('missing: ' + a.slice(0, 80)); h = h.replace(a, b); };

rep(`import data from './data.json';\nimport './deck.css';`, `import data from '../src/data.json';`);

// paleta do donut
rep(`color: '#5ce1e6' },`, `color: '#224c9c' },`);
rep(`color: '#2fc7a4' },`, `color: '#0093d3' },`);
rep(`color: '#ffb547' },`, `color: '#22a33c' },`);
rep(`color: '#6b7fa6' },`, `color: '#b6bdd0' },`);
rep(`color: '#3a4256' },`, `color: '#e39aa7' },`);
rep(`if (s.color === '#5ce1e6') c.style.filter = 'drop-shadow(0 0 10px rgba(92,225,230,.55))';`,
  `if (s.color === '#224c9c') c.style.filter = 'drop-shadow(0 8px 14px rgba(34,76,156,.28))';`);

// tríade da capa
h = h.replace(/'#4a5266'/g, "'#9aa2b9'");
rep(`'#ff8d9a'`, `'#c9374f'`);
rep(`{ color: '#5ce1e6', duration: 0.5 }`, `{ color: '#224c9c', duration: 0.5 }`);
rep(`{ color: '#ffb547', duration: 0.5 }`, `{ color: '#0a7434', duration: 0.5 }`);

// gerador das ondas da marca
rep(`/* ------------------------------------------------------------------ */
/* utilidades de animação`, `// ondas da marca: linhas finas que se cruzam (azul e verdes), como na papelaria SEDUC/GOVAM
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
    return \`<path d="\${d}" stroke="\${col}" opacity="\${0.55 + j * 0.1}"/>\`;
  }).join('');
});

/* ------------------------------------------------------------------ */
/* utilidades de animação`);

rep(`/* trilho do futuro`, `// ondas: desenho em traço e depois uma ondulação lenta contínua
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

/* trilho do futuro`);

// capítulos
rep(`    fadeUp(tl, root.querySelector('.chapter-sub'), 1.1);
    return tl;`, `    fadeUp(tl, root.querySelector('.chapter-sub'), 1.1);
    wavesIn(root, tl, 0.4);
    return tl;`);
rep(`    tl.to([root.querySelector('.eyebrow'), root.querySelector('.chapter-sub')], { opacity: 0, y: -20, duration: 0.5, ease: 'power2.in' }, 0);`,
  `    tl.to([root.querySelector('.eyebrow'), root.querySelector('.chapter-sub')], { opacity: 0, y: -20, duration: 0.5, ease: 'power2.in' }, 0);
    tl.to(root.querySelector('.waves'), { opacity: 0, y: 40, duration: 0.7, ease: 'power2.in' }, 0);`);

// capa
rep(`      fadeUp(tl, root.querySelector('.cover-foot'), 2.2);
      return tl;`, `      fadeUp(tl, root.querySelector('.cover-foot'), 2.2);
      wavesIn(root, tl, 0.6);
      tl.fromTo($('.cover-logos > *', root), { opacity: 0, y: 24, filter: 'blur(8px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.1, ease: 'power3.out', stagger: 0.15 }, 0.2);
      return tl;`);
rep(`root.querySelector('.cover-foot'), root.querySelector('.eyebrow')], { opacity: 0, y: -20, duration: 0.5 }, 0);`,
  `root.querySelector('.cover-foot'), root.querySelector('.cover-logos'), root.querySelector('.waves')], { opacity: 0, y: -20, duration: 0.5 }, 0);`);

// síntese
rep(`      fadeUp(tl, root.querySelector('.cover-foot'), 3.2);
      return tl;`, `      fadeUp(tl, root.querySelector('.cover-foot'), 3.2);
      wavesIn(root, tl, 1.6);
      tl.fromTo($('.end-logos .govam, .end-logos .row > *', root), { opacity: 0, y: 24, filter: 'blur(8px)' },
        { opacity: 1, y: 0, filter: 'blur(0px)', duration: 1.1, ease: 'power3.out', stagger: 0.15 }, 2.8);
      return tl;`);

// ciclo: o cartão branco da tabela (só existe na versão clara) entra depois que o slide anterior sai
rep(`      tl.fromTo($('.lrow', root), { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: 0.6, ease: 'power3.out', stagger: 0.07 }, 0.4);`,
  `      tl.fromTo(root.querySelector('.ledger'), { opacity: 0, y: 50, clipPath: 'inset(0% 0% 100% 0% round 22px)' },
        { opacity: 1, y: 0, clipPath: 'inset(0% 0% 0% 0% round 22px)', duration: 1.1, ease: 'expo.out' }, 0.6);
      tl.fromTo($('.lrow', root), { opacity: 0, x: 40 }, { opacity: 1, x: 0, duration: 0.6, ease: 'power3.out', stagger: 0.07 }, 0.75);`);

fs.writeFileSync(path.join(root, 'clara/main.js'), h);
console.log('clara/main.js ok');
