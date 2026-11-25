"""Eficiência da Ave Nova pela capacidade da planilha: 10.800 aves/h fixas.
Real Alimentos mantém seus parâmetros e o tempo real da regra existente.
"""
from datetime import date, datetime, time
from math import isfinite

REVISAO = 'eficiencia-capacidade-v2'
PAUSAS_AN_MINUTOS = 72 + 60
VELOCIDADE_AN = 10800


def numero(value):
    return value if isinstance(value, (int, float)) and not isinstance(value, bool) and isfinite(value) else None


def data_civil(value):
    if isinstance(value, datetime):
        return value.date()
    return value if isinstance(value, date) else date.fromisoformat(str(value)[:10])


def tempo_disponivel_an(row):
    try:
        inicio = datetime.combine(data_civil(row['data']), time(6))
        fim = datetime.combine(data_civil(row['data_tara']), time.fromisoformat(str(row['horario_tara'])))
        horas = (fim - inicio).total_seconds() / 3600 - PAUSAS_AN_MINUTOS / 60
        return horas if horas > 0 else None
    except (KeyError, ValueError, TypeError, OverflowError):
        return None


def aplicar_formula_capacidade(result):
    for row in result['dias']:
        heads, dead = numero(row.get('cabecas')), numero(row.get('mortos_transporte_cab'))
        net = heads - dead if heads is not None and dead is not None and 0 <= dead <= heads else None
        ideal = numero(row.get('tempo_ideal_horas'))
        actual = tempo_disponivel_an(row) if row['unidade'] == '10' else numero(row.get('tempo_real_horas'))
        actual = actual if actual is not None and actual > 0 else None
        if row['unidade'] == '10':
            # A capacidade é independente da quantidade realizada.
            speed = VELOCIDADE_AN
            ideal = net / speed if net is not None else None
            row['tempo_ideal_horas'] = ideal
        else:
            speed = net / ideal if net is not None and net > 0 and ideal is not None and ideal > 0 else None
        capacity = actual * speed if actual is not None and speed is not None else None
        row.update(aves_abatidas_liquidas=net, tempo_disponivel_horas=actual,
                   tempo_real_horas=actual, velocidade_nominal=speed, velocidade_nominal_equivalente=speed,
                   capacidade_nominal_aves=capacity,
                   eficiencia=net / capacity if net is not None and capacity is not None and capacity > 0 else None)
        rule = dict(row.get('regra_aplicada') or {})
        rule.setdefault('tipo_dia', 'sabado' if data_civil(row['data']).weekday() == 5 else 'dia_util' if data_civil(row['data']).weekday() < 5 else 'domingo')
        rule.setdefault('ajuste_ideal_horas', 0)
        if row['unidade'] == '10':
            rule['pausas_minutos'] = PAUSAS_AN_MINUTOS
            rule['velocidade_nominal_aves_hora'] = VELOCIDADE_AN
            rule['origem_velocidade'] = 'EficiênciaAbate.xlsx!C7: 10.800 aves/h, sem divisão em blocos'
            rule['limite_turnos_aplicado'] = False
            rule['origem_pausas'] = 'EficiênciaAbate.xlsx!C3:C4: almoço 72 min + pausa térmica 60 min'
        else:
            rule.setdefault('pausas_minutos', 70)
            rule['origem_pausas'] = 'Regra existente da Real Alimentos na API; tempo real preservado'
        row['regra_aplicada'] = rule
        if row['eficiencia'] is not None:
            row['situacao'] = 'calculado'
        elif actual is None and row.get('data_tara'):
            row['situacao'] = 'tempo_invalido'
    for week in result.get('resumo_semanal', []):
        for item in week['valores']:
            selected = [row for row in result['dias'] if row['chave_semana'] == week['chave'] and row['unidade'] == item['unidade']]
            valid = [row for row in selected if row['capacidade_nominal_aves'] is not None and row['capacidade_nominal_aves'] > 0 and row['aves_abatidas_liquidas'] is not None and row['aves_abatidas_liquidas'] >= 0]
            capacity = sum(row['capacidade_nominal_aves'] for row in valid)
            net = sum(row['aves_abatidas_liquidas'] for row in valid)
            speeds = [row for row in selected if numero(row.get('cabecas')) is not None and row['cabecas'] > 0 and row['tempo_real_horas'] is not None]
            hours = sum(row['tempo_real_horas'] for row in speeds)
            item.update(eficiencia=net / capacity if valid and capacity > 0 else None,
                        capacidade_nominal_aves=capacity if valid else None,
                        aves_abatidas_liquidas=net if valid else None,
                        dias_validos_eficiencia=len(valid),
                        tempo_ideal_horas=sum(row['tempo_ideal_horas'] for row in valid) if valid else None,
                        tempo_real_horas=sum(row['tempo_real_horas'] for row in valid) if valid else None,
                        velocidade_linha=sum(row['cabecas'] for row in speeds) / hours if hours else None,
                        cabecas_velocidade=sum(row['cabecas'] for row in speeds) if speeds else None,
                        horas_velocidade=hours if speeds else None)
    result['revisao_formulas'] = REVISAO
    result['regra_eficiencia'] = {
        'formula': 'SUM(aves_abatidas_liquidas) / SUM(capacidade_nominal_aves)',
        'capacidade': 'tempo_disponivel_horas * velocidade_nominal',
        'velocidade_nominal': 'AN: 10800 aves/h fixas; RA: regra existente',
        'turnos': 'AN sem divisão por turnos ou limite de 61.000 aves; mesma velocidade em todo o período',
        'pausas_an_minutos': PAUSAS_AN_MINUTOS,
        'velocidade_an_aves_hora': VELOCIDADE_AN,
    }
    return result
