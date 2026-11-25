"""Gera pacote local da API com patch restrito à eficiência. Não publica."""
from pathlib import Path
import argparse
import ast
import hashlib
import json
import zipfile

ROOT=Path(__file__).resolve().parents[1]
SOURCE_SHA='a5c31e6841d4f9818414f722bd74667b12ea23bfb608ca5bcc94c9a9e86aff39'


def patch(source):
    if hashlib.sha256(source).hexdigest()!=SOURCE_SHA:
        raise ValueError('Versão da API diferente da conferida. Não substituir: revisar a função atual antes de aplicar.')
    text=source.decode('utf-8-sig')
    tree=ast.parse(text)
    function=next(n for n in tree.body if isinstance(n,ast.FunctionDef) and n.name=='calcular_eficiencia')
    returns=[n for n in function.body if isinstance(n,ast.Return)]
    assert len(returns)==1
    expression=ast.get_source_segment(text,returns[0].value)
    assert [k.value for k in returns[0].value.keys]==['dias','resumo_semanal','semanas']
    text=text.replace('return '+expression,'return aplicar_formula_capacidade('+expression+')',1)
    text=text.replace('def calcular_eficiencia(', 'from pcp_eficiencia_capacidade import aplicar_formula_capacidade\n\ndef calcular_eficiencia(',1)
    old="'semanal':'soma dos tempos ideais / soma dos tempos reais dos mesmos dias válidos; velocidade = cabeças / horas'"
    assert text.count(old)==1
    text=text.replace(old,"'semanal':'soma das aves líquidas / soma das capacidades nominais equivalentes dos mesmos dias válidos; velocidade = cabeças / horas'",1)
    old_speed_1="elif d.weekday()==5:ideal=net/10800"
    old_speed_2="elif d.weekday()<5:ideal=min(net,61000)/10800+max(net-61000,0)/9500"
    assert text.count(old_speed_1)==1 and text.count(old_speed_2)==1
    text=text.replace(old_speed_1,"else:ideal=net/10800",1).replace(old_speed_2,"",1)
    text=text.replace("'AN_limite_turno_1':61000", "'AN_limite_turno_1':None",1)
    text=text.replace("'AN_velocidade_turno_2':9500", "'AN_velocidade_turno_2':10800",1)
    ast.parse(text)
    # Todos os demais endpoints e funções devem permanecer idênticos na AST.
    before=ast.parse(source.decode('utf-8-sig'));after=ast.parse(text)
    def normalized(module):
        module.body=[n for n in module.body if not isinstance(n,ast.ImportFrom) or n.module!='pcp_eficiencia_capacidade']
        for node in ast.walk(module):
            if isinstance(node,ast.FunctionDef) and node.name=='calcular_eficiencia':node.body=[ast.Pass()]
            if isinstance(node,ast.Dict):
                for key,value in zip(node.keys,node.values):
                    if isinstance(key,ast.Constant) and key.value in {'AN_limite_turno_1','AN_velocidade_turno_2'} and isinstance(value,ast.Constant):value.value='PARAMETRO_EFICIENCIA'
                    if isinstance(key,ast.Constant) and key.value=='semanal' and isinstance(value,ast.Constant) and ('soma dos tempos ideais' in str(value.value) or 'soma das aves líquidas' in str(value.value)):value.value='FORMULA_EFICIENCIA'
        return ast.dump(module,include_attributes=False)
    assert normalized(before)==normalized(after),'Patch alterou código fora da eficiência'
    return text.encode('utf-8')


def build(source_zip,output):
    helper=(ROOT/'backend/eficiencia/pcp_eficiencia_capacidade.py').read_bytes()
    with zipfile.ZipFile(source_zip) as source:
        paths=[n for n in source.namelist() if n.endswith('/pcp_comparativo.py')]
        if len(paths)!=1:raise ValueError('Esperado um único pcp_comparativo.py na raiz da API')
        name=paths[0];helper_name=name.rsplit('/',1)[0]+'/pcp_eficiencia_capacidade.py'
        if helper_name in source.namelist():raise ValueError('A API já contém o módulo; revisar a versão atual')
        changed=patch(source.read(name));output.parent.mkdir(parents=True,exist_ok=True)
        skipped=[]
        with zipfile.ZipFile(output,'x',zipfile.ZIP_DEFLATED) as target:
            for item in source.infolist():
                if Path(item.filename).name=='.env' or '__pycache__' in Path(item.filename).parts or item.filename.endswith('.pyc'):
                    skipped.append(item.filename);continue
                target.writestr(item,changed if item.filename==name else source.read(item.filename))
            target.writestr(helper_name,helper)
    report={'source':str(source_zip),'source_sha256':hashlib.sha256(Path(source_zip).read_bytes()).hexdigest(),
            'output':str(output),'changed':[name],'added':[helper_name],'excluded_local_config_or_cache':skipped,
            'database_changed':False,'deployed':False}
    output.with_suffix('.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
    return report


if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source',required=True,type=Path)
    parser.add_argument('--output',required=True,type=Path)
    args=parser.parse_args()
    print(json.dumps(build(args.source,args.output)))
