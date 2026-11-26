"""Gera pacote local da API com patch restrito à eficiência. Não publica."""
from pathlib import Path
import argparse
import ast
import hashlib
import json
import zipfile

ROOT=Path(__file__).resolve().parents[1]
SOURCE_SHA='9c6636dda9b4350dda231f67944fdf7d6efbdc823c624f6055dca4026b680340'
HELPER_SOURCE_SHA='9e80b8f95e8abadcf15b043d3ccceb22fc5c6e82aae7147eb53064b4ec21011a'


def patch(source):
    if hashlib.sha256(source).hexdigest()!=SOURCE_SHA:
        raise ValueError('Versão de origem diferente do ZIP (6) conferido; mesclar antes de empacotar')
    text=source.decode('utf-8-sig')
    function_start=text.index('def calcular_eficiencia(')
    begin=text.index('        if selected:',function_start)
    end=text.index('        days.append(',begin)
    replacement="""        if selected:
            # Mesmo cálculo do helper: somente horas/minutos, com a data completa.
            elapsed=(selected[0].replace(second=0,microsecond=0)-datetime.combine(d,datetime.min.time()).replace(hour=6)).total_seconds()/3600
            actual=elapsed-(132 if uid=='10' else 70)/60
            if actual<=0:actual=None
        if net is not None and net>=0:
            ideal=net/(10800 if uid=='10' else 9500)
"""
    text=text[:begin]+replacement+text[end:]
    old="'RA_velocidade':10000"
    assert text.count(old)==1
    text=text.replace(old,"'RA_velocidade':9500",1)
    old="'semanal':'soma das aves líquidas / soma das capacidades nominais equivalentes dos mesmos dias válidos; velocidade = cabeças / horas'"
    assert text.count(old)==1
    text=text.replace(old,"'semanal':'soma das aves abatidas líquidas / soma das capacidades de abate dos mesmos dias válidos; velocidade da linha informativa = cabeças / horas'",1)
    before=ast.parse(source.decode('utf-8-sig'));after=ast.parse(text)
    def normalized(module):
        for node in ast.walk(module):
            if isinstance(node,ast.FunctionDef) and node.name=='calcular_eficiencia':node.body=[ast.Pass()]
            if isinstance(node,ast.Dict):
                for key,value in zip(node.keys,node.values):
                    if isinstance(key,ast.Constant) and key.value in {'RA_velocidade','semanal'} and isinstance(value,ast.Constant):
                        value.value='PARAMETRO_EFICIENCIA'
        return ast.dump(module,include_attributes=False)
    assert normalized(before)==normalized(after),'Patch alterou código fora da eficiência'
    return text.encode('utf-8')


def build(source_zip,output):
    helper=(ROOT/'backend/eficiencia/pcp_eficiencia_capacidade.py').read_bytes()
    with zipfile.ZipFile(source_zip) as source:
        paths=[n for n in source.namelist() if n.endswith('/pcp_comparativo.py')]
        if len(paths)!=1:raise ValueError('Esperado um único pcp_comparativo.py na raiz da API')
        name=paths[0];helper_name=name.rsplit('/',1)[0]+'/pcp_eficiencia_capacidade.py'
        if helper_name not in source.namelist() or hashlib.sha256(source.read(helper_name)).hexdigest()!=HELPER_SOURCE_SHA:raise ValueError('Módulo de eficiência diferente do ZIP (6) conferido')
        changed=patch(source.read(name));output.parent.mkdir(parents=True,exist_ok=True)
        skipped=[]
        with zipfile.ZipFile(output,'x',zipfile.ZIP_DEFLATED) as target:
            for item in source.infolist():
                if Path(item.filename).name=='.env' or '__pycache__' in Path(item.filename).parts or item.filename.endswith('.pyc'):
                    skipped.append(item.filename);continue
                target.writestr(item,changed if item.filename==name else helper if item.filename==helper_name else source.read(item.filename))
    report={'source':str(source_zip),'source_sha256':hashlib.sha256(Path(source_zip).read_bytes()).hexdigest(),
            'output':str(output),'changed':[name,helper_name],'added':[],'excluded_local_config_or_cache':skipped,
            'database_changed':False,'deployed':False}
    output.with_suffix('.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    return report


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source',required=True,type=Path)
    parser.add_argument('--output',required=True,type=Path)
    args=parser.parse_args()
    print(json.dumps(build(args.source,args.output)))
