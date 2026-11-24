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

## Alinhamento de Rendimento — 05/11/2026

Por solicitação posterior à migração, os filtros e ações de Rendimento passaram
a ocupar uma única linha no desktop, seguindo a organização de Produtividade.
Ordem: Grupo, Ano, Mês, Dia, Unidade, Atualizar, flags Rendimento/Produtividade
e Limpar filtros. Os nomes, seleções, tabelas, cálculos e timers foram mantidos.
Nas telas menores, os campos se reorganizam. Produtividade não foi redesenhada.
O teste de baseline continua comparando tabelas, opções e estilo do botão
Atualizar; o layout dos filtros agora é comparado antes/depois da troca de aba
e validado quanto à ordem, alinhamento e ausência de transbordamento.
Backup anterior ao ajuste em outputs/backups/rendimento-linha-20261105-141833/.

## Ajustes de navegação e seleção — 05/11/2026

- Os botões de fórmulas não são gerados nos quadros de Produtividade.
  Os botões dos quadros de Rendimento e das demais telas são preservados.
- Real Alimentos e os turnos individuais da Ave Nova são exclusivos: clicar
  em Real desmarca 1T/2T; clicar em 1T/2T desmarca Real. Marcar ambos os turnos
  continua convertendo a seleção em Ave Nova. Ave Nova total + Real continua
  permitido. Nomes e ordem das quatro opções permanecem os mesmos.
- Clicar em um dia abre Rendimento com o ano, mês, dia e unidade/turno do
  calendário. A transição substitui os filtros antigos de Rendimento pelos
  filtros de Produtividade, com Grupo sem restrição, como na aba de origem.
- Semana cheia permite navegar por datas dos meses/anos vizinhos. Datas após
  D−1 não navegam. Um dia sem registros continua explicitamente selecionado,
  inclusive após atualização automática, sem ampliar o filtro para todo o mês.
- Fórmulas, layout e atualização automática de Rendimento continuam disponíveis.

Foram validadas cinco seleções válidas em seis larguras, os dois sentidos das
trocas Real/turno, a conversão 1T+2T, as fórmulas apenas fora de Produtividade,
a navegação de todas as unidades para 05/10/2026, dia sem dados com atualização
automática e navegação para 29/12/2025 a partir da semana cheia de janeiro/2026.
Testes locais com API simulada; nenhuma publicação ou alteração do banco.
Backup anterior em outputs/backups/produtividade-navegacao-20261105-162047/.


## Metas de abate e aderência — 24/11/2026

Ave Nova considera a produção completa por turno para escolher a meta: apenas 1T
usa sua meta cadastrada de sábado; ambos os turnos usam as metas normais; apenas
2T usa sua meta do dia. A Real mantém as metas atuais, conforme confirmação do
usuário. Dias sem produção dentro do D−1 têm indicadores de abate zerados.
Aderência Abate aparece após Diferença em todos os níveis, como razão das somas.
O mensal continua com 12 meses, ambas as empresas e o total, independente dos
filtros do calendário. Rendimento, pesos e paradas preservados.
Veja [diagnóstico, regras, testes e limitações](METAS-ABATE-ADERENCIA.md).


## Soma das paradas disponíveis — 24/11/2026

Os totais de paradas da Produtividade somam os minutos informados, mesmo quando
houver dias, empresas ou meses sem valor. Ausência total continua como —; zero
numérico confirmado participa da soma. A API mantém sua validação de cobertura.

O mensal numérico da API tem prioridade. Quando ele vem nulo por cobertura
parcial, usam-se os valores diários disponíveis do mesmo mês, empresa e turno,
já retornados pela consulta anual existente. Não se somam mensal e diário juntos.
O anual soma os meses disponíveis; os dias da API ficam limitados ao D−1.
O título dos totais informa quando a soma contém lacunas de cobertura.

Ave Nova total continua independente de 1T/2T. O geral soma AN total + Real,
sem acrescentar os turnos novamente. Os filtros do calendário e a independência
do mensal são preservados, assim como as metas disponíveis. Sem meta completa,
os minutos continuam visíveis, com apresentação neutra.

Conferido com pcp_paradas.py e pcp_comparativo.py no api_zootecnico(4).zip fornecido.
Nenhuma alteração de API, backend, banco ou consulta adicional foi necessária.
O bloco de Rendimento e o CSS permanecem idênticos.

Validação: 12 suítes JavaScript; Edge headless com API simulada, cinco seleções
em 1366, 1440 e 1920 px, incluindo dia/mês ausente, recuperação diária, fonte
consolidada independente, zero confirmado, D−1 e total anual. Não representa
conferência autenticada dos valores publicados.

Executar: node tools/test_pcp_productivity_stops.cjs e
python -B tools/test_pcp_productivity_stops_browser.py --widths 1366,1440,1920.
Backup anterior em outputs/backups/produtividade-soma-paradas-20261124/.
