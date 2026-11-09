const XLSX=require('xlsx');const wb=XLSX.readFile(process.argv[2]);
console.log('sheets',wb.SheetNames);
const rows=XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]],{defval:'',raw:false});
const R=rows.filter(r=>r.SISTEMA);console.log('n',R.length);
const cnt=k=>{const m={};R.forEach(r=>{const v=String(r[k]).trim().toUpperCase()||'(vazio)';m[v]=(m[v]||0)+1});return Object.entries(m).sort((a,b)=>b[1]-a[1])};
for(const k of ['TIPO PROJETO','ANO ÚLTIMA VERSÃO','STATUS','CATEGORIA','TAG'])console.log(k,JSON.stringify(cnt(k)));
R.forEach(r=>console.log([r.QTD,r.SISTEMA,r['ANO ÚLTIMA VERSÃO'],r.STATUS,r.CATEGORIA,r['TIPO PROJETO']].join(' | ')));
