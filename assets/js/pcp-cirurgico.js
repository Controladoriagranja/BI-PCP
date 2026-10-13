"use strict";
window.PcpCirurgico=(()=>{
 const esc=ApiScreen.escape,pct=v=>v==null?'—':(v*100).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'%';
 const cols={'1':'1º turno - AN','2':'2º turno - AN','10':'Ave Nova - AN','111':'Real Alimentos'};
 function mount(){
  const filter=document.querySelector('.filter-card');filter.className='pcp-report-filters card';
  filter.innerHTML='<h2>Filtros</h2><label>Grupo<select id="cgGrupo"><option value="">Todos</option><option value="familias">Famílias e miúdos</option><option value="producao">Produção e perdas</option></select></label><label>Ano<select id="cgAno"></select></label><label>Mês<select id="cgMes">'+Array.from({length:12},(_,i)=>'<option value="'+(i+1)+'">'+new Date(2026,i,1).toLocaleDateString('pt-BR',{month:'long'})+'</option>').join('')+'</select></label><label>Dia<select id="cgDia"><option value="">Todos</option></select></label><label>Unidade<select id="cgUnidade"><option value="">Todas</option><option value="10">Ave Nova</option><option value="1">1º turno - AN</option><option value="2">2º turno - AN</option><option value="111">Real Alimentos</option></select></label><div class="filter-actions"><button id="cgAtualizar" class="button">Atualizar</button><button id="cgLimpar" class="button">Limpar filtros</button></div>';
  const content=document.getElementById('pcpConteudo');content.className='pcp-report-panels';content.innerHTML='<article class="card pcp-report-panel"><header><h2>Indicadores por dia</h2><span class="cg-legend"><i class="cg-good"></i>No cirúrgico · <i class="cg-bad"></i>Crítico</span></header><div id="cgDiario" class="cg-scroll"></div></article><article class="card pcp-report-panel"><header><h2>Acumulado mensal</h2><details><summary>ⓘ Mais detalhes</summary><p>Razões calculadas pelos pesos acumulados até D−1. A seleção de dia limita o quadro diário; o acumulado mantém o mês escolhido.</p><p>Condenação: menor ou igual à meta. Demais indicadores: maior ou igual à meta. Ausência de base é apresentada como —.</p></details></header><div id="cgMensal" class="cg-scroll"></div></article>';
  const ids=['Ano','Mes','Dia','Unidade','Grupo'],fields=Object.fromEntries(ids.map(k=>[k,document.getElementById('cg'+k)]));let data=null,generation=0,controller,loading=false;
  const now=new Date();fields.Ano.innerHTML='<option>'+now.getFullYear()+'</option>';fields.Mes.value=now.getMonth()+1;
  function render(){
   if(!data)return;const selected=fields.Unidade.value,keys=selected==='10'?['1','2','10']:selected?[selected]:Object.keys(cols),rows=data.indicadores.filter(r=>!fields.Grupo.value||(fields.Grupo.value==='familias'?r.ordem<=8:r.ordem>8));
   function table(blocks,monthly){
    if(!blocks.length)return '<p class="pcp-report-notice">Sem dados para o período selecionado.</p>';
    const header=blocks.map(b=>'<th colspan="'+keys.length+'">'+esc(monthly?b.mes.split('-').reverse().join('/'):b.data.split('-').reverse().join('/'))+'</th>').join('');
    return '<table class="cg-table"><thead><tr><th rowspan="2">Indicador</th><th rowspan="2">Cirúrgico</th>'+header+'</tr><tr>'+blocks.map(()=>keys.map(k=>'<th>'+esc(cols[k])+'</th>').join('')).join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr><th>'+esc(r.nome)+'</th><td class="cg-target">'+pct(r.meta)+'</td>'+blocks.map(b=>keys.map(k=>{const v=b.valores[k]?.[r.ordem-1],good=v!=null&&(r.ordem===11?v<=r.meta:v>=r.meta);return '<td class="'+(v==null?'':good?'cg-good':'cg-bad')+'">'+pct(v)+'</td>';}).join('')).join('')+'</tr>').join('')+'</tbody></table>';
   }
   document.getElementById('cgDiario').innerHTML=table(data.dias.filter(d=>!fields.Dia.value||d.data===fields.Dia.value),false);document.getElementById('cgMensal').innerHTML=table(data.mensal,true);
  }
  async function load(){
   const id=++generation;if(controller)controller.abort();controller=new AbortController();loading=true;
   try{const result=await apiGet('/api/pcp/comparativo/cirurgico-geral',{ano:fields.Ano.value,mes:fields.Mes.value},{silent:true,signal:controller.signal});if(id!==generation)return;if(!result.ok)throw new Error('Consulta não concluída');data=result;
    fields.Ano.innerHTML=result.anos.map(y=>'<option value="'+y+'">'+y+'</option>').join('');fields.Ano.value=result.ano;fields.Mes.value=result.mes;const day=fields.Dia.value;fields.Dia.innerHTML='<option value="">Todos</option>'+result.dias.map(d=>'<option value="'+d.data+'">'+d.data.split('-').reverse().join('/')+'</option>').join('');fields.Dia.value=result.dias.some(d=>d.data===day)?day:'';
    render();PcpReportHeader.update(result.ultima_atualizacao);document.getElementById('mensagemErro').classList.add('hidden');document.getElementById('estadoConsulta').textContent='Dados reais · até '+result.data_limite.split('-').reverse().join('/')+' (D−1)';
   }catch(e){if(id!==generation||e.name==='AbortError')return;if(e.status===401||e.status===403){data=null;document.getElementById('cgDiario').replaceChildren();document.getElementById('cgMensal').replaceChildren();}const error=document.getElementById('mensagemErro');error.textContent='Não foi possível atualizar o comparativo. '+(data?'A última consulta permanece visível.':'');error.classList.remove('hidden');}
   finally{if(id===generation)loading=false;}
  }
  fields.Ano.onchange=fields.Mes.onchange=()=>{fields.Dia.value='';load();};fields.Dia.onchange=fields.Unidade.onchange=fields.Grupo.onchange=render;document.getElementById('cgAtualizar').onclick=load;document.getElementById('cgLimpar').onclick=()=>{fields.Grupo.value=fields.Unidade.value=fields.Dia.value='';fields.Ano.value=now.getFullYear();fields.Mes.value=now.getMonth()+1;load();};setInterval(()=>{if(!document.hidden&&!loading)load();},60000);document.addEventListener('visibilitychange',()=>{if(!document.hidden&&!loading)load();});load();
 }
 return {mount};
})();
