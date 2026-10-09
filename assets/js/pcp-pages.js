"use strict";
(async () => {
 const $=id=>document.getElementById(id), esc=ApiScreen.escape, fmt=ApiScreen.number;
 const names={diario_industria:'Diário da indústria',diario_industria_turnos:'Diário por turnos',estoque_online:'Estoque online',plano_producao:'Plano de produção',estoque_por_transacao:'Estoque por transação',movimento_geral_pesagem:'Movimento geral / pesagens',condenacoes:'Condenações',devolucao:'Devoluções',desperdicio:'Desperdício'};
 const date=value=>value?String(value).slice(0,10).split('-').reverse().join('/'):'—';
 const timestamp=value=>value?new Date(value).toLocaleString('pt-BR',{timeZone:'America/Sao_Paulo'}):'Não informada';
 const numeric=type=>['double precision','numeric','real','integer','bigint','smallint'].includes(type);
 function chartLayout(id){
  const el=document.getElementById(id);const chart=el&&window.echarts?.getInstanceByDom(el);if(!chart)return;
  chart.setOption({grid:{left:el.clientWidth<500?76:86,right:22,bottom:42}});
 }
 function resizeCharts(){document.querySelectorAll('.pcp-chart').forEach(el=>chartLayout(el.id));}
 window.addEventListener('resize',()=>requestAnimationFrame(resizeCharts));
 document.addEventListener('dashboard:theme-changed',()=>requestAnimationFrame(resizeCharts));
 const page=document.body.dataset.page;let generation=0,abort,loading=false,metadata=[],available=null,controller,dataPage=1;
 function error(e){$('mensagemErro').textContent=e.message;$('mensagemErro').classList.remove('hidden');$('estadoConsulta').textContent='Consulta não concluída. Nenhum valor anterior foi mantido.';}
 function card(label,value,note=''){return '<article class="card pcp-kpi"><span>'+esc(label)+'</span><strong>'+esc(value)+'</strong><small>'+esc(note)+'</small></article>';}
 if(page==='formulas'){
  try{if(!APP_CONFIG.endpoints.medidas)throw Error('A API existente não fornece um endpoint de fórmulas. As expressões originais estão disponíveis em Mais detalhes nas páginas do relatório.');const result=await apiGet(APP_CONFIG.endpoints.medidas);if(!Array.isArray(result.medidas))throw Error('Contrato de fórmulas PCP indisponível.');
   $('ultimaAtualizacao').textContent='Modelo oficial PCP';
   function render(){const text=$('buscarFormula').value.toLocaleLowerCase('pt-BR');const rows=result.medidas.filter(m=>(m.nome+' '+m.tabela).toLocaleLowerCase('pt-BR').includes(text));$('estadoConsulta').textContent=rows.length+' expressões oficiais · a execução com a API deve ser validada por indicador';$('pcpConteudo').innerHTML=rows.map(m=>'<article class="card pcp-formula"><h3>'+esc(m.nome)+'</h3><p>'+esc(m.tabela)+'</p><details><summary>Ver expressão original</summary><pre>'+esc(Array.isArray(m.expressao)?m.expressao.join('\n'):m.expressao)+'</pre></details></article>').join('');}
   $('buscarFormula').oninput=render;render();
  }catch(e){error(e);}return;
 }
 const tables=document.body.dataset.pcpTables.split(',');
 $('tabela').innerHTML=tables.map(t=>'<option value="'+t+'">'+esc(names[t])+'</option>').join('');
 const incoming=new URLSearchParams(location.search);if(tables.includes(incoming.get('tabela')))$('tabela').value=incoming.get('tabela');
 const currentTable=()=>$('tabela').value;
 const scopes=()=>available.escopos||[];
 const fields=['ano','mes','empresa','unidade','secao','transacao'];
 function options(){
  const selected=controller?.values()||{};const companies=selected.empresa||[];
  const list=scopes().filter(r=>!companies.length||companies.includes(r.empresa_codigo));
  const from=available.periodo?.inicio,to=available.periodo?.fim;
  const years=from&&to?Array.from({length:Number(to.slice(0,4))-Number(from.slice(0,4))+1},(_,i)=>Number(from.slice(0,4))+i):[];
  const units=new Map();list.forEach(r=>units.set(r.unidade_codigo,r.unidade_codigo+(r.empresa?' · '+r.empresa:'')));
  return {ano:years,mes:Array.from({length:12},(_,i)=>i+1),empresa:[...new Set(scopes().map(s=>s.empresa_codigo))],unidade:[...units].map(([value,label])=>({value,label})),secao:available.opcoes?.secao||[],transacao:available.opcoes?.transacao||[]};
 }
 controller=new FilterController({fields:fields.map(id=>({id,apiKey:id,multi:true,search:true})),optionsProvider:async()=>options(),includeDependentRefresh:false,onChange:async()=>{dataPage=1;await controller.loadOptions({preserve:true});await refresh();}});
 const normalize=controller.normalizeOptions.bind(controller);
 controller.normalizeOptions=(field,raw)=>['empresa','unidade'].includes(field.apiKey)?raw.map(r=>typeof r==='object'?{value:String(r.value),label:String(r.label)}:{value:String(r),label:String(r)}):normalize(field,raw);
 controller.register();
 async function setup(){
  const id=++generation;abort?.abort();$('pcpConteudo').replaceChildren();$('mensagemErro').classList.add('hidden');$('estadoConsulta').textContent='Carregando filtros…';
  try{const result=await apiGet(APP_CONFIG.endpoints.filtros,{tabela:currentTable()});if(id!==generation)return;available=result;
   fields.forEach(k=>controller.set(k,[]));await controller.loadOptions({preserve:false});
   if(available.periodo?.fim){controller.set('ano',[available.periodo.fim.slice(0,4)]);controller.set('mes',[String(Number(available.periodo.fim.slice(5,7)))]);}
   const sections=available.opcoes?.secao||[];if(sections.includes('Produção'))controller.set('secao',['Produção']);if(sections.includes('Estoque'))controller.set('secao',['Estoque']);
   if(incoming.get('inicio')){const start=incoming.get('inicio'),end=incoming.get('fim');controller.set('ano',[start.slice(0,4)]);controller.set('mes',end&&start.slice(0,7)===end.slice(0,7)?[String(Number(start.slice(5,7)))]:[]);}
   for(const key of ['empresa','unidade','secao','transacao'])if(incoming.get(key))controller.set(key,[incoming.get(key)]);
   $('secao-field').classList.toggle('hidden',!sections.length);$('transacao-field').classList.toggle('hidden',!available.opcoes?.transacao?.length);
   await refresh();
  }catch(e){if(id===generation)error(e);}
 }
 function contexts(){
  const value=controller.values(),base={tabela:currentTable(),pagina:dataPage,tamanho:25};let result=[base];
  const years=value.ano||[],months=value.mes||[];
  if(years.length||months.length){
   const ys=years.length?years:options().ano;result=[];
   for(const y of ys)for(const m of (months.length?months:[null])){
    const month=m?Number(m):1;const last=m?new Date(Number(y),month,0).getDate():31;
    result.push({...base,inicio:y+'-'+String(month).padStart(2,'0')+'-01',fim:y+'-'+(m?String(month).padStart(2,'0'):'12')+'-'+String(last).padStart(2,'0')});
   }
  }
  for(const key of ['empresa','unidade','secao','transacao'])if(value[key]?.length)result=result.flatMap(r=>value[key].map(v=>({...r,[key]:v})));
  return result;
 }
 async function refresh(){
  if(!available)return setup();const id=++generation;abort?.abort();abort=new AbortController();loading=true;
  $('mensagemErro').classList.add('hidden');$('pcpConteudo').replaceChildren();
  const queries=contexts();
  try{
   for(let i=0;i<queries.length;i++){
    $('estadoConsulta').textContent='Consultando recorte '+(i+1)+' de '+queries.length+'…';
    const data=await apiGet(APP_CONFIG.endpoints.dados,queries[i],{signal:abort.signal});if(id!==generation)return;
    if(dataPage>Math.max(data.paginas,1)){dataPage=Math.max(data.paginas,1);return await refresh();}
    render(data,queries[i],i,queries.length);
   }
   $('estadoConsulta').textContent='Consulta realizada às '+new Date().toLocaleTimeString('pt-BR',{timeZone:'America/Sao_Paulo'})+' · '+queries.length+' recorte(s) · dados reais da API';
  }catch(e){if(e.name!=='AbortError'&&id===generation){$('pcpConteudo').replaceChildren();error(e);}}
  finally{if(id===generation)loading=false;}
 }
 function render(data,params,index,totalScopes){
  const entry=metadata.find(t=>t.tabela===data.tabela);if(!entry)throw Error('Estrutura da tabela não está no catálogo PCP.');
  const section=document.createElement('section');section.className='pcp-layout';
  const caption=[names[data.tabela],params.inicio?date(params.inicio)+' a '+date(params.fim):'Todo o período',params.unidade?'Unidade '+params.unidade:'Todas as unidades',params.secao||params.transacao||''].filter(Boolean).join(' · ');
  const indicators=(data.indicadores||[]).map(m=>card(m.rotulo,fmt(m.valor,3)+(m.valor==null?'':' '+m.unidade),m.regra)).join('');
  section.innerHTML='<h2 class="pcp-context-title">'+esc(caption)+'</h2><div class="pcp-summary">'+card('Registros filtrados',fmt(data.resumo.registros),'pcp.'+data.tabela)+card('Datas com registros',fmt(data.resumo.dias),'Período consultado')+card('Última referência',date(data.resumo.fim))+card('Última carga',date(data.ultima_atualizacao),timestamp(data.ultima_atualizacao))+indicators+'</div>'+(totalScopes>1?'<div class="card pcp-notice">Valores separados por recorte selecionado. Nenhuma fórmula ou total é calculado no navegador.</div>':'')+'<div class="pcp-charts"><article class="card"><div class="pcp-section-head"><h2>'+(data.indicadores[0]?esc(data.indicadores[0].rotulo):'Registros')+' por mês</h2></div><div class="pcp-chart" id="pcp-history-'+index+'"></div></article><article class="card"><div class="pcp-section-head"><h2>Valores dos registros</h2><select class="pcp-filter-select" data-measure aria-label="Campo do gráfico" style="width:auto;max-width:48%"></select></div><div class="pcp-chart" id="pcp-values-'+index+'"></div></article></div><article class="card"><div class="pcp-section-head"><h2>'+esc(names[data.tabela])+'</h2><a class="button" href="detalhes.html?'+esc(new URLSearchParams({...params}).toString())+'">Detalhar registros</a></div><div class="pcp-table-scroll" data-table></div><div class="pcp-pager"><span>'+fmt(data.resumo.registros)+' registros · página '+dataPage+' de '+Math.max(data.paginas,1)+'</span><div><button class="button" data-prev '+(dataPage<=1?'disabled':'')+'>← Anterior</button><button class="button" data-next '+(dataPage>=data.paginas?'disabled':'')+'>Próxima →</button></div></div></article>';
  $('pcpConteudo').appendChild(section);$('ultimaAtualizacao').textContent=timestamp(data.ultima_atualizacao);
  const cols=entry.colunas.filter(c=>!['dados_originais','chave_hash','carga_id','importado_em'].includes(c.nome));
  section.querySelector('[data-table]').innerHTML=data.dados.length?'<table class="pcp-raw-table"><thead><tr>'+cols.map(c=>'<th>'+esc(c.rotulo)+'</th>').join('')+'</tr></thead><tbody>'+data.dados.map(row=>'<tr>'+cols.map(c=>'<td title="'+esc(row[c.nome])+'">'+esc(row[c.nome]??'—')+'</td>').join('')+'</tr>').join('')+'</tbody></table>':'<div class="pcp-notice">Nenhum registro disponível para este recorte.</div>';
  const measure=section.querySelector('[data-measure]');const numbers=cols.filter(c=>numeric(c.tipo));measure.innerHTML=numbers.map(c=>'<option value="'+esc(c.nome)+'">'+esc(c.rotulo)+'</option>').join('');
  const preferred=numbers.find(c=>['quantidade','saldo_atual','peso_liquido_mov','peso_kg','peso_liquido','ocorrencia','producao_ate'].includes(c.nome));if(preferred)measure.value=preferred.nome;
  function values(){const rows=data.dados.slice(0,15);const labels=rows.map(r=>r.descricao||r.descricao_produto||r.motivo||r.condenacao||r.plano_producao_produto||r.pesagem||date(r.data_referencia));ApiScreen.chart('pcp-values-'+index,labels.map(v=>String(v).length>20?String(v).slice(0,18)+'…':v),[{name:measure.selectedOptions[0]?.textContent||'Valor',type:'bar',data:rows.map(r=>r[measure.value]??null)}]);}
  measure.onchange=values;values();
  const primary=data.indicadores[0];ApiScreen.chart('pcp-history-'+index,data.serie.map(r=>date(r.data).slice(3)),[{name:primary?primary.rotulo:'Registros',type:'bar',data:data.serie.map(r=>primary?r.valor:r.registros)}]);chartLayout('pcp-history-'+index);
  section.querySelector('[data-prev]').onclick=()=>{dataPage--;refresh();};section.querySelector('[data-next]').onclick=()=>{dataPage++;refresh();};
 }
 $('tabela').onchange=()=>{dataPage=1;setup();};$('atualizar').onclick=refresh;$('limparFiltros').onclick=async()=>{controller.clear();dataPage=1;await controller.loadOptions({preserve:false});refresh();};
 try{const catalog=await apiGet(APP_CONFIG.endpoints.catalogo);metadata=catalog.tabelas;await setup();}catch(e){error(e);}
 setInterval(()=>{if(!document.hidden&&!loading)refresh();},60000);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!loading)refresh();});
})();
