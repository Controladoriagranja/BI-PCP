# Eficiência de abate — revisão v2 — 25/11/2026

Alteração local; não publicada. A API precisa ser atualizada antes de publicar o frontend.

## Cálculo vigente

    aves_liquidas = cabecas - mortos_transporte_cab
    horas_AN = ultima_tara - data_abate às 06:00 - 132 minutos
    tempo_ideal_AN = aves_liquidas / 10800
    capacidade_AN = horas_AN * 10800
    eficiencia = aves_liquidas / capacidade

Ave Nova usa 10.800 aves/h em todo o período, inclusive sábado, conforme EficiênciaAbate.xlsx, Planilha1!C7. Substitui os antigos blocos de 61.000 aves e velocidades de 10.800/9.500. A capacidade independe da quantidade realizada.

Planilha: início 06:00 (C2), almoço 72 minutos (C3), pausa térmica 60 minutos (C4). Última tara 14:50 produz 6h38 disponíveis (C6), capacidade de 71.640 aves (C8) e, para 65.000 aves líquidas, eficiência de 90,73143495% (C10/C8). A interface mantém uma casa decimal; não há arredondamento intermediário.

Real Alimentos mantém velocidade de 10.000 aves/h e tempo real existente, início às 06:00 com desconto de 70 minutos.

## Fontes e acumulação

pcp.diario_industria: data, empresa, secao, descricao, quantidade. Cabeças em Abate - Total; Recepção de Aves Vivas somente quando ausente. Zero não aciona alternativa. Mortos Transporte (Cab) da mesma seção, em cabeças.

pcp.movimento_geral_pesagem: data_abate, empresa, pesagem, dt_tara, hr_tara, operacao. Última tara válida de ENTRADA DE AVES VIVAS. Preserva data completa quando ocorre após meia-noite.

Cálculo diário por empresa, sem atribuir turnos aos tickets. Não inventa horários de troca; turno_codigo está ausente na amostra. A consulta de eficiência não usa diario_industria_turnos.

Semana e mês: SUM(aves_liquidas) / SUM(capacidades), com os mesmos dias válidos. Sem média de percentuais. D−1, meta 95%, filtros e resultados acima de 100% preservados. Mortos ausentes/inválidos, tara inválida ou tempo não positivo deixam eficiência como —. Líquido zero com capacidade válida resulta em zero. Velocidade realizada da linha continua Cabeças brutas / horas disponíveis.

## Arquivos

backend/eficiencia/pcp_eficiencia_capacidade.py, tools/preparar_api_eficiencia.py, assets/js/pcp-eficiencia.js, assets/js/indicator-formulas-data.js, index.html e testes tools/test_pcp_eficiencia_*. O modal ƒx documenta os componentes e suas origens. Apenas catálogo g5 alterado.

O pcp-cirurgico.js recebido pelo pull foi preservado integralmente. Seu cache foi atualizado no index.html. Backup pós-pull: outputs/backups/eficiencia-10800-20261125/backup-pos-pull.zip. Nenhuma regra de Produtividade ou Rendimento foi alterada por esta revisão.

## API no Docker / Portainer

Pacote: outputs/eficiencia-10800-20261125/api_zootecnico-eficiencia-10800.zip. Base: api_zootecnico(5).zip. pcp_comparativo.py é idêntico nos ZIPs (4) e (5) conferidos; SHA256 aceito: a5c31e6841d4f9818414f722bd74667b12ea23bfb608ca5bcc94c9a9e86aff39.

1. Fazer backup da API e comparar a versão. Se houver mudanças adicionais, mesclar somente a eficiência; não sobrescrever API diferente com pacote antigo.
2. Instalar pcp_comparativo.py e o novo pcp_eficiencia_capacidade.py na mesma pasta. Preservar .env, variáveis, volumes e outros arquivos.
3. Recriar o serviço no Portainer conforme procedimento atual. Sem novas dependências ou SQL de migração.
4. Conferir /api/pcp/comparativo/eficiencia-abate: revisao_formulas = eficiencia-capacidade-v2, velocidade_nominal = 10800 na AN e capacidade_nominal_aves = tempo_disponivel_horas * velocidade_nominal.
5. Publicar frontend somente depois da API. A tela rejeita revisão antiga para não apresentar fórmula nova sobre resultados antigos.

Pacote exclui .env e caches Python. Não altera ZIPs originais ou planilha. Testes usam dados simulados e código do ZIP, sem reconciliação com banco ou API publicada.
