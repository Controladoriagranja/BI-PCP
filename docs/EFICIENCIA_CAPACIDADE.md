# Eficiência de abate — revisão v3 — 26/11/2026

## Regra vigente

    Eficiência (%) = Aves abatidas / Capacidade de abate × 100
    Aves abatidas = Cabeças − Mortos Transporte (Cab)
    Capacidade de abate = velocidade nominal × tempo disponível em horas
    Tempo ideal de referência = Aves abatidas / velocidade nominal

| Empresa | Início | Descontos | Velocidade nominal |
|---|---|---|---|
| Ave Nova | 06:00 | Almoço 72 min + pausa térmica 60 min = 132 min, inclusive sábado | 10.800 aves/h |
| Real Alimentos | 06:00 | Somente intervalo de 70 min; sem pausa térmica | 9.500 aves/h |

Usar a data e o horário da última tara válida, preservando a virada da meia-noite. Ignorar segundos e microssegundos no tempo disponível, sem arredondar para o próximo minuto. A velocidade nominal é fixa; não é calculada pela produção realizada.

Semana, mês, ano e combinação das empresas usam soma das aves abatidas / soma das capacidades de abate, com os mesmos registros válidos no numerador e denominador. Não usar média de percentuais. O valor interno da API continua sendo uma razão; a apresentação multiplica por 100 e mantém uma casa decimal.

Velocidade da linha é informativa: soma das Cabeças brutas / soma das horas disponíveis. Ela não participa da capacidade nem da eficiência.

## Fontes e tratamento

- pcp.diario_industria: data, empresa, secao, descricao, quantidade. Priorizar Cabeças em Abate - Total; usar Recepção de Aves Vivas somente quando ausente. Mortos Transporte (Cab) da mesma seção. Zero em Abate não aciona alternativa.
- pcp.movimento_geral_pesagem: data_abate, empresa, pesagem, dt_tara, hr_tara e operacao. Usar última tara válida de ENTRADA DE AVES VIVAS. A escolha do último ticket mantém o horário completo; os segundos são descartados no cálculo do tempo.
- D−1 em Brasília, meta de 95% e resultados acima de 100% preservados. Sem componentes válidos ou capacidade positiva, mostrar —. Quantidade líquida zero com capacidade válida resulta em zero.
- Não atribuir turnos aos caminhões. A informação de horários sobrepostos não foi usada para inventar uma separação. Turnos isolados da Ave Nova permanecem sem eficiência.

## Exemplos conferidos

| Caso | Tempo disponível | Capacidade | Eficiência |
|---|---|---|---|
| AN: 14:50, 65.000 aves líquidas | 06:38 | 71.640 | 90,73% (tela: 90,7%) |
| AN 02/11: 22:47, 101.134 aves líquidas | 14:35 | 157.500 | 64,21% (tela: 64,2%) |
| Real 02/11: 16:36, 73.615 aves líquidas | 09:26 | 89.616,666… | 82,14% (tela: 82,1%) |

## Interface e calendário

Na tela de Eficiência, usar os nomes Aves abatidas e Capacidade de abate. O modal ƒx explica a fórmula curta, componentes, parâmetros e acumulação. “Ver regra atual da API” contém o helper final, a seleção dos dados e o SQL do pacote preparado; é uma referência estática dessa revisão, não uma consulta ao código do servidor em tempo real.

Somente na Produtividade: o valor da eficiência é um link para index.html?relatorio=g5. Dia abre aquele dia; total semanal abre seu recorte; mensal abre o mês; anual abre o ano até D−1. As empresas seguem a célula clicada. O mensal continua independente do filtro superior de Unidade / Turno e mantém as duas empresas e o total geral.

Os links transportam data_inicio, data_fim, unidade e resumo. Quando necessário, datas preserva dias não contíguos ou o filtro Dia. O receptor refaz os acumulados usando somente essas datas. Alterar filtros manualmente ou limpar filtros libera esse recorte. O link fica fora do botão diário que abre Rendimento, evitando navegação conflitante. Valores indisponíveis não são links.

## Pacote da API atualizado

Base exclusiva: api_zootecnico(6).zip fornecido pelo usuário. O gerador exige os hashes dos dois módulos conferidos. Apenas pcp_comparativo.py e pcp_eficiencia_capacidade.py mudam; os demais arquivos são preservados byte a byte, excluindo .env e caches Python do pacote de entrega. Não houve mudança de SQL, esquema, banco, dependências ou outros endpoints.

Entrega: outputs/eficiencia-v3-20261126/api_zootecnico-eficiencia-v3-atualizado.zip.

1. Fazer backup da API em execução e confirmar que corresponde ao ZIP (6). Se houver mudanças posteriores, mesclar antes de substituir.
2. Instalar os dois módulos alterados na mesma pasta, preservando .env, variáveis e volumes.
3. Recriar a imagem/serviço pelo procedimento atual do Docker/Portainer.
4. Conferir /api/pcp/comparativo/eficiencia-abate: revisao_formulas = eficiencia-capacidade-v3; AN 10800, Real 9500; pausas 132/70; tempo sem segundos.
5. Depois publicar o frontend. Tela de Eficiência e Produtividade exigem v3 para não apresentar fórmulas novas sobre cálculos antigos.

## Validação e backup

Testes locais de cálculo e integração com o código real do ZIP (6), conferência dos demais arquivos do pacote, testes de filtros/cache e regressões da Produtividade. Navegador Chromium com API simulada em 1366, 1440 e 1920 px, incluindo links emitidos pelo calendário, entrada por dia/semana/mês, modal ƒx e comparação de Rendimento com o backup. Sem consulta autenticada à API publicada.

Backup local anterior à instalação: outputs/backups/eficiencia-v3-20261126/backup-oficial.zip. Nada foi publicado automaticamente; ZIP original e planilha não foram alterados.
