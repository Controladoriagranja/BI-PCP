# Metas apenas nos dias com produção — 25/11/2026

Correção restrita à Produtividade de Comparativo x Cirúrgico Geral. A meta de aves já ignora dias sem produção; a meta de paradas agora também considera apenas datas com quantidade de aves positiva, separadas por empresa ou turno.

Sem produção ou sem registro de aves: contribuição zero para a meta. A ausência em uma empresa não elimina a referência da outra. Datas e meses repetidos não duplicam meta; respeita D−1 e os filtros do calendário. Usa a meta diária informada nas paradas, quando disponível, ou os parâmetros já existentes: 30 minutos por turno AN, 60 no consolidado AN e 30 na Real.

Exemplo: segunda a sexta com produção nas duas empresas e sábado 21 sem produção: 5 × (60 + 30) = 450 minutos; não 540. O mês e o ano somam somente suas datas produtivas. Os minutos de paradas registrados permanecem iguais, inclusive os disponíveis em cobertura parcial.

O detalhamento aberto pela Produtividade utiliza a mesma referência ao trocar a visão; consultas de outras telas preservam a meta original da API. Não houve alteração de SQL, banco ou endpoints.

Validação: regressões de sábado zerado, empresa isolada sem produção, turnos, mês/ano, D−1, duplicidades e minutos preservados. Edge com dados simulados em 1366/1440/1920 px, incluindo abertura e troca de visão do detalhe e comparação de Rendimento com o backup. Sem publicação automática.
