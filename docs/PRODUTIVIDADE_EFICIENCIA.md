# Eficiência na Produtividade — 25/11/2026

Incluída somente no Calendário de Produção e no Acumulado mensal de Comparativo x Cirúrgico Geral.

- Dia: aves abatidas líquidas / capacidade nominal.
- Semana, dia da semana, mês, ano e empresas combinadas: soma das aves líquidas / soma das capacidades dos mesmos registros válidos, sem média de percentuais.
- Fonte única: /api/pcp/comparativo/eficiencia-abate, revisão eficiencia-capacidade-v2. A mesma utilizada pela tela de Eficiência, incluindo desconto de mortos, velocidade e pausas documentadas em EFICIENCIA_CAPACIDADE.md.
- Não atribui turnos aos tickets e não utiliza os horários de turnos informados, pois há sobreposição. No calendário, 1º ou 2º turno isolado da Ave Nova não exibe a linha. Ave Nova consolidada, Real e combinação das empresas exibem eficiência.
- O mensal permanece independente dos filtros Mês, Dia e Unidade / Turno: ano inteiro, duas empresas e total geral. Eficiência somente no total da Ave Nova, Real e total geral, incluindo total anual; omitida nas duas colunas de turno.
- Respeita D−1 e datas selecionadas do calendário, inclusive meses vizinhos em Semana cheia. Ausência de componentes válidos aparece como —; não inventa eficiência por turno.
- Carrega uma consulta por ano e limite D−1, compartilhada entre calendário e mensal. Mudanças de unidade/dia/mês reutilizam essa carga; falhas não ficam em cache. Não adiciona atualização periódica.
- API anterior ou falha mostra aviso apenas na Produtividade, sem impedir a exibição dos demais indicadores. Requer o pacote de API v2 já preparado; nenhum backend/SQL/banco foi alterado nesta inclusão.

Validação: testes de agregação, D−1, filtros, deduplicação empresa/dia, turnos omitidos, cache e API incompatível; regressões existentes de Produtividade e Eficiência. Edge com API simulada em 1366, 1440 e 1920 px, incluindo comparação de Rendimento com o backup anterior. Não foi feita consulta autenticada à API publicada.

Backup antes desta alteração: outputs/backups/produtividade-eficiencia-20261125/backup-oficial.zip. Nenhuma publicação automática.
