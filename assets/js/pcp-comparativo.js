"use strict";
window.PcpComparativo=(()=>{
 const esc=ApiScreen.escape,percent=(n,digits=1)=>n==null?'—':(100*n).toLocaleString('pt-BR',{minimumFractionDigits:digits,maximumFractionDigits:digits})+'%';
 function mount(pageNumber=1,groupNumber=1){
  const opportunities=groupNumber===2,mix=groupNumber===3,general=groupNumber===4,endpoint=general?'/api/pcp/comparativo/rendimento-geral':mix?'/api/pcp/comparativo/mix':opportunities?'/api/pcp/comparativo/rendimentos':'/api/pcp/comparativo/frigorificos',contract=general?'rendimento-geral-v1':mix?'oportunidades-mix-v1':opportunities?'oportunidades-rendimentos-v1':'comparativo-frigorificos-v1';
  const filter=document.querySelector('.filter-card'),content=document.getElementById('pcpConteudo'),status=document.getElementById('estadoConsulta'),error=document.getElementById('mensagemErro');
  filter.className='card pcp-comparativo-filtros';content.className='pcp-report-panels';status.textContent='';
  filter.innerHTML='<div class="pcp-comparativo-filter-head"><h2>Filtros</h2><div><button type="button" class="button" id="comparativoAtualizar">Atualizar</button><button type="button" class="button" id="comparativoLimpar">Limpar filtros</button></div></div><div class="pcp-comparativo-filter-grid"><label>Data inicial<input type="date" id="comparativoInicio"></label><label>Data final<input type="date" id="comparativoFim"></label><label>Semana<select id="comparativoSemana"><option value="">Todas</option></select></label><label>Unidade<select id="comparativoUnidade"><option value="">Ave Nova e Real Alimentos</option><option value="10">Ave Nova</option><option value="111">Real Alimentos</option></select></label></div>';
  if(general){filter.querySelector('#comparativoSemana').parentElement.firstChild.textContent='Mês dos gráficos';filter.querySelector('#comparativoUnidade').insertAdjacentHTML('beforeend','<option value="geral">Geral (consolidado)</option>');}
  const descriptions=PCP_REPORT_MODEL.grupos[groupNumber].paginas[pageNumber-1].visuais.filter(v=>v.tipo==='lineChart');
  const modes=descriptions.map((_,i)=>general&&i===1?'dia':'semana');let lastData=null;
  const charts=descriptions.map((visual,i)=>{
   const title=opportunities&&pageNumber===1&&i===0?'Rendimento Coração x Peso Vivo (%) - Semana':visual.titulo;
   const panel=document.createElement('article');panel.className='card pcp-report-panel pcp-comparativo-panel'+((groupNumber===1&&pageNumber===3)||(mix&&pageNumber===4)?' pcp-comparativo-agrupado':'');
   panel.innerHTML='<header><h2>'+esc(title)+'</h2><div hidden class="pcp-measure-details"><div><p>Dados reais do PostgreSQL PCP. Medidas originais do PBIX, calculadas sobre os pesos acumulados da semana.</p><p>A recepção utiliza Abate — Total quando há compra na mesma data e empresa. Apenas as transações 27, 29 e 38 compõem o fato original de movimentos.</p>'+visual.projecoes.filter(p=>p.tipo==='Measure').map(p=>'<div hidden><pre>'+esc(p.expressao_oficial)+'</pre></div>').join('')+'</div></div></header><div class="pcp-comparativo-chart-scroll"><div class="pcp-comparativo-chart" id="comparativoGrafico'+i+'" aria-label="'+esc(title)+'"></div></div>';
   if(groupNumber===1){
    const info=panel.querySelector('.pcp-measure-details>div');
    info.querySelector('p').textContent='Dados reais do PostgreSQL PCP, calculados sobre os pesos acumulados da semana, somente em dias com abate até D−1.';
    const notes=pageNumber===1?(i===0?'Rendimento = base de produção ÷ (peso vivo − mortos no transporte).':'Rendimento ajustado = (base − CMS − dorso a granel − pele a granel) ÷ (peso vivo − mortos no transporte). A pele a granel é aplicada também à Ave Nova, conforme a planilha de origem.'):pageNumber===2?(i===0?'Na Ave Nova, o filé é reconstituído com o coeficiente completo: 0,2251 ÷ (0,2251 + 0,0325 + 0,0707 + 0,00882). A família peito usa esse peso reconstituído.':'Cada produto é contado uma única vez na família coxa e sobrecoxa. A faixa sobreposta da planilha histórica não é repetida no cálculo.'):'O agrupado soma os rendimentos das famílias peito, coxa e asa, incluindo a precisão corrigida do peito da Ave Nova.';
    const note=document.createElement('p');note.textContent=notes;info.insertBefore(note,info.querySelector('details'));
    const reference=document.createElement('p');reference.textContent='As expressões do Power BI abaixo são a referência histórica. Os ajustes descritos acima correspondem à fórmula vigente, conferida com a planilha.';info.insertBefore(reference,info.querySelector('details'));
   }
   if(opportunities){
    const info=panel.querySelector('.pcp-measure-details>div');
    info.querySelector('p').textContent='Dados reais do PostgreSQL PCP. Percentuais calculados pela soma dos pesos, somente em dias com abate até D−1.';
    const notes=pageNumber===1?(i===0?'Coração = peso do coração ÷ peso vivo. O denominador é o peso vivo bruto, conforme a planilha de origem.':'Fígado = (fígado + volta) ÷ (peso vivo − mortos no transporte). Volta = (inteiro congelado × 4 + inteiro temperado × 2 + inteiro resfriado × 2) × 0,0174 ÷ 0,9133. Coeficientes da Ave Nova conferidos com a planilha.'):pageNumber===2?(i===0?'Moela = (moela + volta) ÷ (peso vivo − mortos no transporte). Volta = peso de frango inteiro × 0,0117 ÷ 0,9133. Na conferência de 14/10/2026, a semana 36 da Ave Nova tinha produção de moela ausente e movimento 29 de −40 kg. O saldo negativo foi preservado; não representa produção zerada.':'Condenação = quilos de condenação ÷ peso vivo de referência. Os campos antigos e novos da origem são conciliados por data; os percentuais semanais usam pesos acumulados, sem preencher ausências com valores fictícios.'):(i===0?'Subproduto utiliza a composição de produção e movimentos de cada unidade, dividida pelo peso vivo de referência.':'Mortos no transporte = peso dos mortos ÷ peso vivo. Na conferência de 14/10/2026, a Ave Nova em 13/10 tinha 18.281 kg de mortos e 328.900 kg de peso vivo: 5,56%. O valor consta na origem Agrosys e permanece para conferência operacional.');
    const note=document.createElement('p');note.textContent=notes;info.insertBefore(note,info.querySelector('details'));
    const reference=document.createElement('p');reference.textContent='As expressões do Power BI abaixo são a referência histórica. As fórmulas vigentes e os ajustes conferidos com a planilha estão descritos acima.';info.insertBefore(reference,info.querySelector('details'));
   }
   if(mix){
    const info=panel.querySelector('.pcp-measure-details>div');
    info.querySelector('p').textContent='Dados reais do PostgreSQL PCP. Percentuais pela soma dos pesos, somente em dias com abate até D−1.';
    info.querySelector('p:nth-of-type(2)').textContent='Cada medida preserva sua composição de produção e transações 27, 29 e 38. Saldos negativos são mantidos para conferência na origem.';
    const notes=pageNumber===1?(i===0?'Cortes de asa = (coxinha da asa + meio da asa) ÷ (asa inteira + cortes). Produção e transação 29. Na conferência de 14/10/2026, a Real Alimentos na semana 41 tinha 40.360 kg de cortes e 65.980 kg de asa inteira: 37,95%.':'Filé = filé ÷ (filé + peito). Produção e transação 29; o percentual semanal usa os pesos acumulados.'):pageNumber===2?(i===0?'Cortes de coxa = (coxa + sobrecoxa solteiras) ÷ (solteiras + conjuntos). Cada SKU é contado uma única vez: o código 354 da Real Alimentos não é repetido como na faixa sobreposta da planilha histórica. Na conferência de 14/10/2026, semana 33: AN 380 kg de produção − 180 kg de movimento 29 = 200 kg; RA sem produção registrada e movimento 29 de −20 kg. Semana 42 AN: 180 ÷ (180 + 75.200) = 0,24%, com apenas 13/10 disponível até D−1.':'Pele x filé = pele ÷ filé. A pele AN inclui produção e transações 27, 29 e 38; a pele RA e o filé usam produção e transação 29.'):pageNumber===3?(i===0?'Sambiquira = sambiquira ÷ cortes sem sambiquira. A composição dos cortes e as transações são específicas de cada unidade.':'Pés = pés ÷ cortes sem pés. Os pés usam produção e transação 29; cada unidade preserva sua composição dos cortes.'):'Frango inteiro = peso de frango inteiro ÷ base de produção. Na Real Alimentos, a base é a soma dos 84 produtos da planilha (ConsolidaçãoRA, linhas 100 a 195), com produção e transação 29, cada SKU uma vez. Na Ave Nova, permanece a BASE PARA RENDIMENTO. O inteiro inclui produção e transações 27, 29 e 38. Sem base válida, o resultado fica indisponível.';
    const note=document.createElement('p');note.textContent=notes;info.insertBefore(note,info.querySelector('details'));
    const reference=document.createElement('p');reference.textContent='As expressões do Power BI abaixo são a referência histórica. As bases e os ajustes vigentes estão descritos acima.';info.insertBefore(reference,info.querySelector('details'));
   }
   if(general)panel.querySelector('.pcp-measure-details>div>p:nth-of-type(2)').textContent='Rendimento = base de produção ÷ (peso vivo − mortos no transporte). O consolidado usa a soma dos pesos das unidades. Somente dias com abate até D−1.';
   panel.dataset.periodTitle=title.replace(/\s*[-·]\s*(Semana|Mês|Dia|Mensal|Diário)$/i,'');panel.querySelector('header').append(PcpPeriodFlags.create('periodoComparativo'+i,modes[i],mode=>{modes[i]=mode;if(lastData)render(lastData);}));content.append(panel);return echarts.init(panel.querySelector('.pcp-comparativo-chart'));
  });
  const fields={inicio:document.getElementById('comparativoInicio'),fim:document.getElementById('comparativoFim'),semana:document.getElementById('comparativoSemana'),unidade:document.getElementById('comparativoUnidade')};
  let followLatest=true,followLatestMonth=true,generation=0,controller=null,loading=false,lastConfirmed=null;
  const textColor='#756d68';
  function render(data){lastData=data;
   fields.inicio.value=data.periodo.inicio||'';fields.fim.value=data.periodo.fim||'';
   const selected=fields.semana.value;
   if(general){fields.semana.innerHTML=data.meses_disponiveis.map(m=>'<option value="'+m.chave+'">'+esc(m.nome)+'</option>').join('');fields.semana.value=data.mes_diario||'';}
   else{fields.semana.innerHTML='<option value="">Todas</option>'+data.semanas.map(w=>'<option value="'+w.chave+'">'+w.ano+' · Semana '+w.semana+'</option>').join('');fields.semana.value=selected;}
   if(data.periodo_disponivel.inicio){for(const f of [fields.inicio,fields.fim]){f.min=data.periodo_disponivel.inicio;f.max=data.periodo_disponivel.fim;}}
   charts.forEach((chart,index)=>{
    const daily=modes[index]==='dia',rows=general?(daily?data.dias:(data.semanal||[])):(daily?(data.serie_diaria||[]):data.serie);const panel=chart.getDom().closest('article');panel.querySelector('h2').textContent=panel.dataset.periodTitle+' · '+(daily?'Dia':'Semana');
    const years=new Set(rows.map(r=>r.ano)),labels=rows.map(r=>daily?r.chave.slice(8)+'/'+r.chave.slice(5,7):general?'Sem. '+Number(r.chave.slice(5)):years.size>1?r.ano+' / '+r.semana:String(r.semana));
    const metric=general?'rendimento':mix?[['mix_cortes_asa','mix_file'],['mix_cortes_coxa','mix_pele_file'],['mix_sambiquira','mix_pes'],['mix_inteiro']][pageNumber-1][index]:opportunities?[['rendimento_coracao','rendimento_figado'],['rendimento_moela','condenacao'],['subproduto','mortos_transporte']][pageNumber-1][index]:pageNumber===1?(index===0?'rendimento':'rendimento_sem_cms_dorso_pele'):pageNumber===2?(index===0?'rendimento_peito':'rendimento_coxa_sobrecoxa'):'rendimento_agrupado';
    const precision=(opportunities&&['rendimento_coracao','mortos_transporte'].includes(metric))||(mix&&['mix_sambiquira','mix_pes','mix_cortes_coxa'].includes(metric))?2:1,format=n=>percent(n,precision);
    const definitions=descriptions[index].projecoes.filter(p=>p.tipo==='Measure'&&p.papel==='Y').map(p=>{
     const global=p.campo.startsWith('Meta Mortos'),surgical=p.campo.includes('Cirúrgico')||global,uid=global?(fields.unidade.value||'10'):p.campo.includes('GERAL')?'geral':p.campo.includes(' - RA')?'111':'10';
     return {uid,global,id:global?'meta_mortos':uid+(surgical?'_cirurgico':''),name:p.campo,metric:surgical?(opportunities?(global?'meta_mortos':'cirurgico_'+metric.replace('rendimento_','')):index===0?'cirurgico_peito':'cirurgico_coxa_sobrecoxa'):metric,surgical,color:surgical?'#222222':uid==='geral'?'#817b78':uid==='111'?'#ff1515':'#168cff',bg:uid==='geral'?'#ece9e7':uid==='111'?'#fbe4e5':'#e4f2ff',position:uid==='111'?'top':'bottom'};
    });
    const series=definitions.filter(s=>!fields.unidade.value||fields.unidade.value===s.uid).map(s=>({id:s.id,name:s.name,type:'line',symbol:s.surgical?'none':'circle',symbolSize:7,showAllSymbol:true,connectNulls:false,lineStyle:{width:s.surgical?1.2:2.5,color:s.color},itemStyle:{color:s.color},labelLayout:p=>{
     const row=rows[p.dataIndex],value=row?.valores.find(v=>v.unidade===s.uid)?.[s.metric];
     const other=definitions.find(d=>!d.surgical&&d.uid!==s.uid&&(!fields.unidade.value||fields.unidade.value===d.uid));
     const otherValue=other?row?.valores.find(v=>v.unidade===other.uid)?.[other.metric]:null;
     let above=otherValue==null||value>otherValue||(value===otherValue&&s.uid==='111');
     const point=chart.convertToPixel({xAxisIndex:0,yAxisIndex:0},[p.dataIndex,value]);
     const rect=chart.getModel().getComponent('grid')?.coordinateSystem?.getRect();
     if(!rect||!point||!Number.isFinite(point[1]))return {hideOverlap:false};
     if(general){
      const ranked=definitions.filter(d=>!fields.unidade.value||fields.unidade.value===d.uid).map(d=>({uid:d.uid,value:row?.valores.find(v=>v.unidade===d.uid)?.[d.metric]})).filter(d=>d.value!=null).sort((a,b)=>b.value-a.value||a.uid.localeCompare(b.uid));
      const rank=ranked.findIndex(d=>d.uid===s.uid);above=rank===0;
      if(ranked.length===3&&rank===1){const x=Math.max(rect.x+2,Math.min(rect.x+rect.width-p.labelRect.width-2,point[0]+12));return {dx:x-p.labelRect.x,dy:point[1]-p.labelRect.height/2-p.labelRect.y,hideOverlap:false};}
     }
     const height=p.labelRect.height,top=Math.max(rect.y+2,Math.min(rect.y+rect.height-height-4,above?point[1]-height-10:point[1]+10));
     return {dy:top-p.labelRect.y,hideOverlap:false};
    },label:{show:!s.surgical,position:s.position,distance:9,fontSize:10,color:'#000000',backgroundColor:s.bg,borderRadius:3,padding:[3,5],formatter:p=>format(p.value)},data:rows.map(row=>row.valores.find(v=>s.global?v.dias_com_abate>0:v.unidade===s.uid)?.[s.metric]??null)}));
    const numbers=series.flatMap(s=>s.data).filter(v=>v!=null&&Number.isFinite(v));
    let min=numbers.length?Math.floor((Math.min(...numbers)-.02)*20)/20:0,max=numbers.length?Math.ceil((Math.max(...numbers)+.02)*20)/20:1;
    if((opportunities||mix||general)&&numbers.length){
     const low=Math.min(...numbers),high=Math.max(...numbers),span=high-low||Math.abs(high)*.1||.001,step=Math.pow(10,Math.floor(Math.log10(span))-1),padding=Math.max(span*.15,step*2);
     min=Math.floor((low-padding)/step)*step;max=Math.ceil((high+padding)/step)*step;if(low>=0)min=Math.max(0,min);
    }
    const axisPrecision=(mix||general)?Math.max(metric==='mix_sambiquira'?2:1,Math.min(4,-Math.floor(Math.log10((max-min)*100/4)))):metric==='rendimento_coracao'?2:Math.max(...numbers.map(n=>Math.abs(n)))<.03?1:0;
    const element=chart.getDom();element.style.width=Math.max(element.parentElement.clientWidth,labels.length*76+100)+'px';chart.resize();
    chart.setOption({animation:true,animationDuration:0,animationDurationUpdate:400,animationEasingUpdate:'cubicOut',color:['#ff1515','#168cff'],legend:{top:6,left:0,type:'scroll',icon:'circle',itemWidth:9,itemHeight:9,textStyle:{fontSize:10,color:textColor}},tooltip:{trigger:'axis',valueFormatter:format},grid:{left:48,right:30,top:58,bottom:48,containLabel:false},xAxis:{type:'category',data:labels,axisLine:{show:false},axisTick:{show:false},axisLabel:{interval:0,margin:14,color:textColor,fontSize:11}},yAxis:{type:'value',min,max,splitNumber:4,axisLabel:{formatter:v=>(opportunities||mix||general)?percent(v,axisPrecision):Math.round(v*100)+'%',color:textColor,fontSize:11},splitLine:{lineStyle:{type:'dotted',color:'#ddd8d3'}}},series,graphic:!numbers.length?[{type:'text',left:'center',top:'middle',style:{text:'Nenhum registro disponível para os filtros selecionados.',fill:textColor,fontSize:13}}]:[]},{notMerge:false,replaceMerge:['series','graphic']});
   });
  }
  async function load(){
   const id=++generation;controller?.abort();controller=new AbortController();loading=true;error.classList.add('hidden');
   const params=general?{}:{pagina:pageNumber,agrupar:'semana'};if(!followLatest){params.inicio=fields.inicio.value;params.fim=fields.fim.value;}if(fields.unidade.value)params.unidade=fields.unidade.value;if(fields.semana.value&&(!general||!followLatestMonth))params[general?'mes_diario':'semana_filtro']=fields.semana.value;
   try{
    const data=await apiGet(endpoint,params,{signal:controller.signal,silent:true});if(id!==generation)return;
    if(data.ok!==true||(!general&&data.pagina!==pageNumber)||data.contrato!==contract||!Array.isArray(data.serie))throw Error('Resposta incompatível com as medidas do comparativo.');
    render(data);window.PcpReportHeader?.update(data.ultima_atualizacao);const updated=data.ultima_atualizacao?new Date(data.ultima_atualizacao).toLocaleString('pt-BR'):'não informada';lastConfirmed='Dados reais · '+(general?(data.semanal||[]).length+' semana(s) no mês '+data.mes_diario:data.serie.length+' semana(s)')+' · período exibido: '+data.periodo.inicio+' a '+data.periodo.fim+' · '+(fields.unidade.selectedOptions[0]?.textContent||'Ambas as unidades')+' · '+(fields.semana.value?fields.semana.selectedOptions[0].textContent:'Todas as semanas')+' · somente dias com abate · até D−1';status.textContent=lastConfirmed;
   }catch(e){if(id!==generation||e.name==='AbortError')return;const denied=e.status===401||e.status===403;if(denied){for(const chart of charts)chart.clear();lastConfirmed=null;}error.textContent=e.message+(lastConfirmed?' Os gráficos mantêm a última consulta confirmada; os novos filtros ainda não foram aplicados.':'');error.classList.remove('hidden');status.textContent=lastConfirmed||'Consulta não concluída.';}
   finally{if(id===generation)loading=false;}
  }
  fields.inicio.onchange=fields.fim.onchange=()=>{followLatest=false;if(general)followLatestMonth=true;fields.semana.value='';load();};fields.unidade.onchange=load;fields.semana.onchange=()=>{if(general)followLatestMonth=false;load();};
  document.getElementById('comparativoAtualizar').onclick=load;
  document.getElementById('comparativoLimpar').onclick=()=>{followLatest=true;followLatestMonth=true;fields.semana.value='';fields.unidade.value='';load();};
  window.addEventListener('resize',()=>charts.forEach(c=>{const count=c.getOption()?.xAxis?.[0]?.data?.length||0;c.getDom().style.width=Math.max(c.getDom().parentElement.clientWidth,count*76+100)+'px';c.resize();}));
  setInterval(()=>{if(!document.hidden&&!loading)load();},60000);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!loading)load();});
  load();
 }
 return {mount};
})();
