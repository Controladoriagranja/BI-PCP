"use strict";
window.PcpComparativo=(()=>{
 const esc=ApiScreen.escape,percent=n=>n==null?'—':(100*n).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'%';
 function mount(){
  const filter=document.querySelector('.filter-card'),content=document.getElementById('pcpConteudo'),status=document.getElementById('estadoConsulta'),error=document.getElementById('mensagemErro');
  filter.className='card pcp-comparativo-filtros';content.className='pcp-report-panels';
  filter.innerHTML='<div class="pcp-comparativo-filter-head"><h2>Filtros</h2><div><button type="button" class="button" id="comparativoAtualizar">Atualizar</button><button type="button" class="button" id="comparativoLimpar">Limpar filtros</button></div></div><div class="pcp-comparativo-filter-grid"><label>Data inicial<input type="date" id="comparativoInicio"></label><label>Data final<input type="date" id="comparativoFim"></label><label>Semana<select id="comparativoSemana"><option value="">Todas</option></select></label><label>Unidade<select id="comparativoUnidade"><option value="">Ave Nova e Real Alimentos</option><option value="10">Ave Nova</option><option value="111">Real Alimentos</option></select></label></div>';
  const descriptions=PCP_REPORT_MODEL.grupos[1].paginas[0].visuais.filter(v=>v.tipo==='lineChart');
  const charts=descriptions.map((visual,i)=>{
   const panel=document.createElement('article');panel.className='card pcp-report-panel pcp-comparativo-panel';
   panel.innerHTML='<header><h2>'+esc(visual.titulo)+'</h2><details class="pcp-measure-details"><summary>ⓘ Mais detalhes</summary><div><p>Dados reais do PostgreSQL PCP. Medidas originais do PBIX, calculadas sobre os pesos acumulados da semana.</p><p>A recepção utiliza Abate — Total quando há compra na mesma data e empresa. Apenas as transações 27, 29 e 38 compõem o fato original de movimentos.</p>'+visual.projecoes.filter(p=>p.tipo==='Measure').map(p=>'<details><summary>'+esc(p.campo)+'</summary><pre>'+esc(p.expressao_oficial)+'</pre></details>').join('')+'</div></details></header><div class="pcp-comparativo-chart" id="comparativoGrafico'+i+'" aria-label="'+esc(visual.titulo)+'"></div>';
   content.append(panel);return echarts.init(panel.querySelector('.pcp-comparativo-chart'));
  });
  const fields={inicio:document.getElementById('comparativoInicio'),fim:document.getElementById('comparativoFim'),semana:document.getElementById('comparativoSemana'),unidade:document.getElementById('comparativoUnidade')};
  let followLatest=true,generation=0,controller=null,loading=false;
  const css=getComputedStyle(document.documentElement),textColor=css.getPropertyValue('--muted-foreground').trim()||'#756d68';
  function render(data){
   fields.inicio.value=data.periodo.inicio||'';fields.fim.value=data.periodo.fim||'';
   const selected=fields.semana.value;fields.semana.innerHTML='<option value="">Todas</option>'+data.semanas.map(w=>'<option value="'+w.chave+'">'+w.ano+' · Semana '+w.semana+'</option>').join('');fields.semana.value=selected;
   if(data.periodo_disponivel.inicio){for(const f of [fields.inicio,fields.fim]){f.min=data.periodo_disponivel.inicio;f.max=data.periodo_disponivel.fim;}}
   const years=new Set(data.serie.map(r=>r.ano)),labels=data.serie.map(r=>years.size>1?r.ano+' / '+r.semana:String(r.semana));
   charts.forEach((chart,index)=>{
    const metric=index===0?'rendimento':'rendimento_sem_cms_dorso_pele';
    const series=[{uid:'111',name:index===0?'Rendimento (Vivo - Mortos Transp.) (%) - RA':'Rendimento (Vivo - Mortos Transp. - CMS - Dorso e Pele Granel) (%) - RA',color:'#ff1515',bg:'#fbe4e5',position:'top'},{uid:'10',name:index===0?'Rendimento (Vivo - Mortos Transp.) (%) - AN':'Rendimento (Vivo - Mortos Transp. - CMS - Dorso e Pele Granel) (%) - AN',color:'#168cff',bg:'#e4f2ff',position:'bottom'}].filter(s=>!fields.unidade.value||fields.unidade.value===s.uid).map(s=>({name:s.name,type:'line',symbol:'circle',symbolSize:7,showAllSymbol:true,connectNulls:false,lineStyle:{width:2.5,color:s.color},itemStyle:{color:s.color},label:{show:labels.length<=24,position:s.position,distance:9,fontSize:10,color:'#302b29',backgroundColor:s.bg,borderRadius:3,padding:[3,5],formatter:p=>percent(p.value)},data:data.serie.map(row=>row.valores.find(v=>v.unidade===s.uid)?.[metric]??null)}));
    const numbers=series.flatMap(s=>s.data).filter(v=>v!=null&&Number.isFinite(v));
    const min=numbers.length?Math.floor((Math.min(...numbers)-.02)*20)/20:0,max=numbers.length?Math.ceil((Math.max(...numbers)+.02)*20)/20:1;
    chart.hideLoading();chart.setOption({animation:false,color:['#ff1515','#168cff'],legend:{top:6,left:0,type:'scroll',icon:'circle',itemWidth:9,itemHeight:9,textStyle:{fontSize:10,color:textColor}},tooltip:{trigger:'axis',valueFormatter:percent},grid:{left:48,right:30,top:58,bottom:30,containLabel:false},xAxis:{type:'category',data:labels,axisLine:{show:false},axisTick:{show:false},axisLabel:{color:textColor,fontSize:11}},yAxis:{type:'value',min,max,splitNumber:4,axisLabel:{formatter:v=>Math.round(v*100)+'%',color:textColor,fontSize:11},splitLine:{lineStyle:{type:'dotted',color:'#ddd8d3'}}},series,graphic:!numbers.length?[{type:'text',left:'center',top:'middle',style:{text:'Nenhum registro disponível para os filtros selecionados.',fill:textColor,fontSize:13}}]:[]},true);
   });
  }
  async function load(){
   const id=++generation;controller?.abort();controller=new AbortController();loading=true;error.classList.add('hidden');status.textContent='Carregando comparativo dos frigoríficos…';
   for(const chart of charts){chart.clear();chart.showLoading('default',{text:'Consultando dados reais…',color:'#7a1726'});}
   const params={};if(!followLatest){params.inicio=fields.inicio.value;params.fim=fields.fim.value;}if(fields.unidade.value)params.unidade=fields.unidade.value;if(fields.semana.value)params.semana_filtro=fields.semana.value;
   try{
    const data=await apiGet('/api/pcp/comparativo/frigorificos',params,{signal:controller.signal});if(id!==generation)return;
    if(data.ok!==true||data.contrato!=='comparativo-frigorificos-v1'||!Array.isArray(data.serie))throw Error('Resposta incompatível com as medidas do comparativo.');
    render(data);const updated=data.ultima_atualizacao?new Date(data.ultima_atualizacao).toLocaleString('pt-BR'):'não informada';status.textContent='Dados reais · '+data.serie.length+' semana(s) · última carga: '+updated;
   }catch(e){if(id!==generation||e.name==='AbortError')return;for(const chart of charts){chart.hideLoading();chart.clear();}error.textContent=e.message;error.classList.remove('hidden');status.textContent='Consulta não concluída. Nenhum valor anterior foi mantido.';}
   finally{if(id===generation)loading=false;}
  }
  fields.inicio.onchange=fields.fim.onchange=()=>{followLatest=false;fields.semana.value='';load();};fields.semana.onchange=fields.unidade.onchange=load;
  document.getElementById('comparativoAtualizar').onclick=load;
  document.getElementById('comparativoLimpar').onclick=()=>{followLatest=true;fields.semana.value='';fields.unidade.value='';load();};
  window.addEventListener('resize',()=>charts.forEach(c=>c.resize()));
  setInterval(()=>{if(!document.hidden&&!loading)load();},60000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!loading)load();});
  load();
 }
 return {mount};
})();
