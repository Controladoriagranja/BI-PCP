"use strict";
(async()=>{
 const $=id=>document.getElementById(id),esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));let catalog=[],page=1,generation=0,abort;
 function fail(e){$('resultadoModelo').replaceChildren();$('mensagemErro').textContent=e.message;$('mensagemErro').classList.remove('hidden');$('estadoModelo').textContent='Consulta indisponível. Nenhum número de exemplo foi exibido.';}
 async function load(){
  const id=++generation;abort?.abort();abort=new AbortController();$('resultadoModelo').replaceChildren();$('mensagemErro').classList.add('hidden');$('estadoModelo').textContent='Consultando resultados…';
  try{const name=$('tabelaModelo').value;const result=await apiGet(APP_CONFIG.endpoints.tabelaModelo+encodeURIComponent(name),{pagina:page,tamanho:25},{signal:abort.signal});if(id!==generation)return;
   if(result.usa_csv_como_fonte!==false||!Array.isArray(result.dados))throw Error('A consulta não confirmou uma fonte real disponível.');
   const entry=catalog.find(t=>t.tabela===name),columns=result.colunas||entry.colunas_modelo;const rows=result.dados;
   const total=result.total;const pages=total==null?null:Math.ceil(total/25);
   $('resultadoModelo').innerHTML='<section class="card"><div class="pcp-section-head"><h2>'+esc(name)+'</h2><span>'+(total==null?'Contagem não informada':Number(total).toLocaleString('pt-BR')+' registros')+'</span></div><div class="pcp-table-scroll">'+(rows.length?'<table class="pcp-raw-table"><thead><tr>'+columns.map(c=>'<th>'+esc(c)+'</th>').join('')+'</tr></thead><tbody>'+rows.map(row=>'<tr>'+columns.map(c=>'<td>'+esc(row[c]??'—')+'</td>').join('')+'</tr>').join('')+'</tbody></table>':'<div class="pcp-notice">Nenhum registro disponível nesta consulta.</div>')+'</div><div class="pcp-pager"><span>Página '+page+(pages==null?'':' de '+Math.max(pages,1))+'</span><div><button class="button" id="modeloAnterior" '+(page<=1?'disabled':'')+'>← Anterior</button><button class="button" id="modeloProxima" '+(pages==null||page>=pages?'disabled':'')+'>Próxima →</button></div></div></section>';
   $('modeloAnterior').onclick=()=>{page--;load();};$('modeloProxima').onclick=()=>{page++;load();};$('estadoModelo').textContent='Resultados retornados pela consulta preparada · '+name;
  }catch(e){if(e.name!=='AbortError'&&id===generation)fail(e);}
 }
 try{const result=await apiGet(APP_CONFIG.endpoints.modelo);catalog=result.tabelas;if(catalog.length!==45)throw Error('Catálogo PCP incompleto.');$('tabelaModelo').innerHTML=catalog.map(t=>'<option value="'+esc(t.tabela)+'">'+esc(t.tabela)+'</option>').join('');$('estadoModelo').textContent='45 consultas cadastradas. Selecione uma tabela para conferir.';}catch(e){fail(e);}
 $('consultarModelo').onclick=()=>{page=1;load();};$('tabelaModelo').onchange=()=>{page=1;$('resultadoModelo').replaceChildren();$('mensagemErro').classList.add('hidden');$('estadoModelo').textContent='Clique em Consultar resultados para carregar a nova tabela.';};
})();
