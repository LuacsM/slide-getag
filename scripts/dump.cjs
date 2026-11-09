const XLSX=require('xlsx');const wb=XLSX.readFile(process.argv[2]);
for(const n of wb.SheetNames){const ws=wb.Sheets[n];console.log('=== SHEET',n,ws['!ref']);
const rows=XLSX.utils.sheet_to_json(ws,{header:1,defval:'',raw:false});
rows.slice(0,80).forEach((r,i)=>{if(r.some(c=>c!==''))console.log(i,JSON.stringify(r))});console.log('rows',rows.length)}
