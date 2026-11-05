# Produtividade — Comparativo x Cirúrgico Geral

Integração no BI-PCP oficial em 05/11/2026, a partir da implementação validada
no BI-PCP copia. A flag Rendimento continua sendo a seleção inicial.

## Comportamento

- Calendário de um mês, de segunda a sábado, com número ISO da semana,
  totais semanais, por dia da semana e do mês/período.
- Grupo é oculto somente em Produtividade. Mês tem seleção única e acompanha
  as setas. Limpar filtros restaura Ave Nova e desmarca Semana cheia.
- Unidade / Turno mantém quatro opções: Ave Nova; 1° Turno - AN;
  2° Turno - AN; Real Alimentos. Permite seleção múltipla. Os dois turnos
  viram Ave Nova; Ave Nova e Real exibem o resumo Real Alimentos + Ave Nova.
  Não existe uma opção combinada pronta no menu.
- Acumulado sempre com 12 meses do ano selecionado, Ave Nova, Real Alimentos,
  Total do mês e Total do ano, independentemente de Mês, Dia, Semana cheia
  ou Unidade / Turno. A coluna Ave Nova inclui 1T, 2T e Total.
- Aves, Peso (kg), Meta e Diferença preservam as regras e as fontes da cópia.
  Cabeças prioriza Abate - Total, depois Recepção de Aves Vivas, com MAX
  dentro da seção. Peso utiliza Peso Vivo para Rendimento, MAX por dia/turno.
  Não se somam seções repetidas. O limite D−1 é mantido em todos os quadros.
- Calendário da Ave Nova usa os turnos; seu Total no mensal preserva o diário
  comum. Os detalhes 1T/2T não são somados novamente aos totais consolidados.
- Carga anual em períodos contínuos e catálogo compartilhado por carga.
  Paginação mantida. Não há atualização periódica em Produtividade.

## Preservação do oficial

O CSS anterior foi mantido integralmente; os estilos adicionados são limitados
à Produtividade. O botão Atualizar continua em Rendimento, assim como os filtros
originais, tabelas, gráficos, atualização a cada minuto e ao retornar à janela.
A alternância restaura a estrutura e a seleção anterior dos filtros.

Não houve alteração de API, autenticação, SQL, banco, importadores, robô de metas,
navegação do portal ou outras telas. A API e a sessão existentes são reutilizadas.
Os importadores não precisam ser copiados para o frontend funcionar.

## Validação

Dez suítes JavaScript aprovadas, abrangendo dados, metas, peso, totais, prioridade
de seção, meses, seleção múltipla, semanas ISO, paginação e desempenho.
O teste tools/test_pcp_productivity_browser.py usa Edge headless e API simulada.
Foram aprovadas sete combinações em 1366, 1440, 1920, 1024, 600 e 492 px.
Com --baseline CAMINHO_DO_BACKUP_ZIP, compara as tabelas, opções, estilos dos
filtros e botão Atualizar contra o código oficial anterior à migração.
Também verifica o botão e os timers reais do controlador de Rendimento.

Resultados locais em outputs/produtividade-layout/results.json. São verificações
locais, sem representar conferência autenticada na API publicada.

## Backup e publicação

Backup integral anterior em outputs/backups/produtividade-antes-migracao-20261105/
backup-oficial.zip, acompanhado de manifesto SHA-256. O diretório outputs já é
ignorado pelo Git. As versões de cache de JS e CSS foram atualizadas no index.
Nada foi publicado automaticamente. O commit/push deve ser feito no repositório
Controladoriagranja/BI-PCP após a revisão.
