# Metas de abate e Aderência Abate — 24/11/2026

Implementação local exclusiva da Produtividade, em Comparativo x Cirúrgico Geral.
Nenhum deploy, commit, alteração de API, SQL de produção ou banco foi executado.

## Diagnóstico e fontes

A regra anterior somava as metas dos turnos selecionados para cada dia com registro,
sem verificar a produção efetiva de ambos. Um dia com apenas 1T podia receber também
meta de 2T; filtrar 1T não permitia decidir se o 2T realmente estava ausente.

- Aves: descrição exata Cabeças, coluna quantidade. Prioridade Abate - Total,
  fallback Recepção de Aves Vivas, MAX dentro da seção, sem somar seções.
- Calendário AN: pcp.diario_industria_turnos, data_referencia, empresa/empresa_codigo,
  turno_codigo 1/2. O nome original da empresa prevalece sobre código de importação.
- Real: pcp.diario_industria e complemento dados_gerais já validado pelo catálogo.
- Acumulado: os realizados consolidados permanecem no diário comum. Seus detalhes
  1T/2T usam a fonte por turno; pesos, médias e paradas mantêm suas fontes.
- Metas: pcp.metas, tela calendario_producao_produtividade, ativo=true,
  referencia_mes, indicador_codigo PROD_AN_T1_*, PROD_AN_T2_*, PROD_RA_*, valor_meta.
  Não existem valores de meta fixados na implementação.

## Regra implementada

Produção de turno significa quantidade de Cabeças selecionada pela regra oficial
maior que zero. Uma resposta completa sem registro ou com zero equivale a não produzir.
Falha de consulta não é ausência de produção.

1. AN com ambos os turnos positivos: metas normais cadastradas para o dia.
2. Apenas 1T positivo: PROD_AN_T1_SAB do próprio mês, em qualquer dia de segunda a sábado;
   2T sem produção tem meta zero. O sábado normal continua usando a meta cadastrada.
3. Apenas 2T positivo: meta cadastrada do 2T para aquele dia, sem meta de 1T. Não foi
   identificado um exemplo real desse cenário nos dados locais; é um tratamento explícito
   testado, sem inventar uma meta de sábado para o 2T. Se faltar cadastro, referência —.
4. Sem produção: Aves, Meta, Diferença e Aderência são zero, dentro do D−1.
5. Dados futuros, carga em andamento e falhas mantêm referências indisponíveis.
6. Todas as combinações de filtro usam evidência completa de 1T e 2T. Ao filtrar um turno,
   somente as aves exibidas são projetadas; o outro turno continua disponível para decidir
   a meta correta. Não há soma duplicada de empresa/turno nem de seções.
7. Metas ausentes e produção positiva no diário comum sem confirmação por turno deixam
   Meta/Diferença/Aderência como —; não se presume um único turno nesse caso.

**Real Alimentos:** o usuário confirmou posteriormente que suas metas devem permanecer
como estão, pois ela não possui turnos. Não foi implementada inferência por sábado sem
produção, antecipação, produção reduzida ou quantidade abaixo da meta. Assim, os exemplos
iniciais da Real com redução de 80.000 para 60.000 foram substituídos por essa orientação.
Para Real 20/11 com 56.664 aves, permanece Meta 80.000, Diferença -23.336, Aderência 70,83%.
Para a semana informada, 368.670 / 400.000 corresponde a 92,17%, com diferença -31.330.
Essas contas usam os números fornecidos pelo usuário, sem nova consulta ao banco.

## Aderência e acumulados

Aderência Abate = Aves / Meta corrigida × 100. Meta zero retorna 0,00%.
Diferença = Aves − Meta corrigida. Cálculo sem arredondamento intermediário;
apresentação com duas casas, sem teto de 100%. Meta positiva: verde em ≥100%,
vermelho abaixo; sem produção/meta: neutro.

A linha aparece após Diferença, usando os mesmos estilos, em dias, semanas, totais
por dia da semana, mês/período e no acumulado mensal/anual, inclusive 1T/2T/Total AN,
Real e Total Geral. Acumulados dividem a soma das aves pela soma das metas corrigidas,
sem média aritmética de percentuais. A mesma função grade calcula todas as referências.

