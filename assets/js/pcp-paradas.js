"use strict";
window.PcpParadas=(()=>{
 const esc=ApiScreen.escape,num=v=>v==null?'—':Number(v).toLocaleString('pt-BR',{maximumFractionDigits:2}),pct=v=>(100*v).toLocaleString('pt-BR',{minimumFractionDigits:2,maximumFractionDigits:2})+'%',hours=v=>{const seconds=Math.round(Number(v)*60);return String(Math.floor(seconds/3600)).padStart(2,'0')+':'+String(Math.floor(seconds%3600/60)).padStart(2,'0');},day=v=>String(v).slice(0,10).split('-').reverse().join('/'),unit=v=>v==='10'?'Ave Nova':'Real Alimentos';
 function create(api){
  const dialog=document.createElement('dialog');dialog.className='cg-dialog cg-stops-dialog';dialog.setAttribute('aria-label','Detalhamento das paradas de produção');
  dialog.innerHTML='<header class="cg-stops-header"><div><h2>Paradas de produção</h2><p class="cg-stops-context"></p></div><button class="button cg-stops-close" type="button">Fechar</button></header><div class="cg-stops-body"><label>Visão <select class="cg-stops-view"><option value="geral">Ave Nova + Real (totais)</option><option value="10">Ave Nova — Todos os turnos</option><option value="1">Ave Nova — 1º turno</option><option value="2">Ave Nova — 2º turno</option><option value="111">Real Alimentos — Todos os turnos</option></select></label><p class="cg-stops-status" role="status"></p><section><h3>Resumo por tipo de parada</h3><div class="cg-stops-summary pcp-table-scroll"></div></section><section><h3>Detalhes das ocorrências</h3><div class="cg-stops-details pcp-table-scroll"></div></section></div>';
  document.body.append(dialog);const view=dialog.querySelector('select'),status=dialog.querySelector('.cg-stops-status'),summary=dialog.querySelector('.cg-stops-summary'),detail=dialog.querySelector('.cg-stops-details');let context={},controller,generation=0;
  const table=(head,rows)=>'<table><thead><tr>'+head.map(h=>'<th>'+esc(h)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(r=>'<tr>'+r.map(v=>'<td>'+esc(v??'—')+'</td>').join('')+'</tr>').join('')+'</tbody></table>';
  async function load(){const id=++generation;controller?.abort();controller=new AbortController();status.textContent='Carregando paradas…';summary.replaceChildren();detail.replaceChildren();dialog.setAttribute('aria-busy','true');
   try{const result=await api('/api/pcp/comparativo/paradas',{...context,visao:view.value},{silent:true,signal:controller.signal});if(id!==generation)return;if(!result.ok)throw Error('Consulta não concluída');
    const total=result.cobertura_completa||result.total_ocorrencias?result.total_minutos:null;
    summary.innerHTML=table(['Tipos de parada','Tempo total (minutos)','Tempo total (horas)','%'],[...result.resumo.map(r=>[r.tipo,num(r.minutos),hours(r.minutos),pct(r.participacao)]),['TOTAL',num(total),total==null?'—':hours(total),total? '100,00%':total===0?'0,00%':'—']]);summary.querySelector('tbody tr:last-child')?.classList.add('cg-stops-total');
    detail.innerHTML=result.detalhes.length?table(['Data','Unidade','Célula','Descrição','Hora inicial','Hora final','Tempo (min)','Observação','Equipamento','Usuário'],result.detalhes.map(r=>[day(r.data),unit(r.unidade),r.celula,r.tipo,r.hora_inicial,r.hora_final,num(r.minutos),r.observacao,r.equipamento,r.usuario])):'<p>Sem ocorrências nos dados carregados para este período.</p>';
    status.textContent=num(result.total_ocorrencias)+' ocorrências · Meta a definir'+(result.cobertura_completa?'':' · Cobertura parcial: há dias ainda sem carga confirmada.');
   }catch(e){if(e.name!=='AbortError'&&id===generation){status.textContent='Não foi possível carregar as paradas. Tente novamente.';summary.replaceChildren();detail.replaceChildren();}}
   finally{if(id===generation)dialog.setAttribute('aria-busy','false');}
  }
  view.onchange=load;dialog.querySelector('.cg-stops-close').onclick=()=>dialog.close();dialog.addEventListener('close',()=>{++generation;controller?.abort();});
  return {open:q=>{context={ano:q.ano,mes:q.mes,...(q.dias?{dias:q.dias}:{})};view.value=q.visao||'geral';dialog.querySelector('.cg-stops-context').textContent=(q.dias?day(q.dias.split(',')[0]):q.mes+'/'+q.ano)+' · Dados até D−1';if(!dialog.open)dialog.showModal();load();}};
 }
 return {create};
})();
