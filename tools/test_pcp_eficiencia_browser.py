"""Teste da tela e do botão de fórmulas, com API simulada e Edge isolado."""
from pathlib import Path
import argparse
import os
import hashlib
from datetime import date
import functools
import html
from http.server import SimpleHTTPRequestHandler,ThreadingHTTPServer
import json
import subprocess
import sys
import threading
import re

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'backend/eficiencia'))
from pcp_eficiencia_capacidade import aplicar_formula_capacidade


def fixture():
    rows=[]
    for uid,name in [('10','Ave Nova'),('111','Real Alimentos')]:
        for d,heads,dead,tara in [(date(2026,11,20),60000,1000,'14:50:00'),(date(2026,11,23),100000,1000,'20:00:00')]:
            net=heads-dead;ideal=(min(net,61000)/10800+max(net-61000,0)/9500) if uid=='10' else net/10000
            rows.append({'data':d,'chave_semana':'2026-'+str(d.isocalendar().week),'unidade':uid,'empresa':name,'ticket':'123','data_tara':d,'horario_tara':tara,'cabecas':heads,'mortos_transporte_cab':dead,'tempo_ideal_horas':ideal,'tempo_real_horas':10-70/60})
    weeks=[{'chave':'2026-'+str(w),'ano':2026,'semana':w,'meta':.95,'valores':[{'unidade':'10'},{'unidade':'111'}]} for w in [47,48]]
    result=aplicar_formula_capacidade({'dias':rows,'resumo_semanal':weeks,'semanas':[{'chave':w['chave'],'ano':2026,'semana':w['semana']} for w in weeks]})
    result.update(ok=True,contrato='eficiencia-abate-v1',periodo={'inicio':'2026-11-20','fim':'2026-11-23'},periodo_disponivel={'inicio':'2026-01-01','fim':'2026-11-24'},data_limite='2026-11-24',ultima_atualizacao='2026-11-25T08:00:00-03:00')
    return result


TEST=r'''
(async()=>{const assert=(v,m)=>{if(!v)throw Error(m);};const flush=()=>new Promise(r=>setTimeout(r,60));try{
 await document.fonts.ready;await flush();
 const daily=document.getElementById('efDiario');assert(daily.textContent.includes('Capacidade de abate (aves)'),'Capacidade exibida');assert(daily.textContent.includes('Aves abatidas'),'Aves líquidas exibidas');
 const incoming=new URLSearchParams(location.search);const unit=incoming.get('unidade');assert(daily.textContent.includes(unit==='111'?'Real Alimentos':'Ave Nova'),'Empresa selecionada');
 if(incoming.has('data_inicio')){assert(document.getElementById('efInicio').value===incoming.get('data_inicio')&&document.getElementById('efFim').value===incoming.get('data_fim'),'Datas do calendário recebidas');assert(requestLog[0].inicio===incoming.get('data_inicio')&&requestLog[0].fim===incoming.get('data_fim'),'Consulta usa o período recebido');}
 if(['10','111'].includes(unit))assert(document.getElementById('efUnidade').value===unit&&requestLog[0].unidade===unit,'Empresa recebida');
 if(incoming.get('resumo')==='mes')assert(document.querySelector('[data-ef-period=mes]').classList.contains('active'),'Resumo mensal recebido');
 const formula=document.querySelector('.ef-panel [data-indicator-formula]');assert(formula,'Botão real de fórmulas');formula.click();await flush();
 const modal=document.getElementById('indicatorFormulaDialog');assert(modal.open,'Modal aberto');
 assert(modal.querySelector('code').textContent==='Aves abatidas / Capacidade de abate × 100','Expressão correta');
 const reference=modal.querySelector('.if-reference');reference.open=true;assert(reference.textContent.includes('VELOCIDADE_RA = 9500')&&reference.textContent.includes('def calcular_eficiencia')&&reference.textContent.includes('SELECT data_abate'),'Regra atual inclui parâmetros, cálculo e SQL reais');
 assert(modal.textContent.includes('EficiênciaAbate.xlsx')&&modal.textContent.includes('10.800')&&modal.textContent.includes('C7')&&modal.textContent.includes('turno_codigo'),'Parâmetros e origem documentados');modal.querySelector('.if-close').click();
 document.querySelector('[data-ef-period="mes"]').click();await flush();
 for(const [i,uid] of [...new Set(lastMock.dias.map(row=>row.unidade))].entries()){
  const valid=lastMock.dias.filter(r=>r.unidade===uid&&(!incoming.get('datas')||incoming.get('datas').split(',').includes(r.data))),expected=valid.reduce((s,r)=>s+r.aves_abatidas_liquidas,0)/valid.reduce((s,r)=>s+r.capacidade_nominal_aves,0);
  const text=(expected*100).toLocaleString('pt-BR',{minimumFractionDigits:1,maximumFractionDigits:1})+'%';
  assert(document.querySelectorAll('#efResumo tbody tr')[i].textContent.includes(text),'Mensal por razão das somas '+uid);
 }
 const before=daily.innerHTML;window.oldApi=true;document.getElementById('efAtualizar').click();await flush();assert(document.getElementById('mensagemErro').textContent.includes('API ainda utiliza'),'API antiga não é apresentada com fórmula nova');assert(daily.innerHTML===before,'Última consulta confirmada preservada');
 window.oldApi=false;document.getElementById('efAtualizar').click();await flush();assert(document.getElementById('mensagemErro').classList.contains('hidden'),'Consulta válida recuperada');formula.click();await flush();
 assert(!errors.length,'Erros JS: '+errors.join('; '));
 document.getElementById('test-result').textContent=JSON.stringify({ok:true,width:innerWidth,formula:true,monthly:true,oldApiGuard:true});
}catch(e){document.getElementById('test-result').textContent=JSON.stringify({ok:false,message:e.message,stack:e.stack,errors});}})();
'''