O mensal mantém 12 meses, ambas as empresas e total anual, independente de Mês, Dia,
Unidade/Turno e Semana cheia. Ano continua aplicável. Datas adjacentes usam seu mês.
Zero de empresa sem produção não invalida a média ponderada da outra empresa.

## Antes/depois e validação

Exemplo de teste sintético AN em 20/11, apenas 1T, 58.000 aves:

| Seleção | Meta anterior | Meta nova | Diferença nova | Aderência |
|---|---:|---:|---:|---:|
| Ave Nova total | 110.000 | 60.000 | -2.000 | 96,67% |
| 1T | 65.000 | 60.000 | -2.000 | 96,67% |
| 2T sem produção | sem registro/meta | 0 | 0 | 0,00% |

A meta 60.000 veio do cadastro da fixture, não de uma constante do relatório.
Alterar o cadastro de sábado para 61.000 altera o resultado, conforme teste.
As quantidades AN desse exemplo não são uma extração do dia real.

- 11 suítes JavaScript aprovadas, incluindo 92 comparações da amostra SQL anterior
  de novembro, pesos, prioridades, paginação, cancelamento, filtros e desempenho.
- Novos cenários: dois turnos; só 1T; 2T zero/ausente; só 2T; sábado com/sem produção;
  datas sem dados e futuras; limite D−1; históricos 2025/2026; meta faltante; filtro 1T
  com 2T ativo; duplicidade; aderência abaixo/igual/acima de 100% e meta zero;
  consolidações semanais/mensais/anuais e ambas as empresas.
- Edge headless com API simulada: cinco seleções em 1366, 1440, 1920, 1024, 600 e 492 px.
  Comparação de Rendimento com o backup anterior aprovada. Números e percentuais
  do calendário sem cortes ou nova rolagem lateral. Nenhum CSS foi alterado.
- A carga anual contínua e o compartilhamento de catálogo permanecem intactos.
  A suíte de desempenho continua verificando 8 chamadas para o conjunto de cinco
  cargas anuais de aves/peso/metas, antes de páginas adicionais. O calendário
  de um turno agora também lê o outro turno de Cabeças, necessário à regra.
- Testes antigos estavam desatualizados antes deste ajuste (cabeçalho mensal de
  três colunas, restauração de filtros anterior e mocks incompletos). Foram atualizados
  para o comportamento já existente e para a nova regra, sem alterar Rendimento.

Não há conexão autenticada com o banco/API nesta sessão. Portanto, os valores reais
completos de 20/11, 21/11, semana 47 e novembro não foram reconciliados ao vivo.
A fixture produtividade-abate-2026.json é identificada como sintética; os números RA
20/11 e semana 47 vêm do pedido, mas a distribuição nos demais dias é artificial.

## Conferência local

Com Node instalado, execute node tools/test_pcp_abate.cjs e as demais suítes listadas
em outputs/backups/metas-abate-20261124/tests.json após a instalação.
Para navegador, com Python e Edge no Windows:

    python -B tools/test_pcp_productivity_browser.py --widths 1366,1440,1920
    python -B tools/test_pcp_abate_browser.py --widths 1366,1440,1920

Os testes usam servidor localhost, perfil isolado e dados simulados. Não acessam a API real.
Para conferir o banco, execute manualmente tools/conferir_metas_abate.sql no bi_granja.
É somente SELECT/CTEs. Ajuste inicio/fim para outros períodos. A consulta não lê a fonte
complementar dados_gerais; se ela participar dos dados reais, conferir essa fonte também.
O campo meta_anterior_dia_com_registro é apenas referência da regra antiga para dias
com registro; um dia sem linha anteriormente ficava vazio, não recebia meta prevista.

## Arquivos e backup

Produção: assets/js/pcp-cirurgico.js e index.html (versão de cache do JS).
Documentação: docs/PRODUTIVIDADE.md e este relatório.
Testes: suítes de metas, aves, mês, acumulados, seleção, amostra de novembro,
novos test_pcp_abate.cjs / test_pcp_abate_browser.py e sua fixture identificada.
Diagnóstico: tools/conferir_metas_abate.sql, somente leitura, não executado.
Backup integral anterior: outputs/backups/metas-abate-20261124/backup-oficial.zip,
com manifesto SHA-256. Não publicar automaticamente.
