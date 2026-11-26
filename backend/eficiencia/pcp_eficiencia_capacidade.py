"""Eficiência da Ave Nova pela capacidade da planilha: 10.800 aves/h fixas.
Real Alimentos: 9.500 aves/h, intervalo de 70 min, sem pausa térmica.
"""
from datetime import date, datetime, time
from math import isfinite

REVISAO = 'eficiencia-capacidade-v3'
PAUSAS_AN_MINUTOS = 72 + 60
VELOCIDADE_AN = 10800
VELOCIDADE_RA = 9500
PAUSAS_RA_MINUTOS = 70


def numero(value):
    return value if isinstance(value, (int, float)) and not isinstance(value, bool) and isfinite(value) else None


def data_civil(value):
    if isinstance(value, datetime):
        return value.date()
    return value if isinstance(value, date) else date.fromisoformat(str(value)[:10])


def tempo_disponivel(row):
    try:
        inicio = datetime.combine(data_civil(row['data']), time(6))
        fim = datetime.combine(data_civil(row['data_tara']), time.fromisoformat(str(row['horario_tara']))).replace(second=0, microsecond=0)
        pausas = PAUSAS_AN_MINUTOS if row['unidade'] == '10' else PAUSAS_RA_MINUTOS
        horas = (fim - inicio).total_seconds() / 3600 - pausas / 60
        return horas if horas > 0 else None
    except (KeyError, ValueError, TypeError, OverflowError):
        return None


def tempo_disponivel_an(row):
    # Compatibilidade com consumidores anteriores; a regra é comum às empresas.
    return tempo_disponivel({**row, 'unidade': '10'})


def aplicar_formula_capacidade(result):
    for row in result['dias']:
        heads, dead = numero(row.get('cabecas')), numero(row.get('mortos_transporte_cab'))
        net = heads - dead if heads is not None and dead is not None and 0 <= dead <= heads else None
        actual = tempo_disponivel(row)
        speed = VELOCIDADE_AN if row['unidade'] == '10' else VELOCIDADE_RA
        ideal = net / speed if net is not None else None
        row['tempo_ideal_horas'] = ideal
        capacity = actual * speed if actual is not None and speed is not None else None
        row.update(aves_abatidas_liquidas=net, tempo_disponivel_horas=actual,
                   tempo_real_horas=actual, velocidade_nominal=speed, velocidade_nominal_equivalente=speed,
                   capacidade_nominal_aves=capacity,
                   eficiencia=net / capacity if net is not None and capacity is not None and capacity > 0 else None)
        rule = dict(row.get('regra_aplicada') or {})
        rule.setdefault('tipo_dia', 'sabado' if data_civil(row['data']).weekday() == 5 else 'dia_util' if data_civil(row['data']).weekday() < 5 else 'domingo')
        rule.setdefault('ajuste_ideal_horas', 0)
        rule['inicio_abate'] = '06:00'
        rule['velocidade_nominal_aves_hora'] = speed
        rule['precisao_tempo'] = 'Horas e minutos; segundos ignorados'
        rule['limite_turnos_aplicado'] = False
        if row['unidade'] == '10':
            rule.update(pausas_minutos=PAUSAS_AN_MINUTOS, almoco_minutos=72, pausa_termica_minutos=60,
                        origem_velocidade='EficiênciaAbate.xlsx!C7: 10.800 aves/h fixas',
                        origem_pausas='EficiênciaAbate.xlsx!C3:C4: almoço 72 min + pausa térmica 60 min, inclusive sábado')
        else:
            rule.update(pausas_minutos=PAUSAS_RA_MINUTOS, intervalo_minutos=70, pausa_termica_minutos=0,
                        origem_velocidade='Parâmetro da Real confirmado pelo usuário: 9.500 aves/h fixas',
                        origem_pausas='Real Alimentos: somente intervalo de 70 min, sem pausa térmica')
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
        'formula_exibida': 'Aves abatidas / Capacidade de abate × 100',
        'aves_abatidas': 'Cabeças menos Mortos Transporte (Cab), da mesma seção',
        'capacidade': 'tempo_disponivel_horas * velocidade_nominal',
        'precisao_tempo': 'Horas e minutos; segundos ignorados',
        'velocidade_nominal': 'AN: 10800 aves/h fixas; RA: 9500 aves/h fixas',
        'turnos': 'AN sem divisão por turnos ou limite de 61.000 aves; mesma velocidade em todo o período',
        'pausas_an_minutos': PAUSAS_AN_MINUTOS,
        'velocidade_an_aves_hora': VELOCIDADE_AN,
        'velocidade_ra_aves_hora': VELOCIDADE_RA,
        'intervalo_ra_minutos': PAUSAS_RA_MINUTOS,
        'pausa_termica_ra_minutos': 0,
    }
    return result
