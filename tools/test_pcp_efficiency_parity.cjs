const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {URL}=require('node:url'),root=path.join(__dirname,'..');
const context={window:{},ApiScreen:{escape:String}};
vm.runInNewContext(fs.readFileSync(path.join(root,'assets/js/pcp-cirurgico.js'),'utf8').replace('return {mount};','return {mount,productivityEfficiency};'),context);
vm.runInNewContext(fs.readFileSync(path.join(root,'assets/js/pcp-eficiencia.js'),'utf8').replace('return {mount};','return {mount,componentSummary,filterCalendarDates};'),context);
const production=context.window.PcpCirurgico.productivityEfficiency,destination=context.window.PcpEficiencia;
const row=(data,unidade,birds,capacity)=>({data,unidade,aves_abatidas_liquidas:birds,capacidade_nominal_aves:capacity,cabecas:birds,tempo_real_horas:8});
const rows=[row('2026-10-30','10',90000,100000),row('2026-10-30','111',60000,90000),row('2026-11-02','10',101134,157500),row('2026-11-02','111',73615,89616.66666666667),row('2026-11-03','10',120945,140000),row('2026-11-03','111',68532,85000),row('2026-11-04','10',0,100000),row('2026-11-04','111',null,80000),row('2026-11-05','10',999999,1),row('2026-11-03','10',120945,140000)];
const limit='2026-11-04';let checked=0;
for(const companies of [['10'],['111'],['10','111']]){
 for(const scope of [{dates:['2026-11-02']},{dates:['2026-11-02','2026-11-03','2026-11-04','2026-11-05']},{periods:['2026-11']},{periods:['2026-10','2026-11']},{dates:['2026-10-30','2026-11-03']}]){
  const result=production.total(rows,{companies,limit,...scope});
  const url=new URL(production.href(result),'http://localhost/'),q=url.searchParams;
  assert.equal(q.get('origem'),'produtividade');
  const dates=q.get('datas')?.split(','),selectedCompanies=q.get('unidade').split(',');
  const received=rows.filter(r=>r.data>=q.get('data_inicio')&&r.data<=q.get('data_fim')&&selectedCompanies.includes(r.unidade)&&(!dates||dates.includes(r.data)));
  const actual=destination.componentSummary(received,companies.length===2?'total':companies[0]);
  assert.equal(actual.eficiencia,result.ratio,'Mesmo valor após o recorte enviado no link: '+JSON.stringify({companies,scope}));
  assert.equal((actual.eficiencia*100).toFixed(1),(result.ratio*100).toFixed(1));
  checked++;
 }
}
assert.equal(checked,15);
console.log('OK: 15 combinações de empresa, dia, semana, mês, ano e datas não contíguas, com D−1, duplicidade e ausência.');
