# Fórmulas dos indicadores

O botão ƒx abre a explicação do indicador, com fórmula, componentes, colunas e regras de consolidação. Nos painéis e no título, ele permite consultar as fórmulas do relatório atual.

A interface é somente leitura. Os cálculos e controles de acesso permanecem no backend. O recurso não executa SQL, DAX ou expressões digitadas pelo usuário.

Arquivos: `assets/js/indicator-formulas-data.js` (catálogo específico do setor), `assets/js/indicator-formulas.js` (modal e botões), `assets/css/indicator-formulas.css` (estilos). Manter os hashes do index atualizados ao alterar esses arquivos.

Fontes da revisão de 29/10/2026: funções de cálculo da API PCP, agregações da API Suprimentos e da API Logística, modelo oficial do PCP para o DAX de referência. O DAX original é identificado como referência; a regra atual da API é apresentada separadamente.

Regras especiais preservadas: CMS do Cirúrgico usa a Produção do Diário; PMP é ponderado pelo valor nominal; SLA segue dias úteis e o calendário de feriados da API; ABC usa o acumulado dos grupos positivos; ocupação usa cargas elegíveis; posições de estoque não são somadas entre datas.

Validação: Chrome em 320, 390 e 1366 pixels; abertura e fechamento por teclado, retorno de foco, ausência de botões duplicados e preservação dos valores. PCP Cirúrgico também conferido com a API real, incluindo os 14 indicadores, filtros e gráfico existente.
