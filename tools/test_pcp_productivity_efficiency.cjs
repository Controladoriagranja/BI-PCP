const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../assets/js/pcp-cirurgico.js'),'utf8');
const element=()=>({hidden:false,innerHTML:'',addEventListener(){},querySelectorAll:()=>[],lastElementChild:{append(){}}});
const months=element(),detail=element(),notice=element(),root=element();
root.querySelector=s=>({'.cg-production-months':months,'.cg-production-detail':detail,'.cg-production-notice':notice}[s]);
const PcpMulti={values:v=>String(v||'').split(',').filter(Boolean),includes:(v,x)=>!v||String(v).split(',').includes(String(x))};
const context={window:{},ApiScreen:{escape:String},PcpMulti,document:{createElement:tag=>tag==='section'?root:element(),addEventListener(){}},requestAnimationFrame:fn=>fn(),ResizeObserver:class{observe(){}}};
vm.runInNewContext(source.replace('return {mount};','return {mount,productivityEfficiency,createProductivityCalendar,createProductivityMonthly};'),context);
const app=context.window.PcpCirurgico,eff=app.productivityEfficiency;
const row=(data,unidade,birds,capacity)=>({data,unidade,aves_abatidas_liquidas:birds,capacidade_nominal_aves:capacity});
const rows=[row('2026-11-02','10',90,100),row('2026-11-03','10',20,100),row('2026-11-02','111',60,100),row('2026-11-03','111',80,100),row('2026-11-05','10',999,100),row('2026-11-03','10',20,100),row('2026-11-04','10',null,100)];
const opts={companies:['10'],limit:'2026-11-04'};
assert.equal(eff.total(rows,opts).ratio,.55,'Razão das somas; deduplica empresa/dia; exclui futuro e inválidos');
assert.equal(eff.total(rows,{...opts,dates:['2026-11-02']}).ratio,.9,'Filtro de dia');
assert.equal(eff.total(rows,{...opts,companies:['111']}).ratio,.7,'Real independente');
assert.equal(eff.total(rows,{...opts,companies:['10','111']}).ratio,.625,'Empresas: soma dos componentes, sem média');
assert.equal(eff.total(rows,{...opts,periods:['2026-10'] }),null,'Mês sem dados não vira zero');
assert.equal(eff.total([row('2026-11-02','10',0,100)],opts).ratio,0,'Zero informado válido');
assert.equal(eff.total([row('2026-11-02','10',100,0)],opts),null,'Capacidade inválida');
const fields={Ano:{value:'2026',options:[{value:'2026'}]},Mes:{value:'11'},Dia:{value:''},Unidade:{value:'10'},Grupo:{value:''},SemanaCheia:{checked:false}};
const heads={status:'ready',limit:'2026-11-04',rows:['02','03'].flatMap(day=>['10','111'].map(empresa_codigo=>({data:'2026-11-'+day,empresa_codigo,quantidade_cabecas:100,turnos:{'1':50,'2':50}}))),pesos:[],metas:[],turnosRows:[],turnosMedias:[],medias:[],eficiencia:{status:'ready',rows}};
const calendar=app.createProductivityCalendar({prepend(){}},fields,()=>{},()=>false,()=>heads);calendar.root.hidden=false;
const cell=kind=>months.innerHTML.match(new RegExp('data-cg-total="'+kind+'"[^>]*>([\\s\\S]*?)</td>'))[1];
for(const [unit,value] of [['10','55,0%'],['111','70,0%'],['10,111','62,5%'],['1,2','55,0%']]){
 fields.Unidade.value=unit;calendar.render();assert.match(cell('month'),new RegExp(value));assert.match(cell('week-0'),new RegExp(value));
}
for(const unit of ['1','2']){fields.Unidade.value=unit;calendar.render();assert.doesNotMatch(months.innerHTML,/cg-productivity-efficiency/,'Turno isolado não mostra eficiência');}
fields.Unidade.value='10';fields.Dia.value='2026-11-02';calendar.render();assert.match(cell('month'),/90,0%/);fields.Dia.value='';
const box={innerHTML:'',scrollTop:0,scrollLeft:0,querySelector:()=>({style:{}})};
const monthly=app.createProductivityMonthly({querySelector:s=>s==='p'?{}:box,closest:()=>null},fields,()=>heads,()=> '2026-11');monthly.render();
const cells=attr=>[...box.innerHTML.match(new RegExp('<tr[^>]*'+attr+'[^>]*>(.*?)</tr>'))[1].matchAll(/<td[^>]*>(.*?)<\/td>/g)].map(m=>m[1]);
for(const attr of ['data-cg-month-period="2026-11"','data-cg-total-year="2026"']){
 const columns=cells(attr);assert.doesNotMatch(columns[0],/cg-productivity-efficiency/);assert.doesNotMatch(columns[1],/cg-productivity-efficiency/);
 for(const [i,value] of [[2,'55,0%'],[3,'70,0%'],[4,'62,5%']])assert.match(columns[i],new RegExp(value));
}
const saved=box.innerHTML;fields.Unidade.value='1';fields.Mes.value='10';fields.Dia.value='2026-11-02';monthly.render();assert.equal(box.innerHTML,saved,'Mensal independente dos filtros de calendário');
heads.eficiencia={status:'error',rows:[],error:'API indisponível'};monthly.render();assert.match(box.innerHTML,/Eficiência \(%\)/);assert.doesNotMatch(box.innerHTML,/55,0%/);
module.exports=(async()=>{
 let calls=0;
 const get=async()=>{calls++;return {ok:true,contrato:'eficiencia-abate-v1',revisao_formulas:'eficiencia-capacidade-v3',dias:rows};};
 await Promise.all([eff.load(get,['2026','2026'],'2026-11-04'),eff.load(get,['2026'],'2026-11-04')]);assert.equal(calls,1,'Calendário e mensal compartilham consulta anual em voo');
 await eff.load(get,['2026'],'2026-11-04');assert.equal(calls,1,'Filtro simples reutiliza cache');
 let attempts=0;const old=async()=>{attempts++;return {ok:true,dias:[]};};
 await assert.rejects(eff.load(old,['2025'],'2026-11-04'),/v3/);await assert.rejects(eff.load(old,['2025'],'2026-11-04'),/v3/);assert.equal(attempts,2,'Erro não permanece em cache');
 console.log('OK: eficiência em dias, semanas, mês e ano; turnos omitidos; Real e combinado; D−1; cache anual e API antiga.');
})();

