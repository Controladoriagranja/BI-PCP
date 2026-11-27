"""Executa o clique, abre sua URL em g5 e compara o percentual com a mesma API simulada."""
from pathlib import Path
from datetime import date
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import functools,html,json,os,re,subprocess,sys,threading
ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'backend/eficiencia'))
from pcp_eficiencia_capacidade import aplicar_formula_capacidade
from test_pcp_productivity_browser import SCRIPT

TEST=r'''
(async()=>{const assert=(v,m)=>{if(!v)throw Error(m);},flush=()=>new Promise(r=>setTimeout(r,100));try{
 await document.fonts.ready;await flush();await flush();
 if(new URLSearchParams(location.search).get('relatorio')==='g5'){
  const expected=window.expectedClick||JSON.parse(sessionStorage.getItem('efficiency-click'));
  assert(expected,'Contexto do clique recebido');const uid=expected.company==='10,111'?'total':expected.company;
  assert(document.getElementById('efInicio').value===expected.start&&document.getElementById('efFim').value===expected.end,'Mesmo período');
  const table=expected.kind==='day'?'#efDiario':'#efResumo';
  const row=document.querySelector(table+' tr[data-ef-unit="'+uid+'"][data-ef-metric="eficiencia"]');
  assert(row,'Linha correspondente à empresa ou combinação');
  const cells=row.querySelectorAll('td'),value=cells[expected.kind==='day'?0:cells.length-1].textContent.trim();
  assert(value===expected.value,'Percentual diferente: clique '+expected.value+' / destino '+value);
  assert(document.querySelector('[data-ef-calendar-target]')?.textContent.trim()===expected.value,'Resultado clicado identificado na tela de destino');
  if(expected.kind!=='day')assert(document.querySelector('#efResumo thead th:last-child').textContent==='Total do período','Comparação com o total do recorte');
  assert(!errors.length,'Sem erros JS: '+errors.join('; '));
  document.getElementById('test-result').textContent=JSON.stringify({ok:true,case:expected.case,clicked:expected.value,destination:value,company:expected.company,start:expected.start,end:expected.end,width:innerWidth});return;
 }
 const spec=__CASE__,flag=document.querySelector('input[name="cgTipoIndicador"][value="produtividade"]');flag.click();await flush();
 const unit=document.getElementById('cgUnidade');unit.value=spec.unit;unit.dispatchEvent(new Event('change',{bubbles:true}));await flush();await flush();
 let link;
 if(spec.kind==='day')link=document.querySelector('[data-cg-day="2026-11-02"]').closest('td').querySelector('a[data-cg-efficiency]');
 else if(spec.kind==='week')link=document.querySelector('[data-cg-total="week-0"] a[data-cg-efficiency]');
 else if(spec.kind==='weekday')link=document.querySelector('[data-cg-total="weekday-1"] a[data-cg-efficiency]');
 else{
  const row=document.querySelector(spec.kind==='annual'?'[data-cg-total-year="2026"]':'[data-cg-month-period="2026-11"]');
  link=row.querySelector(spec.column+' a[data-cg-efficiency]');
 }
 assert(link,'Link encontrado: '+spec.name);
 // Ordem em todos os locais: Aves Abat vs Meta, Eficiência e Peso médio.
 for(const cell of document.querySelectorAll('#cgProdutividade td')){
  const eff=cell.querySelector('.cg-productivity-efficiency'),mean=cell.querySelector('.cg-calendar-mean'),adherence=cell.querySelector('.cg-prod-adherence');
  if(eff&&mean){assert(!!(eff.compareDocumentPosition(mean)&Node.DOCUMENT_POSITION_FOLLOWING),'Eficiência antes de Peso médio');if(adherence)assert(!!(adherence.compareDocumentPosition(eff)&Node.DOCUMENT_POSITION_FOLLOWING),'Eficiência abaixo de Aves Abat');}
 }
 const q=new URL(link.href).searchParams;
 const expected={case:spec.name,kind:spec.kind,value:link.querySelector('strong').textContent.trim(),company:q.get('unidade'),start:q.get('data_inicio'),end:q.get('data_fim')};
 link.addEventListener('click',event=>event.preventDefault(),{once:true});link.click();await flush();
 assert(document.querySelector('input[name="cgTipoIndicador"][value="produtividade"]').checked,'Clique em eficiência não abre Rendimento');
 document.getElementById('test-result').textContent=JSON.stringify({ok:true,phase:'clicked',expected,url:link.href});
}catch(e){document.getElementById('test-result').textContent=JSON.stringify({ok:false,message:e.message,stack:e.stack,errors});}})();
'''

