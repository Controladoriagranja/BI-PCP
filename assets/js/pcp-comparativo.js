"use strict";
window.PcpComparativo=(()=>{
 const esc=ApiScreen.escape,percent=n=>n==null?'—':(100*n).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'%';
 function mount(pageNumber=1){
  const filter=document.querySelector('.filter-card'),content=document.getElementById('pcpConteudo'),status=document.getElementById('estadoConsulta'),error=document.getElementById('mensagemErro');
  filter.className='card pcp-comparativo-filtros';content.className='pcp-report-panels';status.textContent='';
  filter.innerHTML='<div class="pcp-comparativo-filter-head"><h2>Filtros</h2><div><button type="button" class="button" id="comparativoAtualizar">Atualizar</button><button type="button" class="button" id="comparativoLimpar">Limpar filtros</button></div></div><div class="pcp-comparativo-filter-grid"><label>Data inicial<input type="date" id="comparativoInicio"></label><label>Data final<input type="date" id="comparativoFim"></label><label>Semana<select id="comparativoSemana"><option value="">Todas</option></select></label><label>Unidade<select id="comparativoUnidade"><option value="">Ave Nova e Real Alimentos</option><option value="10">Ave Nova</option><option value="111">Real Alimentos</option></select></label></div>';
  const descriptions=PCP_REPORT_MODEL.grupos[1].paginas[pageNumber-1].visuais.filter(v=>v.tipo==='lineChart');
  const charts=descriptions.map((visual,i)=>{
   const panel=document.createElement('article');panel.className='card pcp-report-panel pcp-comparativo-panel'+(pageNumber===3?' pcp-comparativo-agrupado':'');
   panel.innerHTML='<header><h2>'+esc(visual.titulo)+'</h2><details class="pcp-measure-details"><summary>ⓘ Mais detalhes</summary><div><p>Dados reais do PostgreSQL PCP. Medidas originais do PBIX, calculadas sobre os pesos acumulados da semana.</p><p>A recepção utiliza Abate — Total quando há compra na mesma data e empresa. Apenas as transações 27, 29 e 38 compõem o fato original de movimentos.</p>'+visual.projecoes.filter(p=>p.tipo==='Measure').map(p=>'<details><summary>'+esc(p.campo)+'</summary><pre>'+esc(p.expressao_oficial)+'</pre></details>').join('')+'</div></details></header><div class="pcp-comparativo-chart-scroll"><div class="pcp-comparativo-chart" id="comparativoGrafico'+i+'" aria-label="'+esc(visual.titulo)+'"></div></div>';
   content.append(panel);return echarts.init(panel.querySelector('.pcp-comparativo-chart'));
  });
  const fields={inicio:document.getElementById('comparativoInicio'),fim:document.getElementById('comparativoFim'),semana:document.getElementById('comparativoSemana'),unidade:document.getElementById('comparativoUnidade')};
  let followLatest=true,generation=0,controller=null,loading=false,lastConfirmed=null;
  const css=getComputedStyle(document.documentElement),textColor=css.getPropertyValue('--muted-foreground').trim()||'#756d68';
  function render(data){
   fields.inicio.value=data.periodo.inicio||'';fields.fim.value=data.periodo.fim||'';
   const selected=fields.semana.value;fields.semana.innerHTML='<option value="">Todas</option>'+data.semanas.map(w=>'<option value="'+w.chave+'">'+w.ano+' · Semana '+w.semana+'</option>').join('');fields.semana.value=selected;
   if(data.periodo_disponivel.inicio){for(const f of [fields.inicio,fields.fim]){f.min=data.periodo_disponivel.inicio;f.max=data.periodo_disponivel.fim;}}
   const years=new Set(data.serie.map(r=>r.ano)),labels=data.serie.map(r=>years.size>1?r.ano+' / '+r.semana:String(r.semana));
   charts.forEach((chart,index)=>{
    const metric=pageNumber===1?(index===0?'rendimento':'rendimento_sem_cms_dorso_pele'):pageNumber===2?(index===0?'rendimento_peito':'rendimento_coxa_sobrecoxa'):'rendimento_agrupado';
    const definitions=descriptions[index].projecoes.filter(p=>p.tipo==='Measure'&&p.papel==='Y').map(p=>{
     const surgical=p.campo.includes('Cirúrgico'),uid=p.campo.includes(' - RA')?'111':'10';
     return {uid,id:uid+(surgical?'_cirurgico':''),name:p.campo,metric:surgical?(index===0?'cirurgico_peito':'cirurgico_coxa_sobrecoxa'):metric,surgical,color:surgical?'#222222':uid==='111'?'#ff1515':'#168cff',bg:uid==='111'?'#fbe4e5':'#e4f2ff',position:uid==='111'?'top':'bottom'};
    });
    const series=definitions.filter(s=>!fields.unidade.value||fields.unidade.value===s.uid).map(s=>({id:s.id,name:s.name,type:'line',symbol:s.surgical?'none':'circle',symbolSize:7,showAllSymbol:true,connectNulls:false,lineStyle:{width:s.surgical?1.2:2.5,color:s.color},itemStyle:{color:s.color},labelLayout:p=>{
     const row=data.serie[p.dataIndex],value=row?.valores.find(v=>v.unidade===s.uid)?.[s.metric];
     const other=definitions.find(d=>!d.surgical&&d.uid!==s.uid&&(!fields.unidade.value||fields.unidade.value===d.uid));
     const otherValue=other?row?.valores.find(v=>v.unidade===other.uid)?.[other.metric]:null;
     const above=otherValue==null||value>otherValue||(value===otherValue&&s.uid==='111');
     const point=chart.convertToPixel({xAxisIndex:0,yAxisIndex:0},[p.dataIndex,value]);
     const rect=chart.getModel().getComponent('grid')?.coordinateSystem?.getRect();
     if(!rect||!point||!Number.isFinite(point[1]))return {hideOverlap:false};
     const height=p.labelRect.height,top=Math.max(rect.y+2,Math.min(rect.y+rect.height-height-4,above?point[1]-height-10:point[1]+10));
     return {dy:top-p.labelRect.y,hideOverlap:false};
    },label:{show:!s.surgical&&labels.length<=24,position:s.position,distance:9,fontSize:10,color:s.color,backgroundColor:s.bg,borderRadius:3,padding:[3,5],formatter:p=>percent(p.value)},data:data.serie.map(row=>row.valores.find(v=>v.unidade===s.uid)?.[s.metric]??null)}));
    const numbers=series.flatMap(s=>s.data).filter(v=>v!=null&&Number.isFinite(v));
    const min=numbers.length?Math.floor((Math.min(...numbers)-.02)*20)/20:0,max=numbers.length?Math.ceil((Math.max(...numbers)+.02)*20)/20:1;
    const element=chart.getDom();element.style.width=Math.max(element.parentElement.clientWidth,labels.length*32+78)+'px';chart.resize();
    chart.setOption({animation:true,animationDuration:0,animationDurationUpdate:400,animationEasingUpdate:'cubicOut',color:['#ff1515','#168cff'],legend:{top:6,left:0,type:'scroll',icon:'circle',itemWidth:9,itemHeight:9,textStyle:{fontSize:10,color:textColor}},tooltip:{trigger:'axis',valueFormatter:percent},grid:{left:48,right:30,top:58,bottom:48,containLabel:false},xAxis:{type:'category',data:labels,axisLine:{show:false},axisTick:{show:false},axisLabel:{interval:0,margin:14,color:textColor,fontSize:11}},yAxis:{type:'value',min,max,splitNumber:4,axisLabel:{formatter:v=>Math.round(v*100)+'%',color:textColor,fontSize:11},splitLine:{lineStyle:{type:'dotted',color:'#ddd8d3'}}},series,graphic:!numbers.length?[{type:'text',left:'center',top:'middle',style:{text:'Nenhum registro disponível para os filtros selecionados.',fill:textColor,fontSize:13}}]:[]},{notMerge:false,replaceMerge:['series','graphic']});
   });
  }
  async function load(){
   const id=++generation;controller?.abort();controller=new AbortController();loading=true;error.classList.add('hidden');
   const params={pagina:pageNumber,agrupar:'semana'};if(!followLatest){params.inicio=fields.inicio.value;params.fim=fields.fim.value;}if(fields.unidade.value)params.unidade=fields.unidade.value;if(fields.semana.value)params.semana_filtro=fields.semana.value;
   try{
    const data=await apiGet('/api/pcp/comparativo/frigorificos',params,{signal:controller.signal,silent:true});if(id!==generation)return;
    if(data.ok!==true||data.pagina!==pageNumber||data.contrato!=='comparativo-frigorificos-v1'||!Array.isArray(data.serie))throw Error('Resposta incompatível com as medidas do comparativo.');
    render(data);window.PcpReportHeader?.update(data.ultima_atualizacao);const updated=data.ultima_atualizacao?new Date(data.ultima_atualizacao).toLocaleString('pt-BR'):'não informada';lastConfirmed='Dados reais · '+data.serie.length+' semana(s) · período exibido: '+data.periodo.inicio+' a '+data.periodo.fim+' · '+(fields.unidade.selectedOptions[0]?.textContent||'Ambas as unidades')+' · '+(fields.semana.value?fields.semana.selectedOptions[0].textContent:'Todas as semanas')+' · somente dias com abate · até D−1';status.textContent=lastConfirmed;
   }catch(e){if(id!==generation||e.name==='AbortError')return;const denied=e.status===401||e.status===403;if(denied){for(const chart of charts)chart.clear();lastConfirmed=null;}error.textContent=e.message+(lastConfirmed?' Os gráficos mantêm a última consulta confirmada; os novos filtros ainda não foram aplicados.':'');error.classList.remove('hidden');status.textContent=lastConfirmed||'Consulta não concluída.';}
   finally{if(id===generation)loading=false;}
  }
  fields.inicio.onchange=fields.fim.onchange=()=>{followLatest=false;fields.semana.value='';load();};fields.semana.onchange=fields.unidade.onchange=load;
  document.getElementById('comparativoAtualizar').onclick=load;
  document.getElementById('comparativoLimpar').onclick=()=>{followLatest=true;fields.semana.value='';fields.unidade.value='';load();};
  window.addEventListener('resize',()=>charts.forEach(c=>{const count=c.getOption()?.xAxis?.[0]?.data?.length||0;c.getDom().style.width=Math.max(c.getDom().parentElement.clientWidth,count*32+78)+'px';c.resize();}));
  setInterval(()=>{if(!document.hidden&&!loading)load();},60000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!loading)load();});
  load();
 }
 return {mount};
})();