// Links preservam datas, empresas e a visão semanal/mensal.
const URLClass=require('node:url').URL;
const query=markup=>new URLClass(markup.match(/href="([^"]+)"/)[1].replaceAll('&amp;','&'),'http://localhost/').searchParams;
let link=query(eff.markup(eff.total(rows,{...opts,dates:['2026-11-02']})));
assert.equal(link.get('relatorio'),'g5');assert.equal(link.get('data_inicio'),'2026-11-02');assert.equal(link.get('data_fim'),'2026-11-02');assert.equal(link.get('unidade'),'10');
link=query(eff.markup(eff.total(rows,{...opts,companies:['10','111'],dates:['2026-11-02','2026-11-03','2026-11-07']}),'semana'));
assert.equal(link.get('data_fim'),'2026-11-03');assert.equal(link.get('unidade'),'10,111');assert.equal(link.get('resumo'),'semana');assert.equal(link.get('datas'),'2026-11-02,2026-11-03');
link=query(eff.markup(eff.total(rows,{...opts,companies:['111'],periods:['2026-11']})));
assert.equal(link.get('data_inicio'),'2026-11-01');assert.equal(link.get('data_fim'),'2026-11-04');assert.equal(link.get('unidade'),'111');assert.equal(link.get('resumo'),'mes');
assert.doesNotMatch(eff.markup(null),/href=/,'Sem resultado não cria navegação enganosa');
heads.eficiencia={status:'ready',rows};fields.Mes.value='11';fields.Dia.value='';fields.Unidade.value='10';calendar.render();
assert.doesNotMatch(months.innerHTML,/<button[^>]*data-cg-day[^>]*>(?:(?!<\/button>)[\s\S])*<a /,'Link fora do botão que abre Rendimento');
