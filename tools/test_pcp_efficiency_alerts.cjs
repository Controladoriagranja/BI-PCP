const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict'),vm=require('node:vm');
const {chromium}=require('C:/Users/vchaves/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const root=path.join(__dirname,'..'),out=path.resolve(root,'..'),results=[];
async function main(){
 const source=await fs.readFile(path.join(root,'assets/js/pcp-eficiencia.js'),'utf8'),context={window:{},ApiScreen:{escape:String}};
 vm.runInNewContext(source.replace('return {mount};','return {mount,efficiencyAlerts};'),context);
 const alert=context.window.PcpEficiencia.efficiencyAlerts;
 const rows=[{data:'2026-11-16',unidade:'10',eficiencia:1.12},{data:'2026-11-16',unidade:'111',eficiencia:.49},{data:'2026-11-17',unidade:'10',eficiencia:1},{data:'2026-11-17',unidade:'111',eficiencia:.5},{data:'2026-11-18',unidade:'10',eficiencia:null},{data:'2026-11-18',unidade:'111',eficiencia:.91},{data:'2026-11-19',unidade:'10',eficiencia:0},{data:'2026-11-23',unidade:'10',eficiencia:1.1}];
 assert.equal(alert(rows).length,4);assert.equal(alert(rows,'111').length,1);assert.equal(alert(rows,'10').length,3);
 assert.equal(alert(rows.filter(r=>r.data==='2026-11-17')).length,0,'50% e 100% exatos não geram alertas');
 assert.equal(alert([{data:'2026-11-16',unidade:'10',eficiencia:NaN},{data:'2026-11-16',unidade:'111',eficiencia:Infinity}]).length,0);
 assert.equal(alert([...rows,rows[0]]).length,4,'Empresa/data não duplica');
 const data=rows.map(row=>({...row,empresa:row.unidade==='10'?'Ave Nova':'Real Alimentos',chave_semana:row.data<'2026-11-23'?'2026-47':'2026-48',capacidade_nominal_aves:row.eficiencia==null?null:100000,aves_abatidas_liquidas:row.eficiencia==null?null:row.eficiencia*100000,cabecas:100000,tempo_real_horas:10,tempo_ideal_horas:9}));
 const browser=await chromium.launch({headless:true,executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe'});
 try{for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  try{
   await page.route('http://pcp.local/**',route=>route.fulfill({contentType:'text/html',body:'<!doctype html><body class="pcp-report"><div class="app-shell"><section class="filter-card"></section><div id="mensagemErro" class="hidden"></div><p id="estadoConsulta"></p><main id="pcpConteudo"></main></div></body>'}));
   await page.goto('http://pcp.local/');
   for(const f of ['app.css','pcp.css'])await page.addStyleTag({content:await fs.readFile(path.join(root,'assets/css',f),'utf8')});
   await page.evaluate(rows=>{
    window.APP_CONFIG={endpoints:{filtros:'/unused'}};window.ApiScreen={escape:v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]))};window.PcpMobileScroll={active:()=>false};window.calls=[];window.setInterval=()=>0;
    window.apiGet=async(endpoint,p={})=>{calls.push({endpoint,...p});const days=rows.filter(r=>(!p.inicio||r.data>=p.inicio)&&(!p.fim||r.data<=p.fim)&&(!p.unidade||p.unidade.split(',').includes(r.unidade))&&(!p.semanas||p.semanas.split(',').includes(r.chave_semana)));const keys=[...new Set(days.map(r=>r.chave_semana))];return {ok:true,contrato:'eficiencia-abate-v1',revisao_formulas:'eficiencia-capacidade-v3',dias:days,semanas:keys.map(chave=>({chave,ano:2026,semana:Number(chave.slice(5))})),resumo_semanal:keys.map(chave=>({chave,ano:2026,semana:Number(chave.slice(5)),meta:.95,valores:[]})),periodo:{inicio:p.inicio||'2026-11-16',fim:p.fim||'2026-11-23'},periodo_disponivel:{inicio:'2026-01-01',fim:'2026-11-26'},data_limite:'2026-11-26'};};
   },data);
   for(const f of ['filters.js','pcp-multiselect.js'])await page.addScriptTag({content:await fs.readFile(path.join(root,'assets/js',f),'utf8')});
   await page.addScriptTag({content:source});await page.evaluate(()=>PcpEficiencia.mount());
   const wait=()=>page.waitForFunction(()=>document.getElementById('estadoConsulta').textContent.startsWith('Dados reais'));
   await wait();const box=page.locator('#efOutlierAlert');
   const parameters=page.locator('.ef-parameters');assert.equal(await parameters.isVisible(),true);assert.equal(await parameters.evaluate(el=>el.open),false);await parameters.locator('summary').click();assert.equal(await parameters.evaluate(el=>el.open),true);assert.equal(await parameters.locator('tbody tr').count(),2);
   const parameterRows=await parameters.locator('tbody tr').allTextContents();assert.match(parameterRows[0],/10\.800.*72 min.*60 min.*132 min/);assert.match(parameterRows[1],/9\.500.*70 min.*Não tem.*70 min/);
   const left=await box.boundingBox(),right=await parameters.boundingBox();if(width>900){assert(right.x>=left.x+left.width);assert(Math.abs(right.width-left.width)<2);}else assert(right.y>=left.y+left.height);
assert.equal(await box.isVisible(),true);assert.equal(await box.evaluate(el=>el.open),false);
   assert.match(await box.locator('summary').textContent(),/4 casos/);assert.equal(await page.locator('#pcpConteudo').evaluate(el=>el.firstElementChild.id),'efTopPanels');
   assert(left.height<55,'Alerta recolhido compacto');assert(right.height<180,'Parâmetros compactos');assert.equal(await parameters.evaluate(el=>el.scrollWidth<=el.clientWidth),true);await page.screenshot({path:path.join(out,'compacto-'+width+'.png')});
   await box.locator('summary').click();assert.equal(await box.locator('li').count(),4);assert.match(await box.textContent(),/112,0%/);assert.match(await box.textContent(),/49,0%/);
   await page.screenshot({path:path.join(out,'alerta-'+width+'.png')});
   await page.evaluate(()=>{const f=document.getElementById('efUnidade');f.value='111';f.dispatchEvent(new Event('change',{bubbles:true}));});await page.waitForFunction(()=>document.querySelectorAll('#efOutlierAlert li').length===1);assert.match(await box.locator('li').textContent(),/Real Alimentos/);
   await page.evaluate(()=>{document.getElementById('efInicio').value='2026-11-17';const f=document.getElementById('efFim');f.value='2026-11-18';f.dispatchEvent(new Event('change',{bubbles:true}));});await page.waitForFunction(()=>document.getElementById('efOutlierAlert').hidden);assert.equal(await parameters.isVisible(),true);assert.equal(await box.locator('li').count(),0);
   await page.locator('#efLimpar').click();assert.equal(await parameters.evaluate(el=>el.open),false);assert.equal(await box.evaluate(el=>el.open),false);await page.waitForFunction(()=>document.querySelectorAll('#efOutlierAlert li').length===4);assert.equal(await box.evaluate(el=>el.open),false);
   await page.locator('#efSemana>button').click();await page.locator('#efSemana input[value="2026-47"]').click();await page.waitForFunction(()=>document.querySelectorAll('#efOutlierAlert li').length===3);assert.doesNotMatch(await box.textContent(),/23\/11\/26/);
   // Recorte não contíguo recebido do calendário também restringe os casos.
   await page.evaluate(()=>history.replaceState({},'','/?data_inicio=2026-11-16&data_fim=2026-11-23&datas=2026-11-16&unidade=10,111&origem=produtividade'));
   await page.evaluate(()=>{document.querySelector('.pcp-comparativo-filtros').classList.add('filter-card');PcpEficiencia.mount();});await page.waitForFunction(()=>document.querySelectorAll('#efOutlierAlert li').length===2);assert.match(await box.textContent(),/16\/11\/26/);assert.doesNotMatch(await box.textContent(),/19\/11|23\/11/);
   assert.deepEqual(errors,[]);results.push({width,ok:true,strict_boundaries:true,company_filter:true,date_filter:true,week_filter:true,calendar_dates:true});console.log('PASS '+width+'px: alerta compacto, expandir, limites estritos e todos os recortes');
  }finally{await page.close();}
 }}finally{await browser.close();await fs.writeFile(path.join(out,'testes-alertas.json'),JSON.stringify(results,null,2));}
}
main().catch(e=>{console.error(e);process.exitCode=1;});
