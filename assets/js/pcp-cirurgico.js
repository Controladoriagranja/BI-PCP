"use strict";
window.PcpCirurgico=(()=>{
 const esc=ApiScreen.escape,pct=v=>v==null?'—':(v*100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'%';
 const cols={'1':'1º turno - AN','2':'2º turno - AN','10':'Ave Nova - AN','111':'Real Alimentos'};
 function mount(){
  const filter=document.querySelector('.filter-card');filter.className='card pcp-comparativo-filtros cg-filters';
  filter.innerHTML='<div class="pcp-comparativo-filter-head"><h2>Filtros</h2><div><button type="button" id="cgAtualizar" class="button">Atualizar</button><button type="button" id="cgLimpar" class="button">Limpar filtros</button></div></div><div class="cg-filter-grid"><label>Grupo<select id="cgGrupo"><option value="">Todos</option><option value="familias">Famílias e miúdos</option><option value="producao">Produção e perdas</option></select></label><label>Ano<select id="cgAno"></select></label><label>Mês<select id="cgMes">'+Array.from({length:12},(_,i)=>'<option value="'+(i+1)+'">'+new Date(2026,i,1).toLocaleDateString('pt-BR',{month:'long'})+'</option>').join('')+'</select></label><label>Dia<select id="cgDia"><option value="">Todos</option></select></label><label>Unidade<select id="cgUnidade"><option value="">Todas</option><option value="10">Ave Nova</option><option value="1">1º turno - AN</option><option value="2">2º turno - AN</option><option value="111">Real Alimentos</option></select></label></div>';

  const content=document.getElementById('pcpConteudo');content.className='pcp-report-panels';content.innerHTML='<article class="card pcp-report-panel"><header><h2>Indicadores por dia</h2></header><div id="cgDiario" class="cg-scroll"></div></article><article class="card pcp-report-panel"><header><h2>Acumulado mensal</h2><div hidden><p>Razões calculadas pelos pesos acumulados até D−1. A seleção de dia limita o quadro diário; o acumulado mantém o mês escolhido.</p><p>Condenação: menor ou igual à meta. Demais indicadores: maior ou igual à meta. Ausência de base é apresentada como —.</p></div></header><div id="cgMensal" class="cg-scroll"></div></article>';
  const ids=['Ano','Mes','Dia','Unidade','Grupo'],fields=Object.fromEntries(ids.map(k=>[k,document.getElementById('cg'+k)]));let data=null,generation=0,controller,loading=false;
  const dialog=document.createElement('dialog');dialog.className='cg-dialog';dialog.setAttribute('aria-labelledby','cgGraficoTitulo');dialog.innerHTML='<header class="cg-dialog-header"><div><h2 id="cgGraficoTitulo"></h2><p id="cgGraficoContexto"></p></div><button type="button" class="button cg-dialog-close">Fechar</button></header><div id="cgGraficoLinhas" class="cg-line-chart" aria-label="Evolução diária do indicador"></div>';document.body.append(dialog);
  const chartEl=dialog.querySelector('.cg-line-chart');let lineChart=null,activeIndicator=null;
  function selectedColumns(){const selected=fields.Unidade.value;return selected==='10'?['1','2','10']:selected?[selected]:Object.keys(cols);}
  function renderLine(){
   if(!data||!dialog.open||activeIndicator==null)return;const indicator=data.indicadores.find(r=>r.ordem===activeIndicator);if(!indicator)return;
   const rows=data.dias.filter(d=>!fields.Dia.value||d.data===fields.Dia.value),keys=selectedColumns(),palette={'1':'#7961ad','2':'#359b91','10':'#168cff','111':'#ed1515'};
   dialog.querySelector('#cgGraficoTitulo').textContent=indicator.nome;
   dialog.querySelector('#cgGraficoContexto').textContent='Evolução diária · '+fields.Mes.selectedOptions[0].textContent+'/'+fields.Ano.value+' · Cirúrgico: '+pct(indicator.meta)+(indicator.ordem===11?' · Menor ou igual é favorável':' · Maior ou igual é favorável');
   const series=keys.map(k=>({name:cols[k],type:'line',showSymbol:true,symbolSize:6,connectNulls:false,itemStyle:{color:palette[k]},lineStyle:{width:2},data:rows.map(d=>d.valores[k]?.[indicator.ordem-1]??null)}));
   series.push({name:'Cirúrgico',type:'line',symbol:'none',connectNulls:false,itemStyle:{color:'#292929'},lineStyle:{color:'#292929',type:'dashed',width:2},data:rows.map(()=>indicator.meta)});
   if(!lineChart)lineChart=echarts.init(chartEl);
   const zoom=rows.length>12;lineChart.setOption({animation:false,legend:{top:8,left:12,right:12,type:'scroll',textStyle:{fontSize:11}},tooltip:{trigger:'axis',formatter:params=>'<b>'+esc(params[0]?.axisValueLabel||'')+'</b><br>'+params.map(p=>p.marker+esc(p.seriesName)+': '+esc(pct(p.value))).join('<br>')},grid:{left:70,right:25,top:55,bottom:zoom?65:35},xAxis:{type:'category',boundaryGap:false,data:rows.map(d=>d.data.slice(8)+'/'+d.data.slice(5,7)),axisLabel:{fontSize:11},axisTick:{show:false}},yAxis:{type:'value',scale:true,axisLabel:{fontSize:11,formatter:v=>pct(v)},splitLine:{lineStyle:{type:'dotted',color:'#e6ddd7'}}},dataZoom:zoom?[{type:'inside'},{type:'slider',height:18,bottom:8}]:[],series,graphic:!rows.some(d=>keys.some(k=>d.valores[k]?.[indicator.ordem-1]!=null))?[{type:'text',left:'center',top:'middle',style:{text:'Sem dados do indicador para os filtros selecionados.',fill:'#756d68',fontSize:12}}]:[]},{notMerge:true});lineChart.resize();
  }
  function openLine(order){if(!data)return;activeIndicator=order;if(!dialog.open)dialog.showModal();renderLine();}
  content.addEventListener('click',event=>{const button=event.target.closest('[data-cg-indicator]');if(button)openLine(Number(button.dataset.cgIndicator));});
  dialog.querySelector('.cg-dialog-close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{activeIndicator=null;});dialog.addEventListener('click',event=>{const r=dialog.getBoundingClientRect();if(event.target===dialog&&(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom))dialog.close();});
  const chartObserver=new ResizeObserver(()=>lineChart?.resize());chartObserver.observe(chartEl);
  const now=new Date();fields.Ano.innerHTML='<option>'+now.getFullYear()+'</option>';fields.Mes.value=now.getMonth()+1;
  function render(){
   if(!data)return;const keys=selectedColumns(),rows=data.indicadores.filter(r=>!fields.Grupo.value||(fields.Grupo.value==='familias'?r.ordem<=8:r.ordem>8));
   function table(blocks,monthly){
    if(!blocks.length)return '<p class="pcp-report-notice">Sem dados para o período selecionado.</p>';
    const header=blocks.map(b=>'<th colspan="'+keys.length+'">'+esc(monthly?b.mes.split('-').reverse().join('/'):b.data.split('-').reverse().join('/'))+'</th>').join('');
    return '<table class="cg-table"><colgroup><col class="cg-indicator-col"><col class="cg-reference-col">'+blocks.map(()=>keys.map(()=>'<col>').join('')).join('')+'</colgroup><thead><tr><th rowspan="2">Indicador</th><th rowspan="2">Cirúrgico</th>'+header+'</tr><tr>'+blocks.map(()=>keys.map(k=>'<th>'+esc(cols[k])+'</th>').join('')).join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr><th><button type="button" class="cg-indicator-button" data-cg-indicator="'+r.ordem+'" aria-haspopup="dialog" title="Ver evolução em gráfico de linhas">'+esc(r.nome)+'</button></th><td class="cg-target">'+pct(r.meta)+'</td>'+blocks.map(b=>keys.map(k=>{const v=b.valores[k]?.[r.ordem-1],good=v!=null&&(r.ordem===11?v<=r.meta:v>=r.meta);return '<td class="'+(v==null?'':good?'cg-good':'cg-bad')+'" title="'+(v==null?'Sem base disponível':good?'Dentro da referência cirúrgica':'Fora da referência cirúrgica')+'">'+pct(v)+'</td>';}).join('')).join('')+'</tr>').join('')+'</tbody></table>';
   }
   document.getElementById('cgDiario').innerHTML=table(data.dias.filter(d=>!fields.Dia.value||d.data===fields.Dia.value),false);document.getElementById('cgMensal').innerHTML=table(data.mensal,true);renderLine();
  }
  async function load(){
   const id=++generation;if(controller)controller.abort();controller=new AbortController();loading=true;
   try{const result=await apiGet('/api/pcp/comparativo/cirurgico-geral',{ano:fields.Ano.value,mes:fields.Mes.value},{silent:true,signal:controller.signal});if(id!==generation)return;if(!result.ok)throw new Error('Consulta não concluída');data=result;
    fields.Ano.innerHTML=result.anos.map(y=>'<option value="'+y+'">'+y+'</option>').join('');fields.Ano.value=result.ano;fields.Mes.value=result.mes;const day=fields.Dia.value;fields.Dia.innerHTML='<option value="">Todos</option>'+result.dias.map(d=>'<option value="'+d.data+'">'+d.data.split('-').reverse().join('/')+'</option>').join('');fields.Dia.value=result.dias.some(d=>d.data===day)?day:'';
    render();PcpReportHeader.update(result.ultima_atualizacao);document.getElementById('mensagemErro').classList.add('hidden');document.getElementById('estadoConsulta').textContent='Dados reais · até '+result.data_limite.split('-').reverse().join('/')+' (D−1)';
   }catch(e){if(id!==generation||e.name==='AbortError')return;if(e.status===401||e.status===403){data=null;lineChart?.clear();if(dialog.open)dialog.close();document.getElementById('cgDiario').replaceChildren();document.getElementById('cgMensal').replaceChildren();}const error=document.getElementById('mensagemErro');error.textContent='Não foi possível atualizar o comparativo. '+(data?'A última consulta permanece visível.':'');error.classList.remove('hidden');}
   finally{if(id===generation)loading=false;}
  }
  fields.Ano.onchange=fields.Mes.onchange=()=>{fields.Dia.value='';load();};fields.Dia.onchange=fields.Unidade.onchange=fields.Grupo.onchange=render;document.getElementById('cgAtualizar').onclick=load;document.getElementById('cgLimpar').onclick=()=>{fields.Grupo.value=fields.Unidade.value=fields.Dia.value='';fields.Ano.value=now.getFullYear();fields.Mes.value=now.getMonth()+1;load();};setInterval(()=>{if(!document.hidden&&!loading)load();},60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!loading)load();});load();
 }
 return {mount};
})();
