# BI PCP — cópia visual do Zootécnico

O visual foi copiado de bi-zootecnico.zip. A sessão CENTRAL continua usando
sessionStorage/granjabi_auth_token e Authorization: Bearer no mesmo Worker.
Não há credenciais de banco, outro login, token fixo ou fonte CSV no frontend.
Os componentes de filtros, tema, fontes e gráficos são reaproveitados.

Páginas: produção, estoques/plano, movimentos, condenações/devoluções, detalhes,
fórmulas oficiais e ajustes/PmFOB para admin conforme sessão validada no servidor.
O menu mantém os arquivos e o comportamento de navegação do modelo visual.

Os cartões operacionais usam os valores calculados e retornados pela API PCP
existente. Filtros múltiplos apresentam os recortes separadamente, sem inventar
consolidação no navegador. As páginas de fórmulas e ajustes usam os endpoints
preparados em api_zootecnico/pcp_modelo na cópia da etapa anterior.

A adaptação completa das 525 medidas permanece pendente no backend. Indicadores
sem consulta executável não recebem valores simulados. 404/424 e falhas de sessão
aparecem como indisponibilidade, sem dados antigos ou valores de outro BI.

Não publicado. A liberação do PCP na CENTRAL, permissão dos endpoints no Worker,
roteamento para o backend copiado e verificação de perfil admin pelo fluxo publicado
precisam ser conferidos antes da publicação. Nenhuma dessas configurações foi alterada.
O admin é autorizado pelo servidor; esconder links no navegador não substitui isso.
