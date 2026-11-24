-- SOMENTE LEITURA. Conferir no bi_granja; não altera produção nem metas.
-- Troque o intervalo no CTE parametros para conferir outros períodos.
-- A Real mantém a meta normal, conforme confirmação de 24/11/2026.
-- Cabeças: Abate - Total primeiro, Recepção de Aves Vivas como fallback;
-- MAX dentro da seção escolhida. Zero em Abate não aciona fallback.
WITH parametros AS (
    SELECT DATE '2026-11-16' AS inicio, DATE '2026-11-23' AS fim,
           (CURRENT_TIMESTAMP AT TIME ZONE 'America/Sao_Paulo')::date - 1 AS limite
), bruto AS (
    SELECT 'diario_industria'::text AS fonte, data_referencia AS dia,
           empresa, empresa_codigo, NULL::text AS turno,
           secao, quantidade
    FROM pcp.diario_industria, parametros p
    WHERE descricao = 'Cabeças'
      AND data_referencia BETWEEN p.inicio AND LEAST(p.fim, p.limite)
    UNION ALL
    SELECT 'diario_industria_turnos', data_referencia,
           empresa, empresa_codigo, turno_codigo::text, secao, quantidade
    FROM pcp.diario_industria_turnos, parametros p
    WHERE descricao = 'Cabeças'
      AND turno_codigo::text IN ('1', '2')
      AND data_referencia BETWEEN p.inicio AND LEAST(p.fim, p.limite)
), normalizado AS (
    SELECT *,
        CASE
          WHEN regexp_replace(lower(COALESCE(empresa,'')), '[^a-z0-9]', '', 'g') IN ('avenova','an') THEN '10'
          WHEN regexp_replace(lower(COALESCE(empresa,'')), '[^a-z0-9]', '', 'g') IN ('realalimentos','real','ra') THEN '111'
          WHEN ltrim(COALESCE(empresa_codigo,''), '0') = '10' THEN '10'
          WHEN ltrim(COALESCE(empresa_codigo,''), '0') = '111' THEN '111'
        END AS unidade,
        CASE secao WHEN 'Abate - Total' THEN 0
                   WHEN 'Recepção de Aves Vivas' THEN 1 END AS prioridade
    FROM bruto
    WHERE quantidade IS NOT NULL
), prioridades AS (
    SELECT *, MIN(prioridade) OVER (PARTITION BY fonte, unidade, dia, turno) AS primeira
    FROM normalizado
    WHERE unidade IS NOT NULL AND prioridade IS NOT NULL
), diario AS (
    SELECT fonte, unidade, dia, turno, MAX(quantidade) AS aves
    FROM prioridades
    WHERE prioridade = primeira
    GROUP BY fonte, unidade, dia, turno
), turnos AS (
    SELECT dia,
           MAX(aves) FILTER (WHERE turno = '1') AS aves_1t,
           MAX(aves) FILTER (WHERE turno = '2') AS aves_2t
    FROM diario
    WHERE fonte = 'diario_industria_turnos' AND unidade = '10'
    GROUP BY dia
), dias AS (
    SELECT g::date AS dia
    FROM parametros p,
         generate_series(p.inicio, LEAST(p.fim,p.limite), INTERVAL '1 day') g
), base AS (
    SELECT d.dia, u.unidade, t.aves_1t, t.aves_2t,
           c.aves AS aves_diario_comum,
           CASE WHEN u.unidade='10' THEN COALESCE(t.aves_1t,0)+COALESCE(t.aves_2t,0)
                ELSE COALESCE(c.aves,0) END AS aves_calendario,
           (ARRAY[NULL,'SEG','TER','QUA','QUI','SEX','SAB'])[extract(dow FROM d.dia)::integer+1] AS sufixo
    FROM dias d
    CROSS JOIN (VALUES ('10'), ('111')) u(unidade)
    LEFT JOIN turnos t ON t.dia=d.dia AND u.unidade='10'
    LEFT JOIN diario c ON c.dia=d.dia AND c.unidade=u.unidade
                     AND c.fonte='diario_industria'
), metas AS (
    SELECT referencia_mes, indicador_codigo, valor_meta
    FROM pcp.metas
    WHERE tela='calendario_producao_produtividade' AND ativo
      AND unidade='aves' AND comparacao='>='
), referencias AS (
    SELECT b.*, m1.valor_meta AS meta_1t_dia, m2.valor_meta AS meta_2t_dia,
           ms.valor_meta AS meta_1t_sabado, mr.valor_meta AS meta_real_dia
    FROM base b
    LEFT JOIN metas m1 ON m1.referencia_mes=date_trunc('month',b.dia)::date AND m1.indicador_codigo='PROD_AN_T1_'||b.sufixo
    LEFT JOIN metas m2 ON m2.referencia_mes=date_trunc('month',b.dia)::date AND m2.indicador_codigo='PROD_AN_T2_'||b.sufixo
    LEFT JOIN metas ms ON ms.referencia_mes=date_trunc('month',b.dia)::date AND ms.indicador_codigo='PROD_AN_T1_SAB'
    LEFT JOIN metas mr ON mr.referencia_mes=date_trunc('month',b.dia)::date AND mr.indicador_codigo='PROD_RA_'||b.sufixo
), resultado AS (
    SELECT *,
        CASE WHEN unidade='111' THEN meta_real_dia
             ELSE COALESCE(meta_1t_dia,0)+COALESCE(meta_2t_dia,0) END AS meta_anterior_dia_com_registro,
        CASE WHEN aves_calendario<=0 THEN 0
             WHEN unidade='111' THEN meta_real_dia
             WHEN aves_1t>0 AND COALESCE(aves_2t,0)<=0 THEN meta_1t_sabado
             WHEN aves_2t>0 AND COALESCE(aves_1t,0)<=0 THEN meta_2t_dia
             WHEN aves_1t>0 AND aves_2t>0 THEN meta_1t_dia+meta_2t_dia
        END AS meta_corrigida
    FROM referencias
)
SELECT dia, CASE unidade WHEN '10' THEN 'Ave Nova' ELSE 'Real Alimentos' END AS empresa,
       aves_1t, aves_2t, aves_diario_comum, aves_calendario,
       meta_1t_dia, meta_2t_dia, meta_1t_sabado, meta_real_dia,
       meta_anterior_dia_com_registro, meta_corrigida,
       aves_calendario-meta_corrigida AS diferenca,
       CASE WHEN meta_corrigida=0 THEN 0
            ELSE ROUND((100.0*aves_calendario/meta_corrigida)::numeric,2) END AS aderencia_abate_pct,
       CASE WHEN unidade='111' THEN 'Meta da Real preservada; sem inferir turnos/antecipação'
            WHEN aves_calendario<=0 THEN 'Sem produção'
            WHEN aves_1t>0 AND COALESCE(aves_2t,0)<=0 THEN 'Apenas 1T: meta de sábado'
            WHEN aves_2t>0 AND COALESCE(aves_1t,0)<=0 THEN 'Apenas 2T: meta do dia para 2T'
            ELSE 'Dois turnos: metas normais' END AS criterio
FROM resultado
ORDER BY dia, unidade;
