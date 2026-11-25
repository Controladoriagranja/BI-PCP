# Eficiência por capacidade

Este módulo deve ficar na mesma pasta de `pcp_comparativo.py` na API em execução.
Não substitui o backend principal deste repositório e não é instalado pelo GitHub Pages.

Ver [regras, fontes, testes e instalação no Portainer](../../docs/EFICIENCIA_CAPACIDADE.md).

Para gerar um pacote local a partir do ZIP conferido:

    python -B tools/preparar_api_eficiencia.py --source CAMINHO_DO_ZIP_ATUAL --output outputs/api-eficiencia.zip

O gerador recusa versões de API diferentes da conferida e não publica nada.
Preservar as configurações externas e os demais arquivos da API em produção.
