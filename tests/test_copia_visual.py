"""Preview de teste em loopback: dados reais, token de teste transitório, sem publicação."""
import sys,json,base64,secrets,threading,asyncio,hashlib,tempfile,zipfile,time
from pathlib import Path
from urllib.parse import urlsplit,parse_qs
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
import requests
from fastapi import FastAPI
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait,Select
ROOT=Path(__file__).resolve().parents[1];PROJECT=ROOT.parent;OUT=PROJECT/'validacao';sys.path.insert(0,str(PROJECT/'api_zootecnico'))
sys.path.insert(0,r"\\192.168.1.139\Controladoria\BI_Granja\Agrosys_Extractor\Robo Banco\PCP\infra")
from banco_pcp import configuracao
from pcp_modelo.router_api import router as modelo
from pcp_modelo.router_admin import router as admin
from pcp_modelo.router_resultados import router as resultados
from pcp_modelo import ajustes
cfg=configuracao();AUTH='Basic '+base64.b64encode((cfg['user']+':'+cfg['password']).encode()).decode();TOKEN=secrets.token_urlsafe(32)
app=FastAPI();app.include_router(modelo);app.include_router(admin);app.include_router(resultados);api_calls=[]
async def asgi(path,query,method,body):
 messages=[];once=False
 async def receive():
  nonlocal once
  if not once:once=True;return {'type':'http.request','body':body,'more_body':False}
  return {'type':'http.disconnect'}
 async def send(message):messages.append(message)
 await app({'type':'http','asgi':{'version':'3.0'},'http_version':'1.1','method':method,'scheme':'http','path':path,'raw_path':path.encode(),'query_string':query.encode(),'headers':[(b'authorization',AUTH.encode()),(b'content-type',b'application/json')],'client':('test',1),'server':('test',80),'root_path':''},receive,send)
 return next(m['status'] for m in messages if m['type']=='http.response.start'),b''.join(m.get('body',b'') for m in messages if m['type']=='http.response.body')
class Handler(SimpleHTTPRequestHandler):
 def __init__(self,*args,**kwargs):super().__init__(*args,directory=str(ROOT),**kwargs)
 def reply(self,status,body,typ='application/json'):
  self.send_response(status);self.send_header('Content-Type',typ);self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
 def do_GET(self):
  path=urlsplit(self.path)
  if path.path=='/assets/js/config.js':
   source=(ROOT/'assets/js/config.js').read_text(encoding='utf-8').replace('https://api-bi-granja.controladoriagb05.workers.dev','http://127.0.0.1:8098');self.reply(200,source.encode(),'application/javascript');return
  if path.path.startswith('/api/'):
   if self.headers.get('Authorization')!='Bearer '+TOKEN:self.reply(401,b'{"detail":"Sessao de teste ausente"}');return
   api_calls.append(path.path)
   if path.path.startswith('/api/pcp-modelo/'):
    status,body=asyncio.run(asgi(path.path,path.query,'GET',b''));self.reply(status,body);return
   r=requests.get('http://127.0.0.1:8010'+self.path,headers={'Authorization':AUTH},timeout=40);self.reply(r.status_code,r.content);return
  return super().do_GET()
 def do_PUT(self):
  if self.headers.get('Authorization')!='Bearer '+TOKEN:self.reply(401,b'{}');return
  path=urlsplit(self.path);payload=self.rfile.read(int(self.headers.get('Content-Length','0')));status,body=asyncio.run(asgi(path.path,path.query,'PUT',payload));self.reply(status,body)
 def log_message(self,*args):pass