def main():
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--widths',default='1366,1920');parser.add_argument('--incoming',default='');args=parser.parse_args()
    out=ROOT/'outputs/eficiencia-capacidade-layout';out=out/('entrada-'+hashlib.sha256(args.incoming.encode()).hexdigest()[:8]) if args.incoming else out;out.mkdir(parents=True,exist_ok=True)
    data=json.dumps(fixture(),default=lambda d:d.isoformat(),ensure_ascii=False)
    page='''<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><link rel="stylesheet" href="/assets/css/app.css"><link rel="stylesheet" href="/assets/vendor/geist/index.css"><link rel="stylesheet" href="/assets/css/pcp.css"><link rel="stylesheet" href="/assets/css/indicator-formulas.css"></head><body class="pcp-report" data-page="report-g5"><div class="app-shell"><section class="card filter-card"></section><div id="mensagemErro" class="hidden"></div><p id="estadoConsulta"></p><main id="pcpConteudo"></main></div><pre id="test-result" hidden>PENDING</pre><script src="/assets/js/config.js"></script><script>window.errors=[];addEventListener('error',e=>errors.push(e.message));window.setInterval=()=>0;window.ApiScreen={escape:v=>String(v??'').replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('"','&quot;')};window.ThemeManager={refresh(){}};window.PcpMobileScroll={active:()=>false};window.PcpReportHeader={update(){}};const fixture=__DATA__;window.requestLog=[];window.lastMock=null;window.apiGet=async(endpoint,p={})=>{requestLog.push({...p});const result=structuredClone(fixture);result.periodo={inicio:p.inicio||fixture.periodo.inicio,fim:p.fim&&p.fim<fixture.data_limite?p.fim:fixture.data_limite};result.dias=result.dias.filter(row=>(!p.inicio||row.data>=p.inicio)&&(!p.fim||row.data<=p.fim)&&(!p.unidade||p.unidade.split(',').includes(row.unidade)));result.resumo_semanal=result.resumo_semanal.filter(week=>result.dias.some(row=>row.chave_semana===week.chave)).map(week=>({...week,valores:week.valores.filter(row=>!p.unidade||p.unidade.split(',').includes(row.unidade))}));lastMock=structuredClone(result);if(window.oldApi)delete result.revisao_formulas;return result;};</script><script src="/assets/js/filters.js"></script><script src="/assets/js/pcp-multiselect.js"></script><script src="/assets/js/pcp-eficiencia.js"></script><script src="/assets/js/indicator-formulas-data.js"></script><script src="/assets/js/indicator-formulas.js"></script><script>PcpEficiencia.mount();__TEST__</script></body></html>'''.replace('__DATA__',data).replace('__TEST__',TEST)
    (out/'preview.html').write_text(page,encoding='utf-8')
    class Handler(SimpleHTTPRequestHandler):
        def log_message(self,*args):pass
    server=ThreadingHTTPServer(('127.0.0.1',0),functools.partial(Handler,directory=str(ROOT)));threading.Thread(target=server.serve_forever,daemon=True).start()
    results=[]
    try:
        for width in map(int,args.widths.split(',')):
            run=subprocess.run([os.environ.get('PCP_TEST_BROWSER',r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe'),'--headless','--disable-gpu','--no-first-run','--no-default-browser-check','--disable-background-networking',f'--user-data-dir={out/str(width)}',f'--window-size={width+(16 if "chrome" in os.environ.get("PCP_TEST_BROWSER", "").lower() else 24)},1100','--force-device-scale-factor=1','--virtual-time-budget=12000',f'--screenshot={out/(str(width)+".png")}','--dump-dom',f'http://127.0.0.1:{server.server_port}/{out.relative_to(ROOT).as_posix()}/preview.html?{args.incoming}'],capture_output=True,timeout=45)
            dom=run.stdout.decode('utf-8',errors='replace');(out/(str(width)+'.html')).write_text(dom,encoding='utf-8');match=re.search(r'<pre id="test-result"[^>]*>(.*?)</pre>',dom,re.S)
            result=json.loads(html.unescape(match[1])) if match and match[1]!='PENDING' else {'ok':False,'width':width,'message':'Teste não concluiu'}
            results.append(result);print(json.dumps(result,ensure_ascii=True))
    finally:server.shutdown()
    (out/'results.json').write_text(json.dumps(results,indent=2),encoding='utf-8')
    raise SystemExit(0 if all(r['ok'] for r in results) else 1)


if __name__=='__main__':main()
