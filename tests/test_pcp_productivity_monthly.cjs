// Testes do mensal pivotado, sem API ou banco reais.
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../assets/js/pcp-cirurgico.js'),'utf8');
const observers=[];
const box={clientWidth:450,scrollTop:0,scrollLeft:0,html:'',set innerHTML(html){this.html=html;this.scrollTop=0;this.table=html.includes('<table')?{style:{}}:null;},get innerHTML(){return this.html;},querySelector(){return this.table;}};
const status={textContent:''};
const host={innerHTML:'',hidden:false,querySelector:selector=>selector==='p'?status:box,closest(){return this.hidden?this:null;}};
const PcpMulti={values:value=>String(value??'').split(',').filter(Boolean),includes:(value,item)=>!value||String(value).split(',').includes(String(item))};
const context={window:{},ApiScreen:{escape:String},PcpMulti,requestAnimationFrame:callback=>callback(),ResizeObserver:class{constructor(callback){observers.push(callback);}observe(){}}};
vm.runInNewContext(source.replace('return {mount};','return {mount,createProductivityMonthly};'),context);
const fields={Ano:{value:'2026',options:[{value:'2025'},{value:'2026'}]},Mes:{value:'2'},Dia:{value:'2026-02-01'},SemanaCheia:{checked:true},Grupo:{value:''},Unidade:{value:''}};
let state={status:'ready',limit:'2026-10-27',pesos:[{data:'2026-01-01',empresa_codigo:'10',peso_vivo:100},{data:'2026-01-02',empresa_codigo:'10',peso_vivo:250},{data:'2026-10-27',empresa_codigo:'10',peso_vivo:300},{data:'2026-10-28',empresa_codigo:'10',peso_vivo:99999999}],rows:[
 {data:'2026-01-01',empresa_codigo:'10',quantidade_cabecas:1},{data:'2026-01-02',empresa_codigo:'10',quantidade_cabecas:2},
 {data:'2026-01-02',empresa_codigo:'111',quantidade_cabecas:5},{data:'2026-10-27',empresa_codigo:'10',quantidade_cabecas:100},
 {data:'2026-10-27',empresa_codigo:'111',quantidade_cabecas:0},{data:'2026-10-28',empresa_codigo:'10',quantidade_cabecas:999999}
]};
const monthly=context.window.PcpCirurgico.createProductivityMonthly(host,fields,()=>state,()=> '2026-10');
monthly.render();
assert.equal(status.hidden,true);assert.equal(monthly.periods().length,12);
assert.deepEqual(Array.from(monthly.periods(),p=>p.month),[1,2,3,4,5,6,7,8,9,10,11,12]);
assert.match(box.innerHTML,/<th scope="col">Mês<\/th><th scope="col">Ave Nova<\/th><th scope="col">Real Alimentos<\/th>/);
assert.equal((box.innerHTML.match(/data-cg-month-period=/g)||[]).length,12);
assert.equal((box.innerHTML.match(/<td(?: |>|\n)/g)||[]).length,39);
assert.match(box.innerHTML,/3<\/strong> <small>aves/);assert.match(box.innerHTML,/100<\/strong> <small>aves/);
assert.match(box.innerHTML,/0<\/strong> <small>aves/);assert.doesNotMatch(box.innerHTML,/999\.999/);
assert.match(box.innerHTML,/Peso \(kg\).*<strong>350<\/strong>/);assert.match(box.innerHTML,/Peso \(kg\).*<strong>300<\/strong>/);assert.doesNotMatch(box.innerHTML,/99\.999\.999/);
assert.match(box.innerHTML,/2026-10" class="cg-monthly-current"/);
const november=box.innerHTML.match(/<tr data-cg-month-period="2026-11"[^>]*>(.*?)<\/tr>/)[1];
assert.doesNotMatch(november,/<strong>0<\/strong>/,'Mês futuro sem base não é zero');assert.match(november,/—/);
assert.equal(box.table.style.width,'100%');assert.equal(box.scrollTop,0);
box.scrollTop=170;
state.metas=[{indicador_codigo:'PROD_AN_T1_TER',referencia_mes:'2026-10-01',valor_meta:50,ativo:true},{indicador_codigo:'PROD_AN_T2_TER',referencia_mes:'2026-10-01',valor_meta:50,ativo:true},{indicador_codigo:'PROD_RA_TER',referencia_mes:'2026-10-01',valor_meta:80,ativo:true}];
monthly.render();assert.equal(box.scrollTop,170,'Atualização conserva a rolagem vertical');
assert.match(box.innerHTML,/<strong class="cg-prod-good"[^>]*>100/);assert.match(box.innerHTML,/<strong class="cg-prod-bad"[^>]*>0/);
assert.match(box.innerHTML,/>Meta<\/span><span>100<\/span>/);assert.match(box.innerHTML,/class="cg-prod-good">0<\/strong>/);assert.match(box.innerHTML,/class="cg-prod-bad">-80<\/strong>/);
const html=box.innerHTML;
fields.Mes.value='9';fields.Dia.value='2026-09-01';fields.SemanaCheia.checked=false;monthly.render();
assert.equal(box.innerHTML,html,'Mês, dia e semana cheia preservam o mensal');assert.equal(box.scrollTop,170);
for(const unit of ['10','1','2','111','both']){
 fields.Unidade.value=unit;monthly.render();assert.equal(box.innerHTML,html,'Unidade / Turno '+unit+' não altera os 12 meses, empresas e totais do acumulado');
}
fields.Unidade.value='';monthly.render();assert.equal(box.innerHTML,html);
monthly.resetPosition();assert.equal(box.scrollTop,0);
box.clientWidth=320;observers[0]();assert.equal(box.table.style.width,'100%');
fields.Grupo.value='familias';monthly.render();assert.doesNotMatch(box.innerHTML,/100<\/strong> <small>aves/);assert.match(status.textContent,/Produção e perdas/);
fields.Grupo.value='producao';monthly.render();assert.match(box.innerHTML,/100<\/strong> <small>aves/);
fields.Ano.value='2025';monthly.render();assert.equal(monthly.periods().length,12);assert.match(box.innerHTML,/2025/);assert.doesNotMatch(box.innerHTML,/100<\/strong> <small>aves/);
fields.Ano.value='';monthly.render();assert.equal(monthly.periods().length,24);
fields.Ano.value='2027';monthly.render();assert.equal(monthly.periods().length,0);assert.match(box.innerHTML,/Sem meses/);
fields.Ano.value='2026';state={status:'loading',limit:'2026-10-27',rows:[]};monthly.render();assert.match(status.textContent,/Consultando/);assert.equal(status.hidden,false);
state={status:'error',limit:'2026-10-27',rows:[]};monthly.render();assert.match(status.textContent,/Não foi possível/);assert.equal(status.hidden,false);

module.exports=(async()=>{
  fields.Unidade.value='';
  const pending=[],turnQueries=[];let renders=0;
  const controllerState={
    indicatorMode:'produtividade',data:{data_limite:'2026-10-27'},loading:false,
    fields,monthlyKey:'',monthlyGeneration:0,monthlyController:null,monthlyState:{status:'idle',rows:[]},
    monthly:{periods:()=>[{year:2026,month:1},{year:2026,month:10}],render(){renders++;}},PcpMulti,apiGet(){},
    AbortController:class{constructor(){this.signal={aborted:false};}abort(){this.signal.aborted=true;}},
    productivityTargets:{load:async()=>[]},productivityWeight:{load:async()=>[]},
    productivityHeads:{load(get,periods,units,signal,fullWeek,limit,totalSource){if(totalSource!=='diario'){turnQueries.push({periods,units,signal,fullWeek,limit,totalSource});return Promise.resolve([]);}return new Promise((resolve,reject)=>pending.push({periods,units,signal,fullWeek,limit,totalSource,resolve,reject}));}}
  };
  const controller=source.slice(source.indexOf('  async function refreshMonthly('),source.indexOf('  const dialog='));
  vm.runInNewContext(controller,controllerState);
  const first=controllerState.refreshMonthly();assert.equal(pending.length,1);assert.equal(pending[0].fullWeek,false);assert.equal(pending[0].limit,'2026-10-27');
  assert.equal(pending[0].units,'');assert.equal(pending[0].totalSource,'diario','O mensal usa o diário comum para os totais da Ave Nova');
  pending[0].resolve([]);await first;assert.equal(turnQueries.length,1);assert.equal(turnQueries[0].units,'10','Detalhes sempre consultam os dois turnos da Ave Nova');assert.equal(controllerState.monthlyState.turnosStatus,'ready');
  fields.Mes.value='6';fields.Dia.value='2026-06-10';fields.SemanaCheia.checked=true;
  await controllerState.refreshMonthly();assert.equal(pending.length,1,'Mês, dia e semana cheia não geram nova consulta mensal');
  for(const unit of ['10','1','2','111','both']){fields.Unidade.value=unit;await controllerState.refreshMonthly();assert.equal(pending.length,1,'Unidade / Turno não restringe nem repete a consulta mensal');}
  const second=controllerState.refreshMonthly(true);assert.equal(pending[1].units,'');
  const third=controllerState.refreshMonthly(true);assert.equal(pending[1].signal.aborted,true);assert.equal(pending[2].units,'');
  pending[1].resolve([{data:'antigo'}]);await second;assert.equal(controllerState.monthlyState.status,'loading');
  pending[2].resolve([]);await third;assert.equal(controllerState.monthlyState.status,'ready');
  controllerState.indicatorMode='rendimento';await controllerState.refreshMonthly();assert.equal(pending.length,3,'Rendimento não consulta o novo acumulado');
  controllerState.indicatorMode='produtividade';fields.Grupo.value='familias';await controllerState.refreshMonthly();assert.equal(pending.length,3,'Grupo incompatível não consulta aves');
  fields.Grupo.value='';controllerState.data=null;await controllerState.refreshMonthly();assert.equal(pending.length,3,'Sem limite D−1 não consulta');
  console.log('OK: tabela mensal pivotada, somas D−1, unidades, ano, filtros independentes, meses de janeiro a dezembro, responsividade e cancelamento de consultas.');
})();
