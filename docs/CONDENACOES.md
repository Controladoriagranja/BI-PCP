# Condenações — comparativo e detalhes

O indicador % Cond (Tot+Par Quilos), ordem 11, abre o comparativo de causas por mês. O clique no valor diário limita a consulta ao dia/unidade/turno; o mensal ao mês da coluna. O nome do indicador usa os filtros selecionados. Cada causa/tipo abre suas ocorrências com paginação de 200 registros.

Fonte: pcp.condenacoes já alimentada pelo coletor PCP existente. O ZIP recebido foi analisado como referência; não foi executado seu fluxo interativo. Nenhuma nova coleta ou alteração dos dados é necessária para a navegação.

Grupos e equivalências extraídos de ResumoComparativoCondenações.xlsx, abas Parâmetro e ComparativoMensal, em pcp_condenacoes_mapa.json. Tipos Parcial/Total separados, novos nomes preservados em Outras. Resíduos ficam fora desse indicador de condenação.

Percentuais = soma dos pesos condenados / soma do peso vivo. Acumulado ponderado; não é média simples dos percentuais. Peso vivo nas mesmas fontes do Comparativo Cirúrgico: AN turnos 1+2, Real diário; sem repetir Peso Pesagem por causa. Falta de denominador retorna —. Os pesos detalhados são os do relatório de condenações, sem forçar igualdade com valores do Diário da Indústria.

API: /api/pcp/comparativo/condenacoes, com sessão ativa no portal, parâmetros ano, mes, dias, visao, causa, tipo e pagina. Somente SELECT, D−1 e filtros SQL parametrizados. Sem mudanças em metas, agenda ou cálculos dos demais indicadores.

Validação: reconciliação do resumo com os pesos, consulta diária de 10/11/2026 limitada à Ave Nova, tipos separados; navegador com causa, retorno e contexto diário/turno preservado, desktop e celular.
