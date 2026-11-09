// Lê data/relatorio.xlsx e gera src/data.json com os agregados usados nos slides.
const fs = require('fs');
const path = require('path');
const XLSX = require('xlsx');

const src = path.join(__dirname, '..', 'data', 'relatorio.xlsx');
const out = path.join(__dirname, '..', 'src', 'data.json');

const wb = XLSX.readFile(src);
const rows = XLSX.utils
  .sheet_to_json(wb.Sheets[wb.SheetNames[0]], { defval: '', raw: false })
  .filter((r) => String(r.SISTEMA).trim());

const norm = (s) => String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').trim().toUpperCase();

// Normaliza status (corrige grafias como "EM PRDUÇÃO").
function status(r) {
  const s = norm(r.STATUS);
  if (/^EM PRO?DUCAO/.test(s)) return 'producao';
  if (s.includes('DESENVOLVIMENTO') || s.includes('HOMOLOGA') || s.includes('AGUARDANDO')) return 'andamento';
  if (s.includes('ENTREGA FUTURA')) return 'futuro';
  if (s.includes('DESCONTINUADO')) return 'descontinuado';
  if (s.includes('PARALISADO')) return 'paralisado';
  return 'sem_status';
}

function tipo(r) {
  const t = norm(r['TIPO PROJETO']);
  if (t.includes('ANALYTICS')) return 'analytics';
  if (t.includes('APLICATIVO')) return 'app';
  if (t === 'GEO') return 'geo';
  if (t.includes('WEB')) return 'web';
  return 'outros';
}

const items = rows.map((r) => {
  const tec = String(r['FRAMEWORK/TECNOLOGIA/VERSÃO']);
  const laravel = (tec.match(/laravel\s*(\d+)/gi) || []).map((s) => +s.match(/\d+/)[0]);
  const node = (tec.match(/node(?:\s*js|\.js)?\s*(\d+)/gi) || []).map((s) => +s.match(/\d+$/)[0]);
  return {
    nome: String(r.SISTEMA).replace(/\s+/g, ' ').trim(),
    status: status(r),
    tipo: tipo(r),
    ano: /^\d{4}$/.test(String(r['ANO ÚLTIMA VERSÃO']).trim()) ? +r['ANO ÚLTIMA VERSÃO'] : null,
    anoVazio: !String(r['ANO ÚLTIMA VERSÃO']).trim(),
    ref: String(r.QTD).includes('#REF'),
    laravel, node,
  };
});

const count = (fn, list = items) => list.reduce((m, i) => ((m[fn(i)] = (m[fn(i)] || 0) + 1), m), {});
const prod = items.filter((i) => i.status === 'producao');

// Base tecnológica (sistemas não descontinuados com versão de Laravel/Node declarada).
// Sem suporte de segurança em nov/2026: Laravel <= 11 (L11 até mar/2026) e Node <= 20 (Node 20 EOL abr/2026).
const ativos = items.filter((i) => i.status !== 'descontinuado');
const comVersao = ativos.filter((i) => i.laravel.length || i.node.length);
const laravelLegado = ativos.filter((i) => i.laravel.some((v) => v <= 11));
const nodeLegado = ativos.filter((i) => i.node.some((v) => v <= 20));
const semSuporte = comVersao.filter((i) => i.laravel.some((v) => v <= 11) || i.node.some((v) => v <= 20));

const data = {
  total: items.length,
  porStatus: count((i) => i.status),
  porTipo: count((i) => i.tipo),
  producaoPorTipo: count((i) => i.tipo, prod),
  producao2026: prod.filter((i) => i.ano === 2026).length,
  tecnologia: {
    comVersao: comVersao.length,
    semSuporte: semSuporte.length,
    laravelLegado: laravelLegado.length,
    nodeLegado: nodeLegado.length,
  },
  qualidade: {
    semStatus: items.filter((i) => i.status === 'sem_status').length,
    semAno: items.filter((i) => i.anoVazio).length,
    linhasRef: items.filter((i) => i.ref).length,
  },
  descontinuadosPainel: items.filter((i) => i.status === 'descontinuado' && i.tipo === 'analytics').length,
  versao2026: items.filter((i) => i.ano === 2026).length,
  futuros: items.filter((i) => i.status === 'futuro').map((i) => i.nome),
  andamento: items.filter((i) => i.status === 'andamento').map((i) => i.nome),
  geradoEm: new Date().toISOString(),
};

fs.writeFileSync(out, JSON.stringify(data, null, 2));
console.log(JSON.stringify(data, null, 2));
