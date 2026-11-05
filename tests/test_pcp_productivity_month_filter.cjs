// Seleção única no calendário, seleção múltipla preservada em Rendimento.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../assets/js/pcp-cirurgico.js'),'utf8');
const css=fs.readFileSync(path.join(__dirname,'../assets/css/pcp.css'),'utf8');
assert.match(css,/#cgMesMulti\.cg-month-single \.checkbox-option-all\{display:none\}/,'Selecionar tudo é ocultado só no modo de seleção única');
const PcpMulti={values:value=>String(value??'').split(',').filter(Boolean),includes:(value,item)=>!value||String(value).split(',').includes(String(item))};
let calendarRoot;
function element(){return {hidden:false,dataset:{},innerHTML:'',listeners:{},children:{},setAttribute(name,value){this[name]=value;},addEventListener(type,callback,capture){this.listeners[type]=callback;this.capture=capture;},querySelector(selector){return this.children[selector];},querySelectorAll(selector){return selector==='[data-cg-month]'?[{dataset:{cgMonth:'-1'}},{dataset:{cgMonth:'1'}}]:[];}};}
const document={
  createElement(tag){assert.notEqual(tag,'select','Reutiliza o mesmo menu; não cria seletor nativo');if(tag==='section')return calendarRoot;return element();},
  addEventListener(){}
};
class FixedDate extends Date{constructor(...args){super(...(args.length?args:['2026-10-29T15:00:00Z']));}}
const context={window:{},document,PcpMulti,Date:FixedDate,ApiScreen:{escape:String},Event:class{constructor(type){this.type=type;}}};
vm.runInNewContext(source.replace('return {mount};','return {mount,createProductivityMonthFilter,createProductivityUnitFilter,createProductivityCalendar};'),context);
const app=context.window.PcpCirurgico;
const multiHost=element(),classes=new Set();multiHost.classList={toggle(name,on){if(on)classes.add(name);else classes.delete(name);}};
const monthField={value:'1,2,3,4,5,6,7,8,9,10,11,12',innerHTML:'<option value="1">janeiro</option>',changes:[],after(){},dispatchEvent(event){this.changes.push({type:event.type,value:this.value});},pcpMulti:{field:{},controller:{getState:()=>({host:multiHost}),closeAll(){}}}};
const filter=app.createProductivityMonthFilter(monthField,()=> '10');
filter.sync('rendimento');assert.equal(multiHost.hidden,false);assert.equal(classes.has('cg-month-single'),false);
filter.sync('produtividade');assert.equal(monthField.value,'10');assert.equal(multiHost.hidden,false);assert.equal(classes.has('cg-month-single'),true);
assert.equal(multiHost.capture,true,'Intercepta a escolha antes do comportamento de seleção múltipla');
const choose=(value,all=false)=>{const event={target:{value,matches:()=>true,hasAttribute:()=>all},stopped:false,stopImmediatePropagation(){this.stopped=true;}};multiHost.listeners.change(event);return event;};
assert.equal(choose('9').stopped,true);assert.equal(monthField.value,'9');assert.deepEqual(monthField.changes,[{type:'change',value:'9'}]);
choose('2');assert.equal(monthField.value,'2','Nova escolha substitui a anterior');choose('9');assert.equal(monthField.value,'9');
choose('',true);assert.equal(monthField.value,'9','Selecionar tudo não pode ampliar a seleção em Produtividade');
monthField.value='1,2,3,4,5,6,7,8,9,10,11,12';filter.sync('produtividade');assert.equal(monthField.value,'9','Resposta anterior não volta a selecionar vários meses');
filter.sync('rendimento');assert.equal(monthField.value,'1,2,3,4,5,6,7,8,9,10,11,12','Restaura seleção anterior de Rendimento');
assert.equal(multiHost.hidden,false);assert.equal(classes.has('cg-month-single'),false);assert.equal(choose('4').stopped,false,'Não intercepta o menu em Rendimento');
monthField.value='3,5';filter.sync('produtividade');assert.equal(monthField.value,'5');filter.sync('rendimento');assert.equal(monthField.value,'3,5');
monthField.value='';filter.sync('produtividade');assert.equal(monthField.value,'10');filter.sync('rendimento');assert.equal(monthField.value,'');
monthField.value='4';filter.sync('produtividade');assert.equal(monthField.value,'4');monthField.value='10';filter.sync('produtividade');assert.equal(monthField.value,'10','Limpar filtros mantém um mês definido');

const unitHost=element(),unitClasses=new Set();unitHost.classList={toggle(name,on){if(on)unitClasses.add(name);else unitClasses.delete(name);}};
const unitField={value:'111,1',changes:[],dispatchEvent(event){this.changes.push(this.value);},pcpMulti:{field:{},controller:{getState:()=>({host:unitHost}),closeAll(){}}}};
const unitFilter=app.createProductivityUnitFilter(unitField);
unitFilter.sync('rendimento');assert.equal(unitField.value,'111,1');
unitFilter.sync('produtividade');assert.equal(unitField.value,'10','Ave Nova pré-selecionada');assert.equal(unitClasses.has('cg-unit-multiple'),true);
const chooseUnit=(value,checked=true,all=false)=>{const e={target:{value,checked,matches:()=>true,hasAttribute:()=>all},stopped:false,stopImmediatePropagation(){this.stopped=true;}};unitHost.listeners.change(e);return e;};
assert.equal(chooseUnit('111').stopped,true);assert.equal(unitField.value,'10,111','Empresas selecionadas em conjunto');
chooseUnit('1');assert.equal(unitField.value,'1,111','Turno substitui Ave Nova total, preservando Real');
chooseUnit('2');assert.equal(unitField.value,'10,111','Dois turnos se consolidam em Ave Nova');
chooseUnit('111',false);assert.equal(unitField.value,'10');
chooseUnit('2');assert.equal(unitField.value,'2');
chooseUnit('2',false);assert.equal(unitField.value,'10','Desmarcar última opção retorna ao padrão');
chooseUnit('',true,true);assert.equal(unitField.value,'10','Não amplia por Selecionar tudo');
unitField.value='';unitFilter.sync('produtividade');assert.equal(unitField.value,'10');
unitField.value='10,111';unitFilter.sync('produtividade');assert.equal(unitField.value,'10,111');
unitFilter.sync('rendimento');assert.equal(unitField.value,'111,1','Rendimento restaura sua seleção múltipla');assert.equal(unitClasses.has('cg-unit-multiple'),false);assert.equal(chooseUnit('111').stopped,false);
calendarRoot=element();calendarRoot.lastElementChild={append(){}};
const monthsHost=element();
calendarRoot.children={'.cg-production-months':monthsHost,'.cg-production-detail':element(),'.cg-production-notice':element()};
const fields={Ano:{value:'2025,2026',options:[{value:'2025'},{value:'2026'}]},Mes:{value:'1,2,3,4,5,6,7,8,9,10,11,12'},Dia:{value:''},Grupo:{value:''},Unidade:{value:''},SemanaCheia:{checked:false}};
const calendarState={status:'ready',limit:'2026-10-28',pesos:[{data:'2026-10-01',empresa_codigo:'10',peso_vivo:339866},{data:'2026-10-09',empresa_codigo:'10',peso_vivo:282001},{data:'2026-10-01',empresa_codigo:'111',peso_vivo:238560},{data:'2026-10-29',empresa_codigo:'10',peso_vivo:99999999}],rows:[
  {data:'2026-10-01',empresa_codigo:'10',empresa:'Ave Nova',quantidade_cabecas:114402},
  {data:'2026-10-01',empresa_codigo:'111',empresa:'Real Alimentos',quantidade_cabecas:78043},
  {data:'2026-10-04',empresa_codigo:'10',empresa:'Ave Nova',quantidade_cabecas:10}
]};
const calendar=app.createProductivityCalendar({prepend(){}},fields,()=>{},()=>false,()=>calendarState);
calendar.root.hidden=false;calendar.render();
assert.equal(calendar.periods().length,1,'Só um calendário, inclusive se Ano estiver múltiplo');
assert.equal((monthsHost.innerHTML.match(/<h3>/g)||[]).length,1,'Nunca empilha vários calendários');
assert.match(monthsHost.innerHTML,/<h3>Outubro de 2026 - Ave Nova<\/h3>/);
const dayCell=date=>new RegExp('<td[^>]*><button[^>]*data-cg-day="'+date+'"[\\s\\S]*?</td>').exec(monthsHost.innerHTML)?.[0];
assert.match(dayCell('2026-10-01'),/title="Ave Nova">A\.N\.<\/span><strong>114\.402/);
assert.doesNotMatch(dayCell('2026-10-01'),/R\.A\./,'Calendário inicia somente com Ave Nova');
assert.doesNotMatch(dayCell('2026-10-01'),/cg-day-metric|Provisório|1º A\.N\.|2º A\.N\./,'Só valores totais, sem colunas de turno');
assert.doesNotMatch(dayCell('2026-10-29'),/<strong>/,'D−1 continua impedindo valores após a data limite');
assert.equal(calendarRoot.children['.cg-production-notice'].hidden,true,'Subtítulo explicativo não aparece quando a consulta está pronta');
assert.match(monthsHost.innerHTML,/<abbr title="Segunda-feira">Seg/);
assert.doesNotMatch(monthsHost.innerHTML,/<abbr title="Domingo">|data-cg-day="2026-10-04"|data-cg-total="weekday-0"/,'Domingo é removido da grade e do rodapé');
const monthTotal=/data-cg-total="month"[^>]*>([\s\S]*?)<\/td>/.exec(monthsHost.innerHTML)[1];
assert.match(monthTotal,/114\.412/,'O total mensal não perde registros de domingos ocultos');
assert.match(dayCell('2026-10-01'),/Peso \(kg\).*339\.866/,'Peso diário no calendário');
assert.match(monthTotal,/Peso \(kg\).*621\.867/,'Soma mensal dos pesos');
assert.doesNotMatch(monthTotal,/99\.999\.999/,'Peso após D−1 excluído');
assert.match(dayCell('2026-10-09'),/Peso \(kg\).*282\.001/,'Peso disponível mesmo sem registro de aves no fixture');
assert.match(monthsHost.innerHTML,/<span title="Ave Nova">A\.N\.<\/span>/,'Totais também usam siglas');
calendarState.metas=[{indicador_codigo:'PROD_AN_T1_QUI',referencia_mes:'2026-10-01',valor_meta:65000,ativo:true},{indicador_codigo:'PROD_AN_T2_QUI',referencia_mes:'2026-10-01',valor_meta:45000,ativo:true},{indicador_codigo:'PROD_RA_QUI',referencia_mes:'2026-10-01',valor_meta:80000,ativo:true}];
calendar.render();
assert.match(dayCell('2026-10-01'),/<strong class="cg-prod-good"[^>]*>114\.402/);
assert.doesNotMatch(dayCell('2026-10-01'),/78\.043/);
const coloredTotal=/data-cg-total="month"[^>]*>([\s\S]*?)<\/td>/.exec(monthsHost.innerHTML)[1];
assert.match(coloredTotal,/<strong class="cg-prod-good"[^>]*>114\.412/);
assert.doesNotMatch(coloredTotal,/78\.043/);
assert.match(dayCell('2026-10-01'),/>Meta<\/span><span>110\.000<\/span>/);
assert.match(dayCell('2026-10-01'),/class="cg-prod-good">\+4\.402<\/strong>/);
assert.match(coloredTotal,/>Meta<\/span><span>110\.000<\/span>/);
assert.match(coloredTotal,/class="cg-prod-good">\+4\.412<\/strong>/);
const coloredWeek=/data-cg-total="week-0"[^>]*>([\s\S]*?)<\/td>/.exec(monthsHost.innerHTML)[1];
assert.match(coloredWeek,/class="cg-prod-good">\+4\.402<\/strong>/);assert.match(coloredWeek,/Peso \(kg\).*339\.866/);
const coloredWeekday=/data-cg-total="weekday-4"[^>]*>([\s\S]*?)<\/td>/.exec(monthsHost.innerHTML)[1];
assert.match(coloredWeekday,/>Meta<\/span><span>110\.000<\/span>/);
calendarRoot.listeners.click({target:{closest:selector=>selector==='[data-cg-day]'?{dataset:{cgDay:'2026-10-01'},disabled:false}:null}});
assert.match(calendarRoot.children['.cg-production-detail'].innerHTML,/class="cg-prod-good">\+4\.402<\/strong>/);assert.match(calendarRoot.children['.cg-production-detail'].innerHTML,/Peso \(kg\).*339\.866/);
calendarState.metas=[];calendar.render();
fields.Unidade.value='111';calendar.render();assert.match(monthsHost.innerHTML,/<h3>Outubro de 2026 - Real Alimentos<\/h3>/);
assert.match(dayCell('2026-10-01'),/R\.A\.<\/span><strong>78\.043/);
assert.doesNotMatch(dayCell('2026-10-01'),/A\.N\.<\/span><strong>/,'Filtro de unidade respeitado nos totais do dia');
fields.Unidade.value='';fields.Dia.value='2026-10-02';calendar.render();
assert.doesNotMatch(dayCell('2026-10-01'),/<strong>/,'Dia fora do filtro não exibe valores');
fields.Dia.value='';
fields.Mes.value='6';calendar.render();assert.match(monthsHost.innerHTML,/junho de 2026/);assert.equal((monthsHost.innerHTML.match(/<h3>/g)||[]).length,1);
fields.Ano.value='2025';fields.Mes.value='';calendar.render();assert.match(monthsHost.innerHTML,/outubro de 2025/);assert.equal(calendar.periods().length,1);
filter.sync('rendimento');monthField.value='1,3,6';filter.sync('produtividade');
fields.Ano.value='2026';fields.Mes=monthField;monthField.value='10';filter.sync('produtividade');
const navCalendar=app.createProductivityCalendar({prepend(){}},fields,({year,month})=>{
  fields.Ano.value=String(year);monthField.value=String(month);filter.sync('produtividade');navCalendar.render();
},()=>false,()=>({status:'ready',limit:'2026-10-28',rows:[]}));
navCalendar.root.hidden=false;navCalendar.render();
const clickArrow=direction=>calendarRoot.listeners.click({target:{closest:selector=>selector==='[data-cg-month]'?{dataset:{cgMonth:String(direction)},disabled:false}:null}});
clickArrow(1);assert.equal(multiHost.hidden,false);assert.equal(monthField.value,'11');assert.match(monthsHost.innerHTML,/novembro de 2026/);
clickArrow(-1);assert.equal(monthField.value,'10');assert.match(monthsHost.innerHTML,/outubro de 2026/);
monthField.value='1';filter.sync('produtividade');navCalendar.render();clickArrow(-1);
assert.equal(fields.Ano.value,'2025');assert.equal(monthField.value,'12');assert.match(monthsHost.innerHTML,/dezembro de 2025/);
filter.sync('rendimento');assert.equal(monthField.value,'1,3,6');assert.equal(classes.has('cg-month-single'),false);assert.equal(multiHost.hidden,false);
console.log('OK: um único mês/calendário em Produtividade, mudança e limpeza do filtro e multisseleção de Rendimento preservada.');
console.log('OK: campo Mês visível em Produtividade e sincronizado com as setas, inclusive na virada do ano.');
console.log('OK: totais abreviados por dia, sem turnos provisórios nem domingos na grade, subtítulos ocultos e totais reais preservados.');
