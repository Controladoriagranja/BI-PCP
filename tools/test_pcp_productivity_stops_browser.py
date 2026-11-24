"""Paradas com lacunas no navegador: API simulada, sem acessar o banco real."""
import test_pcp_productivity_browser as browser
import shutil

browser.SCRIPT += r'''
const originalStopsTestGet=window.apiGet;
window.apiGet=async(endpoint,p={})=>{
 const r=await originalStopsTestGet(endpoint,p);
 if(endpoint!=='/api/pcp/comparativo/cirurgico-geral')return r;
 const months=String(p.mes||11).split(',').map(Number);
 const raw=(date,a,b,total,real)=>({data:date,metas_paradas:{'1':30,'2':30,'10':60,'111':30},valores:Object.fromEntries([['1',a],['2',b],['10',total],['111',real]].map(([key,value])=>[key,[...Array(14).fill(null),value]]))});
 r.dias=[];
 if(months.includes(8))r.dias.push(raw('2026-08-02',9999,9999,9999,9999));
 if(months.includes(11))r.dias.push(raw('2026-11-02',20,null,55,40),raw('2026-11-03',null,35,null,10),raw('2026-11-05',9999,9999,9999,9999));
 for(const b of r.mensal){const august=b.mes.endsWith('-08');for(const key of ['1','2','10','111'])b.valores[key][14]=august?({'1':100,'2':50,'10':180,'111':20}[key]):null;}
 return r;
};
'''

browser.TEST = r'''
(async()=>{
 const assert=(value,message)=>{if(!value)throw Error(message);};
 const flush=()=>new Promise(r=>setTimeout(r,50));
 const flag=mode=>document.querySelector('input[name="cgTipoIndicador"][value="'+mode+'"]');
 const parse=el=>Number(el.textContent.replace(/[^\d-]/g,''));
 const minutes=el=>parse(el.querySelector('.cg-calendar-stops strong,.cg-monthly-stops strong'));
 const monthCell=(month,selector)=>document.querySelector('[data-cg-month-period="2026-'+month+'"] '+selector);
 const columns=['[data-cg-month-turn="1"]','[data-cg-month-turn="2"]','[data-cg-month-an-total]','td[data-cg-label="Real Alimentos"]','td[data-cg-label="Total do mês"]'];
 try{
  await document.fonts.ready;await flush();
  const unit=document.getElementById('cgUnidade');unit.value='10';unit.dispatchEvent(new Event('change',{bubbles:true}));await flush();
  const before=pcpRendimentoSnapshot();
  if(window.officialBaseline){const comparable=s=>({daily:s.daily,monthly:s.monthly,units:s.units,update:s.update});assert(JSON.stringify(comparable(before))===JSON.stringify(comparable(officialBaseline.snapshot)),'Rendimento igual ao backup');}
  document.getElementById('cgAno').value='2026';document.getElementById('cgMes').value='11';flag('produtividade').click();await flush();
  const results=[];
  for(const [value,total] of [['10',55],['1',20],['2',35],['111',50],['10,111',105]]){
   unit.value=value;unit.dispatchEvent(new Event('change',{bubbles:true}));await flush();
   const footer=document.querySelector('[data-cg-total="month"]');assert(minutes(footer)===total,'Total do calendário '+value+': '+minutes(footer));
   const week=document.querySelector('[data-cg-total="week-0"]');assert(minutes(week)===total,'Total semanal mantém os valores disponíveis');
   const expected=[20,35,55,50,105];
   for(const [i,selector] of columns.entries())assert(minutes(monthCell('11',selector))===expected[i],'Mensal recupera dias do mês incompleto '+selector);
   const annual=document.querySelector('[data-cg-total-year="2026"]');
   const totals=[120,85,235,70,305];
   for(const [i,cell] of [...annual.querySelectorAll('td')].entries())assert(minutes(cell)===totals[i],'Anual soma meses e fallback diário '+i);
   assert(monthCell('09','[data-cg-month-turn="2"] .cg-monthly-stops strong').textContent==='—','Sem dados não inventa zero');
   assert(monthCell('11','[data-cg-month-turn="2"] .cg-monthly-stops').title.includes('Soma dos dados disponíveis'),'Cobertura parcial indicada no título');
   assert(document.documentElement.scrollWidth<=innerWidth,'Página sem rolagem horizontal nova');
   if(value==='10,111'){
    const day=document.querySelector('[data-cg-day="2026-11-03"]').closest('td');assert(minutes(day)===10,'Real permanece visível mesmo sem valor AN');
    assert(document.querySelector('[data-cg-day="2026-11-05"]').textContent.trim()==='5','Futuro permanece vazio');
   }
   results.push({unit:value,total});
  }
  const monthlyBefore=document.querySelector('.cg-monthly-pivot tbody').innerHTML;
  const day=document.getElementById('cgDia');day.value='2026-11-03';day.dispatchEvent(new Event('change',{bubbles:true}));await flush();
  assert(minutes(document.querySelector('[data-cg-total="month"]'))===10,'Filtro de dia aplica à soma das paradas');
  assert(document.querySelector('.cg-monthly-pivot tbody').innerHTML===monthlyBefore,'Mensal independente do dia');
  day.value='';day.dispatchEvent(new Event('change',{bubbles:true}));await flush();
  assert(!errors.length,'Erros JS: '+errors.join('; '));
  if(new URLSearchParams(location.search).has('monthly')){const style=document.createElement('style');style.textContent='.page-header,.filter-card,#estadoConsulta,#cgProdutividade>article:first-child{display:none!important}';document.head.append(style);const box=document.querySelector('.cg-monthly-scroll');box.scrollTop=box.scrollHeight;window.scrollTo(0,0);await flush();}
  document.getElementById('test-result').textContent=JSON.stringify({ok:true,width:innerWidth,selections:results.length,results,rendimentoPreserved:true,officialBaselinePreserved:!!window.officialBaseline,fixture:'sintética; sem consulta real'});
 }catch(e){document.getElementById('test-result').textContent=JSON.stringify({ok:false,message:e.message,stack:e.stack,errors});}
})();
'''

if __name__ == '__main__':
    try:
        browser.main()
    finally:
        out=browser.ROOT/'outputs/produtividade-paradas-layout'
        out.mkdir(parents=True,exist_ok=True)
        for file in browser.OUT.glob('*'):
            if file.suffix in {'.json','.png','.html'}:
                shutil.copy2(file,out/file.name)
