// Paradas disponíveis: cenários locais, sem API/banco reais.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../assets/js/pcp-cirurgico.js'),'utf8');
const element=()=>({hidden:false,innerHTML:'',addEventListener(){},querySelectorAll:()=>[],lastElementChild:{append(){}}});
const months=element(),detail=element(),notice=element(),root=element();
root.querySelector=s=>({'.cg-production-months':months,'.cg-production-detail':detail,'.cg-production-notice':notice}[s]);
const PcpMulti={values:v=>String(v||'').split(',').filter(Boolean),includes:(v,x)=>!v||String(v).split(',').includes(String(x))};
const context={window:{},ApiScreen:{escape:String},PcpMulti,document:{createElement:tag=>tag==='section'?root:element(),addEventListener(){}},requestAnimationFrame:fn=>fn(),ResizeObserver:class{observe(){}}};
vm.runInNewContext(source.replace('return {mount};','return {mount,productivityStopsTotal,productivityStopsPeriod,createProductivityCalendar,createProductivityMonthly};'),context);
const app=context.window.PcpCirurgico,plain=v=>JSON.parse(JSON.stringify(v)),sum=app.productivityStopsTotal;
assert.deepEqual(plain(sum([])),{minutes:null,target:null,partial:false});
assert.deepEqual(plain(sum([{minutes:null,target:30},{minutes:null,target:30}])),{minutes:null,target:60,partial:true},'Sem informação não vira zero');
assert.deepEqual(plain(sum([{minutes:0,target:30},{minutes:null,target:30}])),{minutes:0,target:60,partial:true},'Zero informado é válido');
assert.deepEqual(plain(sum([{minutes:12,target:30},{minutes:8,target:30},{minutes:null,target:30}])),{minutes:20,target:90,partial:true},'Um ausente não cancela os disponíveis');
assert.equal(sum([{minutes:10.25,target:30},{minutes:2.375,target:30}]).minutes,12.625,'Não arredondar antes de somar');
assert.equal(sum([{minutes:NaN,target:30},{minutes:Infinity,target:30},{minutes:5,target:30}]).minutes,5);
assert.equal(sum([{minutes:5,target:30},{minutes:8,target:null}]).target,null,'Não inventar meta parcial');

const values=(t1,t2,an,ra)=>Object.fromEntries([['1',t1],['2',t2],['10',an],['111',ra]].map(([key,value])=>[key,[...Array(14).fill(null),value]]));
const target={'1':30,'2':30,'10':60,'111':30};
const day=(date,t1,t2,an,ra)=>({data:'2026-11-'+date,valores:values(t1,t2,an,ra),metas_paradas:target});
const report={data_limite:'2026-11-23',indicadores:[{ordem:15,unidade:'min'}],dias:[day('16',20,null,60,40),day('17',null,5,null,50),day('18',0,0,0,0),day('21',12,null,12,null),day('22',999,999,999,999),day('24',999,999,999,999)]};
const fields={Ano:{value:'2026',options:[{value:'2026'}]},Mes:{value:'11'},Dia:{value:''},Unidade:{value:'10,111'},Grupo:{value:''},SemanaCheia:{checked:false}};
const heads={status:'ready',limit:report.data_limite,rows:['16','17','18','19','20','21'].flatMap(date=>['10','111'].map(code=>({data:'2026-11-'+date,empresa_codigo:code,empresa:code==='10'?'Ave Nova':'Real Alimentos',quantidade_cabecas:100,turnos:{'1':50,'2':50}}))),pesos:[],metas:[]};
const calendar=app.createProductivityCalendar({prepend(){}},fields,()=>{},()=>false,()=>heads,null,()=>report);calendar.root.hidden=false;
const cell=kind=>months.innerHTML.match(new RegExp('data-cg-total="'+kind+'"[^>]*>([\\s\\S]*?)</td>'))[1];
const expectMinutes=(html,n)=>assert.match(html,new RegExp('>'+n.toLocaleString('pt-BR').replaceAll('.','\\.')+' min</strong>'));
calendar.render();
expectMinutes(cell('week-2'),162);expectMinutes(cell('month'),162);expectMinutes(cell('weekday-6'),12);
assert.match(cell('month'),/Soma dos dados disponíveis/);
assert.doesNotMatch(cell('month'),/>1\.998 min/,'Domingo e futuro não entram no calendário');
fields.Dia.value='2026-11-17';calendar.render();expectMinutes(cell('month'),50);
fields.Dia.value='';
for(const [unit,minutes] of [['10',72],['1',32],['2',5],['111',90],['1,2',72],['10,1,2',72],['10,111',162]]){
 fields.Unidade.value=unit;calendar.render();expectMinutes(cell('month'),minutes);
}
const saved=report.dias;report.dias=[];calendar.render();assert.match(cell('month'),/Paradas \(min\)<\/span><span>—/,'Ausência total permanece sem valor');report.dias=saved;

