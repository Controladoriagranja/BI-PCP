// Metas e aderência: transporte simulado, sem acesso ao banco/API real.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const root=path.join(__dirname,'..'),source=fs.readFileSync(path.join(root,'assets/js/pcp-cirurgico.js'),'utf8');
const element=()=>({hidden:false,innerHTML:'',addEventListener(){},querySelectorAll:()=>[],lastElementChild:{append(){}}});
const monthsHost=element(),detail=element(),notice=element(),calendarRoot=element();
calendarRoot.querySelector=s=>({'.cg-production-months':monthsHost,'.cg-production-detail':detail,'.cg-production-notice':notice}[s]);
const PcpMulti={values:v=>String(v||'').split(',').filter(Boolean),includes:(v,x)=>!v||String(v).split(',').includes(String(x))};
const context={window:{},ApiScreen:{escape:String},PcpMulti,
 document:{createElement:tag=>tag==='section'?calendarRoot:element(),addEventListener(){}},
 requestAnimationFrame:fn=>fn(),ResizeObserver:class{observe(){}}};
vm.runInNewContext(source.replace('return {mount};','return {mount,productivityTargets,productivityAbate,productivityReferenceMarkup,createProductivityCalendar,createProductivityMonthly};'),context);
const app=context.window.PcpCirurgico,targets=app.productivityTargets;
const suffix=['SEG','TER','QUA','QUI','SEX','SAB'];
const base={AN_T1:[65000,65000,65000,65000,65000,60000],AN_T2:[55000,55000,50000,45000,45000,null],RA:[80000,80000,80000,80000,80000,60000]};
const goals=month=>Object.entries(base).flatMap(([series,values])=>values.flatMap((value,i)=>value==null?[]:[{indicador_codigo:'PROD_'+series+'_'+suffix[i],referencia_mes:month+'-01',valor_meta:value,ativo:true}]));
const metas=[...goals('2026-11'),...goals('2026-10'),...goals('2025-12')];
const row=(date,turnos,company='10',value=Object.values(turnos).reduce((a,b)=>a+b,0))=>({data:date,empresa_codigo:company,empresa:company==='10'?'Ave Nova':'Real Alimentos',quantidade_cabecas:value,...(company==='10'?{turnos}:{})});
const grade=(r,units='10',extra={})=>targets.grade('10',Array.isArray(r)?r:[r],metas,units,extra);
const plain=v=>JSON.parse(JSON.stringify(v));
const first=row('2026-11-20',{'1':58000});
assert.equal(grade(first).meta,60000,'Sexta apenas 1T usa sábado, sem fixar o valor no código');
assert.equal(grade({...first,turnos:{'1':58000,'2':0}}).meta,60000,'2T zero equivale a ausente');
assert.equal(grade({...first,turnos:{'1':58000,'2':1}}).meta,110000,'Produção positiva no 2T mantém metas normais');
assert.equal(grade({...first,turnos:{'1':58000,'2':1}},'1').meta,65000,'Filtrar 1T não elimina evidência do 2T');
assert.equal(grade({...first,quantidade_cabecas:0},'2').meta,0,'Turno sem produção não recebe meta');
assert.equal(grade(row('2026-11-23',{'2':56000})).meta,55000,'Somente 2T usa a meta cadastrada do 2T para o dia');
assert.equal(grade(row('2026-11-21',{'1':58000})).meta,60000,'Sábado normal preservado');
assert.deepEqual(plain(grade(row('2026-11-21',{'1':0,'2':0}))),{className:'',meta:0},'Dia sem produção neutro');
assert.equal(grade([first,first]).meta,60000,'A mesma empresa/data não duplica meta');
assert.equal(grade(first,'1,2').meta,60000,'Dois turnos normalizados não duplicam meta');
assert.equal(grade(first,'10,1,2').meta,60000,'Empresa e turnos simultâneos não duplicam meta');
const common={...first};delete common.turnos;
assert.equal(grade(common).meta,null,'Não inferir turno ausente de uma fonte sem turnos');
assert.equal(grade(common,'10',{turnosRows:[first],limit:'2026-11-23'}).meta,60000,'Mensal usa evidência dos turnos e mantém produção do diário comum');
assert.equal(grade(common,'10',{turnosRows:[first],turnosStatus:'error'}).meta,null,'Falha na carga não vira ausência de produção');
assert.equal(targets.grade('10',[first],metas.filter(m=>m.indicador_codigo!=='PROD_AN_T1_SAB'),'10').meta,null,'Não substitui meta de sábado faltante por valor fixo');
assert.equal(grade(row('2026-11-24',{'1':999999}),'10',{limit:'2026-11-23'}).meta,0,'Futuro não entra no acumulado');
const changedGoals=metas.map(m=>m.indicador_codigo==='PROD_AN_T1_SAB'?{...m,valor_meta:61000}:m);
assert.equal(targets.grade('10',[first],changedGoals,'10').meta,61000,'Valor é dinâmico da tabela metas');
for(const date of ['2025-12-29','2026-10-01','2026-11-20'])assert.equal(grade(row(date,{'1':58000})).meta,60000,'Regra não depende da data de exemplo');
for(const [value,meta,expected,color] of [[0,0,0,''],[58000,60000,58000/60000*100,'cg-prod-bad'],[60000,60000,100,'cg-prod-good'],[63000,60000,105,'cg-prod-good'],[100,0,0,'']]){
 const rating=targets.rating(value,meta),metrics=app.productivityAbate(value,rating);
 assert.equal(metrics.difference,value-meta);assert.equal(metrics.adherence,expected);assert.equal(rating.className,color);
 const markup=app.productivityReferenceMarkup(value,rating);
 assert.match(markup,/Aves Abat vs Meta/);assert.doesNotMatch(markup,/NaN|Infinity/);
 if(meta===0)assert.match(markup,/cg-prod-adherence"><span>Aves Abat vs Meta<\/span><strong>0,00%/);
}
assert.match(app.productivityReferenceMarkup(58000,grade(first)),/>96,67%/,'Arredondamento somente na apresentação');
assert.equal(app.productivityAbate(100,targets.rating(100,null)).adherence,null,'Referência indisponível permanece indisponível');
const ra=row('2026-11-20',{},'111',56664),raRating=targets.grade('111',[ra],metas,'111');
assert.equal(raRating.meta,80000,'Orientação posterior do usuário: manter metas da Real');
assert.match(app.productivityReferenceMarkup(56664,raRating),/>70,83%/);

// Semana 47 e novembro sintéticos: as quantidades AN são exemplos de teste.
// Somente os números RA 20/11 e semana 47 foram fornecidos pelo usuário.
const production=[row('2026-11-16',{'1':65000,'2':55000}),row('2026-11-17',{'1':60000,'2':50000}),row('2026-11-18',{'1':70000,'2':50000}),row('2026-11-19',{'1':59000,'2':0}),first,row('2026-11-21',{'1':0}),row('2026-11-23',{'2':56000}),row('2026-11-24',{'1':999999})];
const real=[80000,80000,75000,77006,56664].map((value,i)=>row('2026-11-'+(16+i),{},'111',value));
const weights=[...production,...real].map(r=>({data:r.data,empresa_codigo:r.empresa_codigo,peso_vivo:r.quantidade_cabecas*3}));
const fields={Ano:{value:'2026',options:[{value:'2026'}]},Mes:{value:'11'},Dia:{value:''},Unidade:{value:'10'},Grupo:{value:''},SemanaCheia:{checked:false}};
let state;
const calendar=app.createProductivityCalendar({prepend(){}},fields,()=>{},()=>false,()=>state);calendar.root.hidden=false;
const matchDay=date=>monthsHost.innerHTML.match(new RegExp('<button[^>]*data-cg-day="'+date+'"[\\s\\S]*?</button>'))[0];
const total=kind=>monthsHost.innerHTML.match(new RegExp('data-cg-total="'+kind+'"[^>]*>([\\s\\S]*?)</td>'))[1];
function expectMeta(html,value){assert.match(html,new RegExp('>Meta</span><span>'+value.toLocaleString('pt-BR').replaceAll('.','\\.')+'</span>'));}
for(const [unit,expected] of [['10',60000],['1',60000],['2',0],['111',80000],['10,111',140000]]){
 fields.Unidade.value=unit;
 const companies=unit==='111'?real:unit==='10,111'?[...production,...real]:production.map(r=>unit==='1'||unit==='2'?{...r,quantidade_cabecas:r.turnos[unit]??0}:r);
 state={status:'ready',limit:'2026-11-23',metas,rows:companies,pesos:weights};calendar.render();
 if(unit!=='2')expectMeta(matchDay('2026-11-20'),expected);
 assert.doesNotMatch(matchDay('2026-11-21'),/cg-production-heads|cg-production-day-weight|cg-calendar-mean|cg-prod-reference|cg-production-empty/,'Dia sem produção somente com a data');
 assert.doesNotMatch(matchDay('2026-11-24'),/999\.999|>0,00%/,'Futuro permanece sem indicadores');
 if(unit==='10'){
  expectMeta(total('week-2'),475000);expectMeta(total('month'),530000);
  assert.match(total('week-2'),/>98,32%/);assert.match(total('month'),/>98,68%/);
  expectMeta(total('weekday-5'),60000);
 }
 if(unit==='111'){expectMeta(total('week-2'),400000);assert.match(total('week-2'),/>92,17%/);}
 if(unit==='10,111'){expectMeta(total('week-2'),875000);assert.match(total('week-2'),/>95,51%/);}
}

// Acumulado anual mantém as duas empresas e o diário comum para os realizados.
const box={innerHTML:'',scrollTop:0,scrollLeft:0,querySelector:()=>({style:{}})},status={};
const monthlyData={medias:[],turnosMedias:[],status:'ready',turnosStatus:'ready',limit:'2026-11-23',metas,rows:[...production.map(({turnos,...r})=>r),...real],turnosRows:production,pesos:weights,turnosPesos:[]};
const monthly=app.createProductivityMonthly({querySelector:s=>s==='p'?status:box,closest:()=>null},fields,()=>monthlyData,()=> '2026-11');
monthly.render();
const monthlyCells=attribute=>[...box.innerHTML.match(new RegExp('<tr[^>]*'+attribute+'[^>]*>(.*?)</tr>'))[1].matchAll(/<td[^>]*>(.*?)<\/td>/g)].map(m=>m[1]);
const november=monthlyCells('data-cg-month-period="2026-11"');
assert.equal(november.length,5);expectMeta(november[0],315000);expectMeta(november[1],215000);expectMeta(november[2],530000);expectMeta(november[3],400000);expectMeta(november[4],930000);
assert.match(november[2],/>98,68%/);assert.match(november[4],/>95,88%/);
const annual=monthlyCells('data-cg-total-year="2026"');expectMeta(annual[2],530000);expectMeta(annual[4],930000);
const future=monthlyCells('data-cg-month-period="2026-12"');assert.match(future[2],/cg-monthly-quantity">—/);assert.doesNotMatch(future[2],/>0,00%/);
assert.doesNotMatch(box.innerHTML,/999\.999/);
const unchanged=box.innerHTML;
for(const unit of ['10','1','2','111','10,111']){fields.Unidade.value=unit;fields.Mes.value='10';fields.Dia.value='2026-10-01';fields.SemanaCheia.checked=true;monthly.render();assert.equal(box.innerHTML,unchanged,'Acumulado permanece independente do calendário');}
monthlyData.medias=production.map(r=>({data:r.data,empresa_codigo:'10',quantidade_cabecas:3.125}));monthlyData.rows=monthlyData.rows.filter(r=>r.empresa_codigo==='10');monthly.render();
assert.match(monthlyCells('data-cg-month-period="2026-11"')[4],/Peso médio \(kg\)<\/span><strong>3,125/,'Empresa sem produção não invalida média ponderada da outra');
const precise=app.productivityAbate(467000,targets.rating(467000,475000)).adherence;
assert.equal(precise,467000/475000*100,'Aderência acumulada usa razão das somas, sem média de percentuais');

// O controlador real precisa carregar ambos os turnos mesmo com filtro 1T/2T.
module.exports=(async()=>{
 const controllerState={indicatorMode:'produtividade',data:{data_limite:'2026-11-23'},fields:{...fields,Unidade:{value:'1'}},headsKey:'',headsGeneration:0,headsController:null,headsState:{status:'idle'},loading:false,
  selectedHeadCompanies:()=>['10'],selectedHeadTurns:()=>['1'],productivity:{periods:()=>[{year:2026,month:11}],render(){}},apiGet(){},
  AbortController:class{constructor(){this.signal={aborted:false};}abort(){this.signal.aborted=true;}},
  productivityTargets:{load:async()=>metas},productivityWeight:{load:async()=>weights},
  productivityHeads:{async load(get,periods,units,signal,fullWeek,limit,totalSource,metric){if(metric)return [];assert.equal(units,'10','Consulta completa para decidir a meta');return [row('2026-11-20',{'1':58000,'2':50000})];}}};
 const controller=source.slice(source.indexOf('  async function refreshHeads('),source.indexOf('  async function refreshMonthly('));
 vm.runInNewContext(controller,controllerState);await controllerState.refreshHeads();
 assert.equal(controllerState.headsState.rows[0].quantidade_cabecas,58000);
 assert.equal(controllerState.headsState.rows[0].turnos['2'],50000);
 assert.equal(grade(controllerState.headsState.rows,'1').meta,65000,'Filtro 1T mantém meta normal quando 2T produziu');
 console.log('OK: metas corrigidas AN, Real preservada, filtros independentes, zeros, D-1, históricos, semanas, meses, anual, aderência e ausência de duplicidade.');
})();
