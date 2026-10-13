"use strict";
(() => {
 const query=new URLSearchParams(location.search), match=/^g([1-8])$/.exec(query.get('relatorio')||'');
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 if(!match){
  document.title='Visão Geral em manutenção | BI PCP';
  document.querySelector('.page-header h1').textContent='Visão Geral';
  document.querySelector('.page-header p').textContent='Planejamento e controle da produção.';
  document.querySelector('.header-toolbar').replaceChildren();
  document.querySelector('.filter-card').remove();
  document.getElementById('mensagemErro').classList.add('hidden');
  document.getElementById('estadoConsulta').textContent='';
  const content=document.getElementById('pcpConteudo');
  content.className='pcp-maintenance';
  content.innerHTML='<section class="card pcp-maintenance-card" aria-labelledby="maintenanceTitle"><span class="pcp-maintenance-badge">EM MANUTENÇÃO</span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" d="M14.5 6.5a5 5 0 0 0-6.3 6.3L3 18a2.1 2.1 0 0 0 3 3l5.2-5.2a5 5 0 0 0 6.3-6.3l-3 3-3-3 3-3Z"/></svg><h2 id="maintenanceTitle">Visão Geral em manutenção</h2><p>Esta página ainda não foi disponibilizada.</p><p>Os indicadores serão apresentados após a liberação das informações.</p></section>';
  if(query.has('ajuda')){
   const notice=document.createElement('aside');notice.className='pcp-report-notice';notice.textContent='A Visão Geral está em manutenção. Use o menu para navegar pelas outras páginas do PCP.';
   content.append(notice);
  }
  return;
 }
 const index=Number(match[1]), group=PCP_REPORT_MODEL.grupos[index];
 const selected=Math.min(group.paginas.length,Math.max(1,parseInt(query.get('pagina'),10)||1)), page=group.paginas[selected-1];
 document.body.dataset.page='report-g'+index;
 document.body.classList.add('pcp-model-page');
 const titles={1:'Análise Comparativa entre Frigoríficos',2:'Oportunidades de Rendimento',3:'Oportunidades de Mix',4:'Rendimento Geral',5:'Eficiência Abate (%) AN e RA',6:'Oportunidades Mix / Estoque Produto Acabado',7:'Oportunidades Gestão / Estoque Produto Acabado',8:'Comparativo x Cirúrgico Geral'};
 const title=titles[index];document.title=title+' | BI PCP';document.querySelector('h1').textContent=title;
 document.querySelector('.page-header p').textContent='';
 document.querySelector('.header-toolbar').replaceChildren();
 const pager=document.createElement('nav');pager.className='pcp-report-pagination';pager.setAttribute('aria-label','Páginas do relatório');
 function pageLink(number,label){const params=new URLSearchParams(query);params.set('pagina',number);return '<a class="button" href="index.html?'+escape(params)+'" aria-label="'+label+'">'+(number<selected?'←':'→')+'</a>';}
 pager.innerHTML=(selected>1?pageLink(selected-1,'Página anterior'):'')+'<span>Página '+selected+' de '+group.paginas.length+'</span>'+(selected<group.paginas.length?pageLink(selected+1,'Próxima página'):'');
 const updateBox=document.createElement('div');updateBox.className='pcp-header-update';updateBox.innerHTML='<span>Última atualização</span><strong id="pcpUltimaAtualizacao">—</strong>';document.querySelector('.header-toolbar').append(updateBox,pager);
 window.PcpReportHeader={update(value){
  const field=document.getElementById('pcpUltimaAtualizacao');if(!field)return;
  const date=value?new Date(value):null;
  field.textContent=date&&!Number.isNaN(date.getTime())?date.toLocaleDateString('pt-BR',{timeZone:'America/Sao_Paulo'})+' - '+date.toLocaleTimeString('pt-BR',{timeZone:'America/Sao_Paulo',hour12:false}):'—';
 }};
 if(index!==1&&index!==2&&index!==3){
  let updating=false;
  async function updateHeader(){if(updating||!getPortalToken())return;updating=true;try{const data=await apiGet(APP_CONFIG.endpoints.health,{}, {silent:true});if(data.ok)window.PcpReportHeader.update(data.ultima_carga);}catch(_){}finally{updating=false;}}
  updateHeader();setInterval(()=>{if(!document.hidden)updateHeader();},60000);
 }

 if(index===1||index===2||index===3){window.PcpComparativo.mount(selected,index);return;}
 const filter=document.querySelector('.filter-card');filter.className='pcp-report-filters card';
 filter.innerHTML='<h2>Filtros</h2><p>Esta página aguarda a execução das medidas do modelo na API.</p><label>Período<input type="date" disabled aria-describedby="filtrosPendentes"></label><label>Semana<select disabled><option>Aguardando resultados</option></select></label><label>Unidade<select disabled><option>Ave Nova / Real Alimentos</option></select></label><p id="filtrosPendentes">Os filtros dos dados operacionais continuam disponíveis.</p><a class="button" href="operacao.html">Consultar dados reais</a>';
 document.getElementById('estadoConsulta').textContent='Estrutura do PBIX oficial · resultados destas medidas ainda indisponíveis na API.';
 const content=document.getElementById('pcpConteudo');content.className='pcp-report-panels';
 const supported=new Set(['lineChart','clusteredColumnChart','tableEx','pivotTable','card','multiRowCard','clusteredBarChart','stackedColumnChart']);
 const visuals=page.visuais.filter(v=>supported.has(v.tipo));
 visuals.forEach(v=>{
  const panel=document.createElement('article');panel.className='pcp-report-panel card';
  const measures=v.projecoes.filter(p=>p.tipo==='Measure');
  const fields=v.projecoes.filter(p=>p.tipo==='Column');
  const heading=v.titulo||measures[0]?.campo||fields[0]?.campo||'Indicadores do modelo';
  const color=m=>/cirúrgico|meta /i.test(m.campo)?'#222':/ - AN|Ave Nova/i.test(m.campo)?'#168cff':/ - RA|Real Alimentos/i.test(m.campo)?'#ff1515':'#817777';
  const legend=v.tipo.includes('Chart')?'<div class="pcp-report-legend">'+measures.map(m=>'<span><i style="background:'+color(m)+'"></i>'+escape(m.campo)+'</span>').join('')+'</div>':'';
  const table=['tableEx','pivotTable'].includes(v.tipo);
  const columns=v.projecoes.filter(p=>!['Tooltips'].includes(p.papel));
  const tableHeader=table?'<div class="pcp-report-table-wrap"><table class="pcp-report-table"><thead><tr>'+columns.map(p=>'<th scope="col">'+escape(p.campo)+'</th>').join('')+'</tr></thead><tbody><tr><td colspan="'+Math.max(columns.length,1)+'">Resultados pendentes de integração das medidas oficiais.</td></tr></tbody></table></div>':'';
  panel.innerHTML='<header><h2>'+escape(heading)+'</h2><details class="pcp-measure-details"><summary>ⓘ Mais detalhes</summary><div><strong>Fonte: '+escape(page.nome_pbix)+'</strong><p>Vínculos originais do Power BI. A API operacional atual não executa estas medidas.</p>'+v.projecoes.map(p=>'<p><b>'+escape(p.papel)+'</b> · '+escape(p.tabela)+' → '+escape(p.campo)+'</p>'+(p.expressao_oficial?'<details><summary>Expressão oficial</summary><pre>'+escape(Array.isArray(p.expressao_oficial)?p.expressao_oficial.join('\n'):p.expressao_oficial)+'</pre></details>':'')).join('')+'</div></details></header>'+legend+tableHeader+'<div class="pcp-report-pending" role="status"><strong>Resultado ainda indisponível</strong><p>Este '+(table?'quadro':'indicador')+' requer as medidas do PCP na API. Nenhum valor de exemplo foi utilizado.</p><a href="operacao.html">Abrir consultas operacionais →</a></div>';
  content.append(panel);
 });
 if(!visuals.length){content.innerHTML='<article class="card pcp-report-notice">Esta página exige visuais adicionais do modelo original. Nenhum resultado foi substituído.</article>';}
})();