// Valores sintéticos semelhantes aos padrões mostrados pelo usuário. Os totais
// AN são fontes independentes: outubro tem diferença deliberada de 42 minutos.
const month=(m,t1,t2,an,ra)=>({mes:'2026-'+m,valores:values(t1,t2,an,ra),metas_paradas:{'1':600,'2':600,'10':1200,'111':600}});
const state={status:'ready',limit:'2026-11-23',rows:[],metas:[],pesos:[],turnosRows:[],turnosMedias:[],paradas:[month('08',1427,460,1887,100),month('09',1134,222,1356,null),month('10',1586,61,1689,null),month('11',774,null,952,null),month('12',999,999,999,999)],
 paradasDias:[day('16',999,100,999,10),day('17',999,78,999,20),day('17',999,78,999,20),day('24',999,999,999,999)]};
const periods=['2026-01','2026-08','2026-09','2026-10','2026-11','2026-12'];
assert.equal(app.productivityStopsPeriod(state,periods,'2').minutes,921,'Anual recupera meses disponíveis e dias do mês incompleto');
assert.equal(app.productivityStopsPeriod(state,periods,'1').minutes,4921,'Mensal numérico não é somado de novo aos dias');
assert.equal(app.productivityStopsPeriod(state,periods,'10').minutes,5884,'Consolidado AN não soma novamente seus turnos');
assert.equal(app.productivityStopsPeriod(state,periods,'111').minutes,130,'Real aproveita seus próprios dados disponíveis');
assert.equal(app.productivityStopsPeriod(state,['2026-11','2026-11'],'2').minutes,178,'Mês e datas repetidas não duplicam minutos');
assert.equal(app.productivityStopsPeriod(state,['2026-12'],'2').minutes,null,'Mês futuro não soma valores');
state.paradas[3].valores['2'][14]=0;
assert.equal(app.productivityStopsPeriod(state,['2026-11'],'2').minutes,0,'Zero mensal confirmado prevalece sobre fallback diário');
state.paradas[3].valores['2'][14]=null;
const box={innerHTML:'',scrollTop:0,scrollLeft:0,querySelector:()=>({style:{}})};
const monthly=app.createProductivityMonthly({querySelector:s=>s==='p'?{}:box,closest:()=>null},fields,()=>state,()=> '2026-11');monthly.render();
const cells=attr=>[...box.innerHTML.match(new RegExp('<tr[^>]*'+attr+'[^>]*>(.*?)</tr>'))[1].matchAll(/<td[^>]*>(.*?)<\/td>/g)].map(m=>m[1]);
const november=cells('data-cg-month-period="2026-11"');
for(const [i,n] of [[0,774],[1,178],[2,952],[3,30],[4,982]])expectMinutes(november[i],n);
const annual=cells('data-cg-total-year="2026"');
for(const [i,n] of [[0,4921],[1,921],[2,5884],[3,130],[4,6014]])expectMinutes(annual[i],n);
assert.match(annual[1],/Soma dos dados disponíveis/);
const january=cells('data-cg-month-period="2026-01"');assert.match(january[1],/Paradas \(min\).*<strong>—<\/strong>/,'Sem carga e sem minutos não inventa zero');
const unchanged=box.innerHTML;
for(const unit of ['10','1','2','111','10,111']){fields.Unidade.value=unit;fields.Mes.value='8';fields.Dia.value='2026-08-01';monthly.render();assert.equal(box.innerHTML,unchanged,'Mensal mantém as duas unidades e o ano completo');}
console.log('OK: paradas disponíveis em dias, semanas, dias da semana, mensal/anual; fallback diário; fontes independentes; zeros confirmados; D-1; filtros e ausência sem valores inventados.');
