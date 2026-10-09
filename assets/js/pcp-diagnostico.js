"use strict";
(() => {
 const status=document.getElementById('statusConexao'),result=document.getElementById('resultadoConexao'),button=document.getElementById('testarConexao');
 async function test(){
  button.disabled=true;result.replaceChildren();status.textContent='Testando a API existente através do Worker…';
  const rows=[];
  for(const endpoint of ['/api/pcp/health','/api/pcp/tabelas','/api/pcp/cargas']){
   const line=document.createElement('p');line.textContent=endpoint+' · consultando…';result.append(line);
   try{
    const response=await apiGet(endpoint,endpoint.endsWith('/cargas')?{tamanho:1}:{});
    if(response.ok!==true)throw Error('Resposta não confirmou a consulta.');
    line.textContent=endpoint+' · HTTP 200 · OK';
    rows.push({rota:endpoint,status:200,ok:true});
   }catch(error){line.textContent=endpoint+' · '+(error.status?'HTTP '+error.status+' · ':'')+error.message;rows.push({rota:endpoint,status:error.status||0,ok:false});}
  }
  const diagnostic={quando:new Date().toISOString(),rotas:rows,worker:APP_CONFIG.API_URL};
  // Somente estados da conexão. Não guarda nem imprime o Bearer.
  try{sessionStorage.setItem('pcp_diagnostico_conexao',JSON.stringify(diagnostic));}catch(_){}
  status.textContent=rows.every(r=>r.ok)?'Conexão autenticada confirmada nas três rotas PCP.':'Confira as respostas acima. Nenhum dado foi substituído.';button.disabled=false;
 }
 button.onclick=test;
 if(getPortalToken())test();else status.textContent='Sessão da CENTRAL ausente. Abra este relatório pela CENTRAL para testar o caminho autenticado.';
})();
