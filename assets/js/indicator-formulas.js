"use strict";
(() => {
 const catalog=window.IndicatorFormulaCatalog;if(!catalog)return;
 const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').trim();
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const page=()=>catalog.sector==='pcp'?(document.body.dataset.page?.replace('report-','')||new URLSearchParams(location.search).get('relatorio')||'g8'):(document.body.dataset.page||new URLSearchParams(location.search).get('relatorio')||(catalog.sector==='suprimentos'?'prazo':'frete'));
 const docs=()=>catalog.pages[page()]||[];
 const labelOf=el=>{const clone=el.cloneNode(true);clone.querySelectorAll('[data-indicator-formula]').forEach(b=>b.remove());return clone.textContent.trim();};
 function find(label){const key=norm(label);return docs().find(d=>[d.nome,...(d.aliases||[])].some(n=>norm(n)===key));}
 let dialog,opener,previousOverflow;
 function ensureDialog(){
  if(dialog)return dialog;
  dialog=document.createElement('dialog');dialog.className='if-dialog';dialog.id='indicatorFormulaDialog';dialog.setAttribute('aria-labelledby','indicatorFormulaTitle');
  dialog.innerHTML='<header class="if-dialog-header"><div><p class="if-eyebrow">FÓRMULA DO INDICADOR</p><h2 id="indicatorFormulaTitle"></h2></div><button type="button" class="if-close" aria-label="Fechar fórmula" autofocus>×</button></header><div class="if-dialog-content"></div>';
  document.body.append(dialog);dialog.querySelector('.if-close').addEventListener('click',()=>dialog.close());
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const r=dialog.getBoundingClientRect();if(event.clientX<r.left||event.clientX>r.right||event.clientY<r.top||event.clientY>r.bottom)dialog.close();});
  dialog.addEventListener('close',()=>{document.body.style.overflow=previousOverflow??'';if(opener?.isConnected)opener.focus({preventScroll:true});});
  return dialog;
 }
 function section(d,index){
  const reference=d.referencia&&catalog.references[d.referencia];
  return '<section class="if-metric" aria-labelledby="if-metric-'+index+'">'+(index!==0?'<hr>':'')+'<h3 id="if-metric-'+index+'">'+esc(d.nome)+'</h3><p class="if-label">FÓRMULA</p><pre class="if-expression"><code>'+esc(d.formula)+'</code></pre><p class="if-label">DESCRIÇÃO</p><p>'+esc(d.descricao)+'</p><h4>Colunas utilizadas</h4><div class="if-columns">'+d.colunas.map(c=>'<code>'+esc(c)+'</code>').join(' ')+'</div><h4>Como calcular</h4><ol>'+d.passos.map(s=>'<li>'+esc(s)+'</li>').join('')+'</ol>'+(reference?'<details class="if-reference"><summary>Ver regra atual da API</summary><pre><code>'+esc(reference)+'</code></pre></details>':'')+(d.dax?'<details class="if-reference"><summary>Ver DAX de referência do modelo original</summary><p>Referência do modelo original. A fórmula e a regra atual da API, acima, descrevem o relatório em uso.</p><pre><code>'+esc(d.dax)+'</code></pre></details>':'')+'</section>';
 }
 function open(items,button){
  if(!items.length)return;opener=button;const modal=ensureDialog();modal.querySelector('#indicatorFormulaTitle').textContent=items.length===1?items[0].nome:'Fórmulas do relatório';modal.querySelector('.if-dialog-content').innerHTML=items.map(section).join('');
  // A single-metric title is already in the header.
  if(items.length===1)modal.querySelector('.if-metric>h3').hidden=true;
  if(!modal.open){previousOverflow=document.body.style.overflow;document.body.style.overflow='hidden';modal.showModal();}
  modal.scrollTop=0;modal.querySelector('.if-close').focus({preventScroll:true});
 }
 function addButton(header){
  if(header.querySelector(':scope > [data-indicator-formula]'))return;
  header.classList.add('if-formula-header');
  const button=document.createElement('button');button.type='button';button.className='if-button';button.dataset.indicatorFormula='all';button.textContent='ƒx';
  button.title='Ver fórmulas deste relatório';button.setAttribute('aria-label',button.title);button.setAttribute('aria-haspopup','dialog');
  button.addEventListener('click',event=>{event.preventDefault();event.stopPropagation();open(docs(),button);});
  header.append(button);
 }
 let scheduled=false;
 function scan(){scheduled=false;
  if(!docs().length)return;
  document.querySelectorAll('.card > header').forEach(header=>{
   const heading=header.querySelector('h2,h3');
   if(heading&&!header.closest('dialog')&&!/filtro|pendencia/i.test(norm(labelOf(heading))))addButton(header);
  });
 }
 const observer=new MutationObserver(records=>{if(records.every(r=>r.target.closest?.('.if-dialog')))return;if(!scheduled){scheduled=true;requestAnimationFrame(scan);}});
 observer.observe(document.body,{childList:true,subtree:true});scan();
 window.IndicatorFormulas={find,open:label=>{const d=find(label);if(d)open([d],document.activeElement);},scan};
})();