def main():
 result={};manifest=json.loads((OUT/'copia_visual_zootecnico.json').read_text(encoding='utf-8'))
 assert hashlib.sha256(Path(manifest['zip_original']).read_bytes()).hexdigest()==manifest['sha256_zip'];result['zip_original_preservado']=True
 with zipfile.ZipFile(manifest['zip_original']) as z:
  for name in ['assets/css/app.css','assets/js/filters.js','assets/js/theme.js','assets/vendor/echarts/echarts.min.js']:
   assert (ROOT/name).read_bytes()==z.read('bi-zootecnico/'+name)
 result['componentes_visuais_reaproveitados_sem_alteracao']=True
 opts=Options();opts.add_argument('--headless=new');opts.set_capability('goog:loggingPrefs',{'browser':'ALL'});d=webdriver.Chrome(options=opts)
 with tempfile.TemporaryDirectory(prefix='pcp_frontend_test_') as temp:
  ajustes.CONFIG=Path(temp)/'ajustes.json';server=ThreadingHTTPServer(('127.0.0.1',8098),Handler);thread=threading.Thread(target=server.serve_forever,daemon=True);thread.start()
  try:
   wait=WebDriverWait(d,70);d.set_window_size(1440,1000);d.get('http://127.0.0.1:8098/index.html')
   wait.until(lambda x:'CENTRAL' in x.find_element(By.ID,'mensagemErro').text);assert not d.find_elements(By.CSS_SELECTOR,'.pcp-kpi');result['sem_sessao_nao_mostra_dados']=True
   # Token existe apenas neste teste em memória; não modifica código/credenciais da CENTRAL.
   d.execute_script("sessionStorage.setItem('granjabi_auth_token',arguments[0]);",TOKEN);d.refresh()
   def ready():wait.until(lambda x:x.find_element(By.ID,'estadoConsulta').text.startswith('Consulta realizada'))
   ready();assert d.find_elements(By.CSS_SELECTOR,'.pcp-kpi');assert d.find_elements(By.CSS_SELECTOR,'.pcp-raw-table tbody tr');assert d.find_elements(By.CSS_SELECTOR,'.pcp-chart svg');result['producao_api_real']=True
   scripts=list((ROOT/'assets/js').glob('pcp-*.js'))+[ROOT/'assets/js/api.js',ROOT/'assets/js/config.js',ROOT/'assets/js/sidebar.js']
   for file in scripts:d.execute_script('new Function(arguments[0]);',file.read_text(encoding='utf-8'))
   result['javascript_sintaxe_ok']=True
   # Componentes originais de filtro com pesquisa/multisseleção.
   d.find_element(By.CSS_SELECTOR,'#unidade .checkbox-multiselect-trigger').click()
   d.find_element(By.CSS_SELECTOR,'#unidade input[value="10"]').click();ready()
   d.find_element(By.CSS_SELECTOR,'#unidade input[value="111"]').click();ready()
   wait.until(lambda x:len(x.find_elements(By.CSS_SELECTOR,'.pcp-context-title'))==2);result['multisselecao_unidades']=True
   assert len(d.find_elements(By.CSS_SELECTOR,'.pcp-chart svg'))>=4;result['graficos_recriados_apos_filtros']=True
   d.find_element(By.ID,'limparFiltros').click();ready();result['limpar_filtros']=True
   wait.until(lambda x:len(x.find_elements(By.CSS_SELECTOR,'.pcp-chart svg'))>=2)
   d.find_element(By.CSS_SELECTOR,'[data-next]').click();ready();wait.until(lambda x:'página 2' in x.find_element(By.CSS_SELECTOR,'.pcp-pager').text);result['botao_paginacao']=True
   d.find_element(By.CSS_SELECTOR,'a[href^="detalhes.html?"]').click();ready();assert 'Detalhamento' in d.find_element(By.TAG_NAME,'h1').text;result['botao_detalhar_preserva_contexto']=True
   d.find_element(By.CSS_SELECTOR,'.side-nav-rail').click();wait.until(lambda x:x.find_element(By.CSS_SELECTOR,'.side-nav-link[href="lotes.html"]').is_displayed());time.sleep(.4);d.find_element(By.CSS_SELECTOR,'.side-nav-link[href="lotes.html"]').click();ready();assert 'Estoque' in d.find_element(By.TAG_NAME,'h1').text;result['navegacao_estoques']=True
   Select(d.find_element(By.ID,'tabela')).select_by_value('plano_producao');ready();result['plano_producao']=True
   d.get('http://127.0.0.1:8098/historico.html');ready();result['transacoes']=True
   d.get('http://127.0.0.1:8098/diferenca-aves-abatidas.html');ready();result['condenacoes']=True
   Select(d.find_element(By.ID,'tabela')).select_by_value('desperdicio');ready();assert 'Nenhum registro' in d.find_element(By.ID,'pcpConteudo').text;result['vazio_real']=True
   d.get('http://127.0.0.1:8098/formulas.html');wait.until(lambda x:'525' in x.find_element(By.ID,'estadoConsulta').text);result['525_expressoes_oficiais']=True
   d.get('http://127.0.0.1:8098/consultas.html');wait.until(lambda x:'45 consultas' in x.find_element(By.ID,'estadoModelo').text);Select(d.find_element(By.ID,'tabelaModelo')).select_by_value('param_limite_estoque');d.find_element(By.ID,'consultarModelo').click();wait.until(lambda x:x.find_element(By.ID,'estadoModelo').text.startswith('Resultados retornados'));assert '164 registros' in d.find_element(By.ID,'resultadoModelo').text;result['consulta_preparada_com_resultado_real']=True
   Select(d.find_element(By.ID,'tabelaModelo')).select_by_value('pcp_producao_diaria');d.find_element(By.ID,'consultarModelo').click();wait.until(lambda x:'em preparação' in x.find_element(By.ID,'mensagemErro').text);assert not d.find_element(By.ID,'resultadoModelo').text;result['consulta_pendente_sem_numero_simulado']=True
   d.get('http://127.0.0.1:8098/ajustes.html');wait.until(lambda x:x.find_element(By.ID,'status').text.startswith('Configuração carregada'));d.find_element(By.ID,'tab-pmfob').click();assert len(d.find_elements(By.CSS_SELECTOR,'#pmfob-body tr'))==108;result['admin_e_pmfob_real']=True
   d.get('http://127.0.0.1:8098/index.html');ready()
   previous=d.execute_script('return document.documentElement.dataset.theme');d.find_element(By.CSS_SELECTOR,'[data-theme-toggle]').click();assert d.execute_script('return document.documentElement.dataset.theme')!=previous;result['tema_original']=True
   d.find_element(By.CSS_SELECTOR,'[data-theme-toggle]').click()
   for width,height in [(1920,1080),(1366,768),(1024,768),(390,844)]:
    d.execute_cdp_cmd('Emulation.setDeviceMetricsOverride',{'width':width,'height':height,'deviceScaleFactor':1,'mobile':False});time.sleep(.2)
    assert d.execute_script('return document.documentElement.scrollWidth<=innerWidth')
    d.save_screenshot(str(OUT/f'bi_pcp_modelo_zootecnico_{width}x{height}.png'))
   result['quatro_resolucoes']=True
   assert not any('/api/bi/zootecnico' in p or '/api/zootecnico' in p for p in api_calls);result['nenhuma_consulta_ao_zootecnico']=True
   errors=[e['message'] for e in d.get_log('browser') if e['level']=='SEVERE' and 'favicon' not in e['message'] and '424' not in e['message']];assert not errors,errors;result['erros_javascript']=errors
  except Exception:
   print(json.dumps({'console':d.get_log('browser'),'pagina':d.find_element(By.TAG_NAME,'body').text[:700]},ensure_ascii=True),flush=True);d.save_screenshot(str(OUT/'erro_copia_visual.png'));raise
  finally:d.quit();server.shutdown();server.server_close();thread.join(timeout=5)
 result['preview_encerrado']=not thread.is_alive();result['publicado']=False;result['central_real_validada']=False;result['resultado']='OK'
 (OUT/'copia_visual_pcp.json').write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8');print(json.dumps(result,ensure_ascii=True),flush=True)
if __name__=='__main__':main()
