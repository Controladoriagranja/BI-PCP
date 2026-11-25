"""Testes sem banco/rede. Usa o ZIP fornecido para conferir a integração."""
import ast
from collections import defaultdict
from copy import deepcopy
from datetime import date,datetime,timedelta
import importlib.util
import math
import os
from pathlib import Path
import sys
import unittest
import zipfile

ROOT=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(ROOT/'backend/eficiencia'))
from pcp_eficiencia_capacidade import aplicar_formula_capacidade,tempo_disponivel_an


class CapacityTests(unittest.TestCase):
    def row(self,unit='10',heads=65000,dead=0,ideal=None,day=date(2026,11,20),tara='14:50:00',tara_date=None):
        return {'data':day,'chave_semana':'2026-47','unidade':unit,'empresa':'Ave Nova' if unit=='10' else 'Real Alimentos',
                'cabecas':heads,'mortos_transporte_cab':dead,'tempo_ideal_horas':ideal if ideal is not None else heads/10800,
                'tempo_real_horas':8,'data_tara':tara_date or day,'horario_tara':tara,'situacao':'calculado'}

    def apply(self,rows):
        return aplicar_formula_capacidade({'dias':rows,'resumo_semanal':[{'chave':'2026-47','valores':[{'unidade':'10'},{'unidade':'111'}]}]})

    def test_workbook_single_speed_reference(self):
        row=self.row();self.apply([row])
        self.assertAlmostEqual(row['tempo_disponivel_horas'],6+38/60)
        self.assertAlmostEqual(row['capacidade_nominal_aves'],71640)
        self.assertAlmostEqual(row['eficiencia'],65000/71640)

    def test_legacy_two_speed_reference_is_replaced(self):
        ideal=61000/10800+48000/9500
        row=self.row(heads=110000,dead=1000,ideal=ideal);self.apply([row])
        self.assertEqual(row['tempo_ideal_horas'],109000/10800)
        self.assertEqual(row['aves_abatidas_liquidas'],109000)
        self.assertEqual(row['velocidade_nominal_equivalente'],10800)
        self.assertAlmostEqual(row['eficiencia'],(109000/10800)/row['tempo_real_horas'])

    def test_period_uses_birds_over_capacity_not_average_of_percentages(self):
        rows=[self.row(heads=60000,ideal=60000/10800),self.row(heads=100000,ideal=61000/10800+39000/9500,tara='20:00:00')]
        result=self.apply(rows);weekly=result['resumo_semanal'][0]['valores'][0]
        expected=sum(r['aves_abatidas_liquidas'] for r in rows)/sum(r['capacidade_nominal_aves'] for r in rows)
        self.assertAlmostEqual(weekly['eficiencia'],expected)
        self.assertNotAlmostEqual(expected,sum(r['eficiencia'] for r in rows)/2)
        self.assertAlmostEqual(expected,sum(r['tempo_ideal_horas'] for r in rows)/sum(r['tempo_real_horas'] for r in rows))

    def test_real_time_and_original_rule_preserved(self):
        row=self.row(unit='111',heads=80000,dead=1000,ideal=79000/10000)
        row['tempo_real_horas']=10-70/60
        row['regra_aplicada']={'pausas_minutos':70,'origem_excecao':{'origem':'regra existente'}}
        self.apply([row]);self.assertEqual(row['tempo_real_horas'],10-70/60)
        self.assertAlmostEqual(row['velocidade_nominal_equivalente'],10000)
        self.assertEqual(row['regra_aplicada']['origem_excecao']['origem'],'regra existente')

    def test_midnight_uses_full_date_and_saturday_uses_authorized_132_minutes(self):
        row=self.row(day=date(2026,11,23),tara='00:16:00',tara_date=date(2026,11,24));self.apply([row])
        self.assertAlmostEqual(row['tempo_real_horas'],16+4/60)
        row=self.row(day=date(2026,11,21),tara='12:30:00');self.apply([row])
        self.assertAlmostEqual(row['tempo_real_horas'],4.3)

    def test_missing_or_invalid_inputs_are_not_zero_or_infinity(self):
        for change in [{'mortos_transporte_cab':None},{'mortos_transporte_cab':70000},{'data_tara':None},{'horario_tara':'04:00:00'}]:
            row=self.row();row.update(change);self.apply([row]);self.assertIsNone(row['eficiencia'])

    def test_above_100_percent_not_capped(self):
        row=self.row(tara='12:00:00');self.apply([row]);self.assertGreater(row['eficiencia'],1)

    def test_metadata_and_no_mutation_of_unrelated_fields(self):
        row=self.row();row.update(ticket='123',fonte_cabecas='Abate - Total',campo_extra=42)
        result=self.apply([row]);self.assertEqual(row['campo_extra'],42);self.assertEqual(row['ticket'],'123')
        self.assertEqual(result['revisao_formulas'],'eficiencia-capacidade-v2')
        self.assertIn('C3:C4',row['regra_aplicada']['origem_pausas'])

    def test_capacity_does_not_depend_on_realized_birds(self):
        rows=[self.row(heads=60000,ideal=123),self.row(heads=100000,ideal=456)]
        self.apply(rows)
        self.assertEqual(rows[0]['capacidade_nominal_aves'],rows[1]['capacidade_nominal_aves'])
        self.assertAlmostEqual(rows[0]['capacidade_nominal_aves'],71640)

    def test_missing_legacy_ideal_and_zero_net_birds(self):
        row=self.row();row['tempo_ideal_horas']=None;self.apply([row]);self.assertAlmostEqual(row['eficiencia'],65000/71640)
        row=self.row(heads=100,dead=100);result=self.apply([row]);self.assertEqual(row['eficiencia'],0)
        self.assertEqual(result['resumo_semanal'][0]['valores'][0]['eficiencia'],0)

    def test_source_api_integration_and_d_minus_one(self):
        archive=Path(os.environ.get('PCP_API_SOURCE',r'C:\Users\vchaves\Downloads\api_zootecnico(4).zip'))
        if not archive.exists():self.skipTest('ZIP da API necessário para teste de integração local')
        with zipfile.ZipFile(archive) as z:original=z.read('api_zootecnico/pcp_comparativo.py')
        spec=importlib.util.spec_from_file_location('builder',ROOT/'tools/preparar_api_eficiencia.py');builder=importlib.util.module_from_spec(spec);spec.loader.exec_module(builder)
        patched=builder.patch(original)
        names={'empresa','semana','key','numeros','selecionados','horario_tara','calcular_eficiencia'}
        def load(text):
            env={'date':date,'datetime':datetime,'timedelta':timedelta,'defaultdict':defaultdict,'math':math,'HTTPException':RuntimeError,'EMPRESAS':{'10':'Ave Nova','111':'Real Alimentos'},'limite_dados':lambda:date(2026,11,24),'aplicar_formula_capacidade':aplicar_formula_capacidade}
            tree=ast.parse(text);tree.body=[n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name in names]
            exec(compile(tree,'api-conferida','exec'),env);return env['calcular_eficiencia']
        before,after=load(original.decode('utf-8-sig')),load(patched.decode('utf-8'))
        days=[];tickets=[]
        for uid,company in [('10','Ave Nova'),('111','Real Alimentos')]:
            for d in [date(2026,11,20),date(2026,11,21),date(2026,11,25)]:
                for label,quantity in [('Cabeças',110000),('Mortos Transporte (Cab)',1000)]:days.append({'data':d,'empresa':company,'secao':'Abate - Total','descricao':label,'quantidade':quantity})
                tickets.append({'data_abate':d,'empresa':company,'pesagem':'1','dt_tara':d,'hr_tara':'17:00:00'})
        old=before(days,tickets,date(2026,11,20),date(2026,11,25));new=after(days,tickets,date(2026,11,20),date(2026,11,25))
        self.assertEqual(len(new['dias']),4)
        for a,b in zip(old['dias'],new['dias']):
            if b['unidade']=='111':self.assertEqual(a['tempo_ideal_horas'],b['tempo_ideal_horas'])
            else:self.assertEqual(b['tempo_ideal_horas'],109000/10800)
            self.assertEqual(a['ticket'],b['ticket'])
            if b['unidade']=='111':self.assertAlmostEqual(a['eficiencia'],b['eficiencia'])
            else:self.assertAlmostEqual(b['tempo_real_horas'],11-132/60)


if __name__=='__main__':unittest.main(verbosity=2)
