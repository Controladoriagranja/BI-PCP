"""Valida metas corrigidas no navegador com fixture sintética, sem API real."""
import json
from pathlib import Path
import shutil
import test_pcp_productivity_browser as browser

fixture = json.loads((browser.ROOT / 'tools/fixtures/produtividade-abate-2026.json').read_text(encoding='utf-8'))
browser.SCRIPT = browser.SCRIPT.replace('const fixture=__FIXTURE__;', 'const fixture='+json.dumps(fixture, ensure_ascii=False)+';')
browser.SCRIPT = browser.SCRIPT.replace("r.descricao==='Cabeças'", "r.descricao==='Cabeças'&&r.quantidade>0", 1)

browser.TEST = r'''
(async()=>{
 const assert=(ok,message)=>{if(!ok)throw Error(message);};
 const flush=()=>new Promise(r=>setTimeout(r,50));
 const flag=mode=>document.querySelector('input[name="cgTipoIndicador"][value="'+mode+'"]');
 const day=date=>document.querySelector('[data-cg-day="2026-11-'+date+'"]');
 const parse=el=>Number(el.textContent.replace(/[^\d-]/g,''));
 const meta=el=>parse(el.querySelector('.cg-prod-reference>span:first-child>span:last-child'));
 const adherence=el=>el.querySelector('.cg-prod-adherence strong').textContent;
 const cell=row=>document.querySelector('[data-cg-month-period="2026-11"] '+row);
 try{
  await document.fonts.ready;await flush();
  const unit=document.getElementById('cgUnidade');unit.value='10';unit.dispatchEvent(new Event('change',{bubbles:true}));await flush();
  const before=pcpRendimentoSnapshot();
  if(window.officialBaseline){const comparable=s=>({daily:s.daily,monthly:s.monthly,units:s.units,update:s.update});assert(JSON.stringify(comparable(before))===JSON.stringify(comparable(officialBaseline.snapshot)),'Rendimento igual ao backup');}
  document.getElementById('cgAno').value='2026';document.getElementById('cgMes').value='11';
  flag('produtividade').click();await flush();
  const cases=[['10',60000,'96,67%'],['1',60000,'96,67%'],['2',0,'0,00%'],['111',80000,'70,83%'],['10,111',140000,'81,90%']];
  const results=[];
  for(const [value,target,percent] of cases){
   unit.value=value;unit.dispatchEvent(new Event('change',{bubbles:true}));await flush();
   if(value==='2'){assert(day('20').textContent.trim()==='20','Turno sem produção mostra somente a data');}
   else{assert(meta(day('20'))===target,'Meta 20/11: '+value);assert(adherence(day('20'))===percent,'Aderência 20/11: '+value+' '+adherence(day('20')));}
   assert(day('21').textContent.trim()==='21','Dia sem produção mostra somente a data');
   assert(!day('21').closest('td').querySelector('.cg-production-day-weight,.cg-production-heads,.cg-calendar-mean,.cg-calendar-stops,.cg-production-empty'),'Dia vazio sem rótulos, zeros ou traços');
   assert(day('24').disabled&&day('24').textContent.trim()==='24','Dia futuro somente com a data');
   if(value==='1')assert(meta(day('16'))===65000,'Filtro 1T reconhece 2T positivo');
   if(value==='2')assert(meta(day('23'))===55000&&adherence(day('23'))==='101,82%','Somente 2T com meta do dia e aderência maior que 100%');
   const week=document.querySelector('[data-cg-week="2026-W47"]').closest('tr').querySelector('[data-cg-total]');
   if(value==='10'){assert(meta(week)===475000&&adherence(week)==='98,32%','Semana AN razão das somas');}
   if(value==='111'){assert(meta(week)===400000&&adherence(week)==='92,17%','Real permanece sem redução de meta');}
   if(value==='10,111'){assert(meta(week)===875000&&adherence(week)==='95,51%','Semana combinada sem média de percentuais');}
   assert(meta(cell('[data-cg-month-an-total]'))===530000,'Meta mensal AN corrigida e independente do filtro');
   assert(adherence(cell('[data-cg-month-an-total]'))==='98,68%','Aderência mensal AN');
   assert(meta(cell('td[data-cg-label="Real Alimentos"]'))===400000,'Meta mensal Real preservada');
   assert(meta(cell('td[data-cg-label="Total do mês"]'))===930000&&adherence(cell('td[data-cg-label="Total do mês"]'))==='95,88%','Meta e aderência consolidadas');
   const annual=document.querySelector('[data-cg-total-year="2026"] .cg-monthly-grand-total');
   assert(meta(annual)===930000&&adherence(annual)==='95,88%','Total anual usa mesmas regras');
   assert(document.querySelectorAll('[data-cg-month-period]').length===12,'Todos os meses preservados');
   assert(document.documentElement.scrollWidth<=innerWidth,'Página sem nova rolagem horizontal');
   for(const number of document.querySelectorAll('#cgProdutividade .cg-production-grid strong')){
    const r=number.getBoundingClientRect(),p=number.closest('td').getBoundingClientRect();
    if(r.width)assert(r.left>=p.left&&r.right<=p.right+1,'Valor cortado no calendário: '+number.textContent);
   }
   assert(!document.querySelector('#cgProdutividade [data-indicator-formula]'),'Fórmulas continuam ocultas');
   results.push({unit:value,target,percent});
  }
  // Falha de consulta continua indisponível, em vez de ser exibida como zero.
  const previousGet=window.apiGet;window.apiGet=async(endpoint,p)=>{if(['Peso Vivo para Rendimento','Peso Médio'].includes(p?.descricao))throw Error('Falha simulada');return previousGet(endpoint,p);};
  unit.value='10';unit.dispatchEvent(new Event('change',{bubbles:true}));await flush();
  assert(day('16').querySelector('.cg-production-day-weight strong').textContent==='—','Peso com falha não vira zero');
  assert(day('16').querySelector('.cg-calendar-mean strong').textContent==='—','Média com falha não vira zero');
  window.apiGet=previousGet;unit.value='10,111';unit.dispatchEvent(new Event('change',{bubbles:true}));await flush();
  // Peso e médias mantêm seus indicadores e as fontes de antes.
  const quantity=parse(day('16').querySelector('.cg-production-heads>span>strong'));
  assert(quantity===200000&&parse(day('16').querySelector('.cg-production-day-weight strong'))===600000,'Aves e peso preservados');
  assert(day('16').querySelector('.cg-calendar-mean strong').textContent==='3,125','Peso médio preservado');
  assert(!errors.length,'Erros JS: '+errors.join('; '));
  document.getElementById('test-result').textContent=JSON.stringify({ok:true,width:innerWidth,selections:results.length,results,rendimentoPreserved:true,officialBaselinePreserved:!!window.officialBaseline,fixture:'sintética; sem consulta real'});
 }catch(e){document.getElementById('test-result').textContent=JSON.stringify({ok:false,message:e.message,stack:e.stack,errors});}
})();
'''

if __name__ == '__main__':
    try:
        browser.main()
    finally:
        out = browser.ROOT / 'outputs/abate-layout'
        out.mkdir(parents=True, exist_ok=True)
        for file in browser.OUT.glob('*'):
            if file.suffix in {'.json', '.png', '.html'}:
                shutil.copy2(file, out / file.name)
