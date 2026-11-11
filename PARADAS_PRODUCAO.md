# Paradas de produção (minutos)

Indicador 15 do Comparativo x Cirúrgico Geral, disponível apenas ao Admin durante validação. O controle de perfil é feito na API pela identidade CENTRAL. Diretor e usuário comum recebem apenas os 14 indicadores existentes; a rota de detalhes retorna 403. As tabelas em validação não são expostas pelo catálogo genérico.

Fonte: Agrosys wpcf094d / wpcf094r, menu 18215, relatório detalhado. Quatro extrações independentes: Ave Nova total, turnos 1 e 2, e Real total. Somar Tempo em minutos somente nas linhas analíticas, conferir contra TOTAL oficial, ignorar subtotais e resumos. Não somar os turnos ao arquivo total. Ausência de carga é —; zero exige período com carga confirmada. Meta diária definida pelo usuário: 72 minutos por turno e 144 minutos no total de cada unidade. Igual ou abaixo: verde; acima: vermelho. No acumulado, multiplicar a meta diária pela quantidade de dias apresentados.

Clique no nome ou nos minutos para ver resumo por tipo em cima (minutos, horas e participação) e ocorrências embaixo (data, unidade, célula, tipo, horários, minutos, observação, equipamento e usuário). O período selecionado é preservado.

Validação inicial de 01/11 a 10/11/2026: 1º turno AN 372 min, 2º turno AN 168 min, AN total 540 min, Real total 670 min. 1º turno: Indústria 251, Campo 63, Manutenção 51, Integração/Logística 7. Fontes e evidências ficam localmente, não no GitHub público.

Coletor: Agrosys_Extractor/PCP/robo_paradas_producao.py. Importador: Agrosys_Extractor/Robo Banco/PCP/infra/paradas_store.py. Incluído na rotina PCP para quando as atualizações forem retomadas; a pausa solicitada para esta criação permanece ativa.
