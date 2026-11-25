# Fórmulas dos indicadores

O botão ƒx abre a explicação do indicador, com fórmula, componentes, colunas e regras de consolidação. Nos painéis e no título, ele permite consultar as fórmulas do relatório atual.

A interface é somente leitura. Os cálculos e controles de acesso permanecem no backend. O recurso não executa SQL, DAX ou expressões digitadas pelo usuário.

Arquivos: `assets/js/indicator-formulas-data.js` (catálogo específico do setor), `assets/js/indicator-formulas.js` (modal e botões), `assets/css/indicator-formulas.css` (estilos). Manter os hashes do index atualizados ao alterar esses arquivos.

Fontes da revisão de 29/10/2026: funções de cálculo da API PCP, agregações da API Suprimentos e da API Logística, modelo oficial do PCP para o DAX de referência. O DAX original é identificado como referência; a regra atual da API é apresentada separadamente.

Regras especiais preservadas: CMS do Cirúrgico usa a Produção do Diário; PMP é ponderado pelo valor nominal; SLA segue dias úteis e o calendário de feriados da API; ABC usa o acumulado dos grupos positivos; ocupação usa cargas elegíveis; posições de estoque não são somadas entre datas.

Validação: Chrome em 320, 390 e 1366 pixels; abertura e fechamento por teclado, retorno de foco, ausência de botões duplicados e preservação dos valores. PCP Cirúrgico também conferido com a API real, incluindo os 14 indicadores, filtros e gráfico existente.


## Eficiência de abate — 25/11/2026

O catálogo g5 foi atualizado para aves abatidas líquidas / capacidade nominal
equivalente. A documentação do modal inclui as fontes do Diário da Indústria
e da pesagem, pausas da planilha, velocidades e divisão de referência existentes.
O semanal e o mensal usam a razão entre as somas dos mesmos dias válidos.
Veja [regras, limitações e instalação da API](EFICIENCIA_CAPACIDADE.md).


## Eficiência — revisão vigente v2, 25/11/2026

Ave Nova: velocidade fixa 10.800 aves/h (EficiênciaAbate.xlsx!C7), capacidade = horas disponíveis × 10.800; substitui os antigos blocos de 61.000 aves e 9.500 aves/h. Mantém desconto de mortos e pausas de 72 + 60 minutos. Real: 10.000 aves/h e pausa existente de 70 minutos. Semana e mês: razão das somas dos mesmos dias válidos. Esta revisão substitui a descrição anterior de velocidades equivalentes. Detalhes em EFICIENCIA_CAPACIDADE.md e no modal ƒx.
