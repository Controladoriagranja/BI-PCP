# Eficiência na Produtividade

Revisão vigente: eficiencia-capacidade-v3, 26/11/2026.

A fórmula, os parâmetros e a navegação por dia, semana, mês e ano estão documentados em [EFICIENCIA_V3.md](EFICIENCIA_V3.md). Real Alimentos usa 9.500 aves/h; AN usa 10.800 aves/h. Tempos ignoram segundos, com pausas AN de 132 minutos e intervalo Real de 70 minutos, sem pausa térmica na Real.

Turnos isolados da Ave Nova continuam sem eficiência. O mensal mantém ano inteiro, as duas empresas e total geral, independentemente dos filtros do calendário. Consultas anuais compartilhadas continuam em cache e não foi adicionada atualização periódica.


## Ordem e correspondência entre telas — 27/11/2026

Nos dias e em todos os totais, inclusive mensal e anual: Aves Abat vs Meta, Eficiência e Peso médio, nessa ordem. Os dois últimos indicadores diários ficam fora do botão que abre Rendimento, preservando o clique exclusivo na eficiência.

Links da eficiência identificam origem=produtividade. Nessa navegação, g5 mantém as empresas e datas do recorte, apresenta o consolidado Real Alimentos + Ave Nova quando ambas estão selecionadas e acrescenta Total do período. O consolidado diário mostra aves líquidas, capacidade e eficiência; não inventa um único ticket ou horário para duas empresas. O resultado correspondente ao clique recebe destaque e é trazido à área visível uma única vez. A abertura normal de g5 continua com a apresentação anterior.

Eficiência consolidada: soma das aves líquidas / soma das capacidades dos mesmos registros válidos, sem média de percentuais. Os dados são deduplicados por empresa/data. O filtro de datas não contíguas e D−1 é preservado. Não houve mudança de backend, SQL, parâmetros de velocidade/pausas ou fórmulas.

Validação local: 15 combinações numéricas de recorte e empresa; nove cliques com abertura da URL produzida e comparação literal do percentual usando a mesma API simulada; larguras de 1366, 1440 e 1920 px; regressões da Produtividade e comparação de Rendimento com backup. Esses testes não consultam a API autenticada em produção.