def main():
 out=ROOT/'outputs/eficiencia-navegacao';out.mkdir(parents=True,exist_ok=True)
 fixture=json.loads((ROOT/'tools/fixtures/produtividade-novembro-2026.json').read_text(encoding='utf8'))
 rows=[]
 for d,uid,heads,dead,tara in [(2,'10',101373,239,'22:47:00'),(2,'111',74055,440,'16:36:00'),(3,'10',120945,0,'22:22:00'),(3,'111',68532,0,'16:10:00')]:
  day=date(2026,11,d);rows.append({'data':day,'unidade':uid,'empresa':'Ave Nova' if uid=='10' else 'Real Alimentos','chave_semana':'2026-45','cabecas':heads,'mortos_transporte_cab':dead,'data_tara':day,'horario_tara':tara})
 result=aplicar_formula_capacidade({'dias':rows,'resumo_semanal':[{'chave':'2026-45','ano':2026,'semana':45,'meta':.95,'valores':[{'unidade':'10'},{'unidade':'111'}]}],'semanas':[{'chave':'2026-45','ano':2026,'semana':45}]})
 result.update(ok=True,contrato='eficiencia-abate-v1',data_limite=fixture['limit'],periodo_disponivel={'inicio':'2026-01-01','fim':fixture['limit']},ultima_atualizacao='2026-11-04T08:00:00-03:00')
 override=r'''const efficiencyFixture=__DATA__,baseGet=window.apiGet;
 window.apiGet=async(endpoint,p={},options)=>{
  if(endpoint!=='/api/pcp/comparativo/eficiencia-abate')return baseGet(endpoint,p,options);
  const result=structuredClone(efficiencyFixture);result.periodo={inicio:p.inicio||'2026-11-01',fim:p.fim&&p.fim<fixture.limit?p.fim:fixture.limit};
  result.dias=result.dias.filter(row=>row.data>=result.periodo.inicio&&row.data<=result.periodo.fim&&(!p.unidade||p.unidade.split(',').includes(row.unidade)));
  result.resumo_semanal=result.resumo_semanal.filter(week=>result.dias.some(row=>row.chave_semana===week.chave));return result;
 };'''.replace('__DATA__',json.dumps(result,default=lambda d:d.isoformat(),ensure_ascii=False))
 template='''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/assets/css/app.css"><link rel="stylesheet" href="/assets/vendor/geist/index.css"><link rel="stylesheet" href="/assets/css/pcp.css"><link rel="stylesheet" href="/assets/css/indicator-formulas.css"></head><body class="pcp-report"><div class="app-shell"><header class="page-header"><div><h1>Comparativo x Cirúrgico Geral</h1><p></p></div><div class="header-toolbar"></div></header><section class="card filter-card"></section><div id="mensagemErro" class="hidden"></div><p id="estadoConsulta"></p><main id="pcpConteudo"></main></div><pre id="test-result" hidden>PENDING</pre><script src="/assets/js/config.js"></script><script>__SCRIPT__</script><script src="/assets/js/filters.js"></script><script src="/assets/js/pcp-multiselect.js"></script><script src="/assets/js/pcp-report-model.js"></script><script src="/assets/js/pcp-table-sort.js"></script><script src="/assets/js/pcp-condenacoes-period.js"></script><script src="/assets/js/pcp-condenacoes.js"></script><script src="/assets/js/pcp-paradas.js"></script><script src="/assets/js/pcp-eficiencia.js"></script><script src="/assets/js/pcp-cirurgico.js"></script><script src="/assets/js/pcp-report.js"></script><script src="/assets/js/indicator-formulas-data.js"></script><script src="/assets/js/indicator-formulas.js"></script><script>__TEST__</script></body></html>'''
 template=template.replace('__SCRIPT__',SCRIPT.replace('__FIXTURE__',json.dumps(fixture,ensure_ascii=False))+override)
 cases=[{'name':'dia-an','kind':'day','unit':'10'},{'name':'dia-real','kind':'day','unit':'111'},{'name':'dia-combinado','kind':'day','unit':'10,111'},{'name':'semana-combinada','kind':'week','unit':'10,111'},{'name':'segunda-combinada','kind':'weekday','unit':'10,111'},{'name':'mensal-an-independente-turno','kind':'month','unit':'2','column':'[data-cg-month-an-total]'},{'name':'mensal-real','kind':'month','unit':'10','column':'td[data-cg-label="Real Alimentos"]'},{'name':'mensal-combinado','kind':'month','unit':'10,111','column':'td[data-cg-label="Total do mês"]'},{'name':'anual-combinado','kind':'annual','unit':'10','column':'td[data-cg-label="Total geral do ano"]'}]
 pages={spec['name']:template.replace('__TEST__',TEST.replace('__CASE__',json.dumps(spec,ensure_ascii=False))) for spec in cases};active={'expected':None}
 class Handler(SimpleHTTPRequestHandler):
  def do_GET(self):
   if self.path.startswith('/index.html'):
    from urllib.parse import urlparse,parse_qs
    q=parse_qs(urlparse(self.path).query);key=q.get('case',[''])[0]
    # A navegação de g5 reutiliza o teste, que lê o contexto do sessionStorage.
    page=pages.get(key,next(iter(pages.values())))
    page=page.replace('<script src="/assets/js/config.js">','<script>window.expectedClick='+json.dumps(active['expected'],ensure_ascii=False)+'</script><script src="/assets/js/config.js">').encode('utf8');self.send_response(200);self.send_header('Content-Type','text/html; charset=utf-8');self.send_header('Content-Length',str(len(page)));self.end_headers();self.wfile.write(page)
   else:super().do_GET()
  def log_message(self,*args):pass
 server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start()
 browser=os.environ.get('PCP_TEST_BROWSER',r'C:\Program Files\Google\Chrome\Application\chrome.exe');results=[]
 try:
  for i,spec in enumerate(cases):
   width=[1366,1440,1920][i%3]
   run=subprocess.run([browser,'--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking',f'--user-data-dir={out/spec["name"]}',f'--window-size={width+16},1000','--force-device-scale-factor=1','--virtual-time-budget=20000','--dump-dom',f'--screenshot={out/(spec["name"]+".png")}',f'http://127.0.0.1:{server.server_port}/index.html?relatorio=g8&case={spec["name"]}'],capture_output=True,timeout=45)
   markup=run.stdout.decode('utf8','replace');(out/(spec['name']+'.html')).write_text(markup,encoding='utf8');match=re.search(r'<pre id="test-result"[^>]*>(.*?)</pre>',markup,re.S)
   value=json.loads(html.unescape(match[1])) if match and match[1]!='PENDING' else {'ok':False,'case':spec['name'],'message':'Navegação não concluiu','stderr':run.stderr.decode('utf8','replace')[-800:]}
   if value.get('phase')=='clicked':
    active['expected']=value['expected']
    command=[browser,'--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking',f'--user-data-dir={out/("dest-"+spec["name"])}',f'--window-size={width+16},1000','--force-device-scale-factor=1','--virtual-time-budget=12000','--dump-dom',f'--screenshot={out/(spec["name"]+"-destino.png")}',value['url']]
    destination=subprocess.run(command,capture_output=True,timeout=30);markup=destination.stdout.decode('utf8','replace');(out/(spec['name']+'-destino.html')).write_text(markup,encoding='utf8');match=re.search(r'<pre id="test-result"[^>]*>(.*?)</pre>',markup,re.S)
    value=json.loads(html.unescape(match[1])) if match and match[1]!='PENDING' else {'ok':False,'case':spec['name'],'message':'Destino não concluiu'}
   results.append(value);print(json.dumps(value,ensure_ascii=True),flush=True)
 finally:server.shutdown()
 (out/'results.json').write_text(json.dumps(results,indent=2),encoding='utf8');raise SystemExit(0 if all(item['ok'] for item in results) else 1)

if __name__=='__main__':main()
