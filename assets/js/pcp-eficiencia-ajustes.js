"use strict";
window.PcpAjustesEficiencia=(()=>{
 const endpoint='/api/pcp/comparativo/eficiencia-abate/ajustes',esc=ApiScreen.escape;
 const pct=v=>v==null?'—':(100*v).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'%';
 const duration=v=>{if(v==null)return '—';let s=Math.round(v*3600);return [Math.floor(s/3600),Math.floor(s%3600/60),s%60].map(x=>String(x).padStart(2,'0')).join(':');};
 function mount(reload){
  const open=document.createElement('button');open.type='button';open.className='button';open.id='efAjustesAbrir';open.textContent='Ajustes manuais';open.hidden=true;document.querySelector('.pcp-comparativo-filter-head>div').append(open);
  const panel=document.createElement('section');panel.className='card pcp-report-panel';panel.id='efAjustesPainel';panel.hidden=true;
  panel.innerHTML='<h2>Ajustes manuais de horário</h2><p>Exclusivo do admin. Informe os horários locais e o total de pausas. O ajuste recalcula o tempo de abate, a eficiência e o resumo semanal. O ticket e a tara de origem são preservados.</p><form id="efAjustesForm"><div class="pcp-comparativo-filter-grid"><label>Data de abate<input id="efAjustesData" type="date" required></label><label>Unidade<select id="efAjustesUnidade"><option value="10">Ave Nova</option><option value="111">Real Alimentos</option></select></label></div><p><button class="button" id="efAjustesConsultar" type="button">Consultar dia</button></p><p id="efAjustesOrigem"></p><fieldset id="efAjustesEdicao" disabled><legend>Horários para este dia</legend><div class="pcp-comparativo-filter-grid"><label>Início (horário local)<input id="efAjustesInicio" type="datetime-local" step="1" required></label><label>Término (horário local)<input id="efAjustesFim" type="datetime-local" step="1" required></label><label>Total de pausas (minutos)<input id="efAjustesPausas" type="number" min="0" max="1440" step="1" required></label></div><label>Motivo da alteração<textarea id="efAjustesMotivo" rows="3" minlength="10" maxlength="1000" required style="display:block;width:100%;box-sizing:border-box"></textarea></label><p><button class="button" id="efAjustesPrevia" type="button">Calcular prévia</button> <button class="button" id="efAjustesSalvar" type="button" disabled>Salvar ajuste</button> <button class="button" id="efAjustesRevogar" type="button" disabled>Desfazer ajuste ativo</button></p></fieldset></form><p id="efAjustesResultado" role="status" aria-live="polite"></p><div id="efAjustesHistorico"></div>';
  document.getElementById('pcpConteudo').prepend(panel);const $=id=>document.getElementById('efAjustes'+id);let state=null,preview=null,busy=false,allowed=false,rows=[];
  function key(){return {data:$('Data').value,unidade:$('Unidade').value};}
  function horarios(){return {inicio:$('Inicio').value,fim:$('Fim').value,pausas_minutos:Number($('Pausas').value)};}
  const fingerprint=()=>JSON.stringify({...key(),horarios:horarios()});
  function clearPreview(){preview=null;$('Salvar').disabled=true;$('Resultado').textContent='';}
  function reset(){state=null;clearPreview();$('Edicao').disabled=true;$('Origem').textContent='';$('Historico').replaceChildren();}
  async function rpc(action,body={}){
   // O Worker mantém o Basic interno. A API revalida esta sessão na CENTRAL;
   // o token nunca integra o cadastro ou o histórico de ajustes.
   try{return await requestApi(endpoint+'/'+action,{}, {method:'POST',body:JSON.stringify({...body,portal_token:getPortalToken()}),headers:{'Content-Type':'application/json'},silent:true});}
   catch(e){if(e.status===401||e.status===403){allowed=false;open.hidden=true;panel.hidden=true;state=null;preview=null;}throw e;}
  }
  function failure(e){$('Resultado').textContent=e.status===409?'Outro administrador alterou os ajustes. Consulte o dia novamente antes de salvar.':e.status===422?'Confira a data de abate, os horários, as pausas e o motivo (mínimo de 10 caracteres).':e.message;}
  async function run(work){if(busy)return;busy=true;try{await work();}catch(e){clearPreview();failure(e);}finally{busy=false;}}
  function history(data){
   const records=data.historico;
   $('Historico').innerHTML='<h3>Histórico deste dia</h3>'+(records.length?'<div style="overflow-x:auto"><table><thead><tr><th>Quando</th><th>Responsável</th><th>Ação</th><th>Horários anteriores</th><th>Horários novos</th><th>Motivo</th></tr></thead><tbody>'+records.map(r=>{
    const times=v=>v?.horarios?String(v.horarios.inicio).replace('T',' ')+' a '+String(v.horarios.fim).replace('T',' ')+'; pausas '+v.horarios.pausas_minutos+' min':'Apontamento original';
    return '<tr>'+[new Date(r.instante).toLocaleString('pt-BR'),r.usuario,r.acao==='salvar'?'Ajuste salvo':'Ajuste desfeito',times(r.antes),times(r.depois),r.motivo].map(v=>'<td>'+esc(v)+'</td>').join('')+'</tr>';
   }).join('')+'</tbody></table></div><p>Exibidas as últimas 100 alterações deste dia.</p>':'<p>Nenhuma alteração registrada neste dia.</p>');
  }
  async function consultar(){
   if(!$('Data').reportValidity())return;
   const selected=key();reset();const data=await rpc('consultar',selected);if(JSON.stringify(selected)!==JSON.stringify(key()))return;
   state=data;const day=data.dia,original=day.original,h=data.ajuste?.horarios;
   $('Inicio').value=h?.inicio||selected.data+'T06:00:00';$('Inicio').min=selected.data+'T00:00:00';$('Inicio').max=selected.data+'T23:59:59';
   $('Fim').value=h?.fim||(original.data_tara&&original.horario_tara?original.data_tara+'T'+original.horario_tara:'');$('Pausas').value=h?.pausas_minutos??original.regra_aplicada.pausas_minutos;$('Motivo').value='';
   $('Origem').textContent='Ticket de origem: '+(day.ticket||'não disponível')+' · Tara de origem: '+(original.data_tara||'—')+' '+(original.horario_tara||'')+' · Tempo original: '+duration(original.tempo_real_horas)+' · Tempo atual: '+duration(day.tempo_real_horas)+' · Eficiência atual: '+pct(day.eficiencia)+(data.ajuste?' · Ajuste ativo.':' · Sem ajuste administrativo.');
   $('Edicao').disabled=false;$('Revogar').disabled=!data.ajuste;history(data);
  }
  open.onclick=()=>{panel.hidden=!panel.hidden;if(!panel.hidden){$('Data').focus();panel.scrollIntoView({behavior:'smooth',block:'start'});}};
  $('Form').onsubmit=e=>e.preventDefault();$('Consultar').onclick=()=>run(consultar);
  for(const name of ['Data','Unidade'])$(name).onchange=reset;
  for(const name of ['Inicio','Fim','Pausas'])$(name).oninput=clearPreview;
  $('Previa').onclick=()=>run(async()=>{
   if(!state||!['Inicio','Fim','Pausas'].every(n=>$(n).reportValidity()))return;
   const stamp=fingerprint(),data=await rpc('previa',{...key(),horarios:horarios()});if(stamp!==fingerprint())return;
   preview=stamp;$('Resultado').textContent='Prévia: tempo de abate '+duration(data.tempo_real_horas)+' e eficiência '+pct(data.eficiencia)+' (atual: '+duration(data.tempo_real_atual_horas)+' e '+pct(data.eficiencia_atual)+'). Nenhuma alteração foi salva.';$('Salvar').disabled=false;
  });
  $('Salvar').onclick=()=>run(async()=>{
   if(!allowed||!state||preview!==fingerprint()||!$('Form').reportValidity())return;
   await rpc('salvar',{...key(),horarios:horarios(),versao:state.versao,motivo:$('Motivo').value.trim()});await consultar();await reload();$('Resultado').textContent='Ajuste salvo. Indicadores diários e semanais recalculados.';
  });
  $('Revogar').onclick=()=>run(async()=>{
   if(!allowed||!state?.ajuste||!$('Motivo').reportValidity())return;
   await rpc('revogar',{...key(),versao:state.versao,motivo:$('Motivo').value.trim()});await consultar();await reload();$('Resultado').textContent='Ajuste desfeito. O cálculo voltou aos horários de origem.';
  });
  rpc('sessao').then(session=>{allowed=session.admin===true;open.hidden=!allowed;}).catch(()=>{open.hidden=true;});
  return {setRows(values){rows=values;if(!state&&rows.length){$('Data').max=rows.map(r=>r.data).sort().at(-1);if(!$('Data').value)$('Data').value=$('Data').max;}}};
 }
 return {mount};
})();
