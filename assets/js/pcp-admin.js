"use strict";
(() => {
 const $=id=>document.getElementById(id);let state=null,manual=[];
 const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 async function api(path,options={}){
  if(options.method)return apiWrite(path,JSON.parse(options.body),options.method);
  return apiGet(path);
 }
 function error(e){$('error').textContent=e.message;$('error').hidden=false;}
 function companies(){return state.parametros_originais.parametros_efic_abate_geral.map(r=>r.Empresa);}
 function rowAbate(record={}){
  const tr=document.createElement('tr');tr.innerHTML='<td><input class="data" type="date" aria-label="Data" value="'+escape(record.Data)+'"></td><td><select class="empresa" aria-label="Empresa">'+companies().map(c=>'<option>'+escape(c)+'</option>').join('')+'</select></td><td><select class="almoco" aria-label="Tem Almoco"><option value="">Sem ajuste</option><option value="Sim">Sim</option><option value="Não">Não</option></select></td><td><input class="hora" type="text" placeholder="07:46:00 ou decimal" aria-label="Hora Abate Manual" value="'+escape(record['Hora Abate Manual'])+'"></td><td><button type="button" class="remove">Remover</button></td>';
  if(record.Empresa)tr.querySelector('.empresa').value=record.Empresa;if(record['Tem Almoco']==='não'){const option=document.createElement('option');option.value='não';option.textContent='não (origem)';tr.querySelector('.almoco').appendChild(option);}tr.querySelector('.almoco').value=record['Tem Almoco']??'';tr.querySelector('.remove').onclick=()=>tr.remove();$('abate-body').appendChild(tr);
 }
 function renderPmfob(){
  $('pmfob-body').replaceChildren();state.pmfob.forEach((row,index)=>{
   const enabled=manual.some(m=>m['Nome da Origem']===row['Nome da Origem']&&m.Produtos===row.Produtos);
   const tr=document.createElement('tr');tr.dataset.index=index;tr.dataset.search=(String(row.Produtos)+' '+row['Descrição']).toLocaleLowerCase('pt-BR');
   tr.innerHTML='<td><input class="enabled" type="checkbox" aria-label="Ajuste manual do produto '+escape(row.Produtos)+'" '+(enabled?'checked':'')+'></td>'+['Nome da Origem','Produtos','Descrição','Familia'].map(k=>'<td>'+escape(row[k])+'</td>').join('')+['Peso Total','Faturamento FOB','PM FOB Item'].map((k,i)=>'<td><input class="value-'+i+'" type="number" step="'+(i===0?'1':'any')+'" aria-label="'+escape(k)+'" value="'+escape(row[k])+'" '+(enabled?'':'disabled')+'></td>').join('');
   tr.querySelector('.enabled').onchange=e=>tr.querySelectorAll('input[type=number]').forEach(input=>input.disabled=!e.target.checked);$('pmfob-body').appendChild(tr);
  });
 }
 async function load(){
  $('status').textContent='Carregando configurações…';$('error').hidden=true;
  state=await api('/api/pcp-modelo/admin/configuracao');
  manual=state.pmfob_ajustes;
  $('abate-body').replaceChildren();state.ajustes_abate.forEach(rowAbate);renderPmfob();$('status').textContent='Configuração carregada · versão '+state.versao+' · exclusivo do admin';
 }
 function num(input){return input.value===''?null:Number(input.value);}
 async function save(path,records,button){
  button.disabled=true;$('error').hidden=true;
  try{const result=await api(path,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({versao:state.versao,registros:records})});await load();$('status').textContent='Alterações salvas · versão '+result.versao;}
  catch(e){error(e);}finally{button.disabled=false;}
 }
 $('add-abate').onclick=()=>{if(state)rowAbate();};
 $('save-abate').onclick=()=>{if(!state)return;const rows=[...$('abate-body').rows].map(tr=>({data:tr.querySelector('.data').value,empresa:tr.querySelector('.empresa').value,tem_almoco:tr.querySelector('.almoco').value||null,hora_abate_manual:tr.querySelector('.hora').value||null}));save('/api/pcp-modelo/admin/ajustes-abate',rows,$('save-abate'));};
 $('save-pmfob').onclick=()=>{if(!state)return;const rows=[...$('pmfob-body').rows].filter(tr=>tr.querySelector('.enabled').checked).map(tr=>{const r=state.pmfob[Number(tr.dataset.index)];return {'Nome da Origem':r['Nome da Origem'],Produtos:r.Produtos,'Peso Total':num(tr.querySelector('.value-0')),'Faturamento FOB':num(tr.querySelector('.value-1')),'PM FOB Item':num(tr.querySelector('.value-2'))};});save('/api/pcp-modelo/admin/pmfob',rows,$('save-pmfob'));};
 $('search-pmfob').oninput=e=>{const text=e.target.value.toLocaleLowerCase('pt-BR');[...$('pmfob-body').rows].forEach(row=>row.hidden=!row.dataset.search.includes(text));};
 function tab(pmfob){$('pmfob').hidden=!pmfob;$('abate').hidden=pmfob;$('tab-pmfob').setAttribute('aria-pressed',String(pmfob));$('tab-abate').setAttribute('aria-pressed',String(!pmfob));}
 $('tab-pmfob').onclick=()=>tab(true);$('tab-abate').onclick=()=>tab(false);
 apiGet(APP_CONFIG.endpoints.sessao).then(session=>{
  if(!session.visualiza_ajustes)throw new ApiError('Ajustes manuais e PmFOB são exclusivos do admin.',403);
  document.getElementById('adminConteudo').classList.remove('hidden');
  return load();
 }).catch(e=>{document.getElementById('adminConteudo').classList.add('hidden');error(e);});
})();
