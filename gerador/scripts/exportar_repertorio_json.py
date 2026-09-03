"""Exporta `gerador/repertorio/*.py` para `dados/repertorio.json`.

**Isto é uma ponte temporária, e o JSON commitado é gerado, não fonte.**

As treze músicas são módulos Python — o site é TypeScript e não consegue
importá-las. Este script é o mesmo movimento de `gerar_dados_ts.py` (que
alimenta o port dos emissores), aplicado à outra ponta: em vez de gerar um
módulo TS para os testes, gera um JSON que o servidor lê em tempo de
execução.

`json.dumps` sobre o dict Python garante que o modelo sai caractere por
caractere igual à fonte. Transcrever música à mão é o jeito mais fácil de
furar fidelidade — e neste projeto fidelidade à grafia original é o produto,
não um detalhe.

Quando isto morre
-----------------
Quando o formato `.cifra` estabilizar (ver `docs/achados-importacao.md`),
`gerador/repertorio/` vira `musicas/*.cifra` e o site passa a ler `.cifra`
pelo parser do núcleo. Aí `dados/repertorio.json` e este script somem
juntos. Enquanto isso não acontece, o JSON é a única forma do site enxergar
o repertório.

O que NÃO fazer no meio tempo: editar `dados/repertorio.json` à mão. A fonte
é `gerador/repertorio/*.py`; o JSON é derivado, e
`gerador/tests/test_exportacao_json.py` falha se os dois divergirem.

Uso, a partir da raiz do repositório:

    python gerador/scripts/exportar_repertorio_json.py
"""
import json
import pathlib
import sys

RAIZ = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ))

from gerador import modelo as md  # noqa: E402
from gerador.repertorio import REPERTORIO, CULTOS  # noqa: E402

DESTINO = RAIZ / 'dados' / 'repertorio.json'


def musica_para_json(m):
    """O modelo completo, na mesma forma que `modelo.py` usa internamente.

    `corpo` é uma lista de tuplas `(tipo, conteúdo)` e vira array de 2
    posições — `('labc', ('[Intro]', '| E |'))` -> `["labc", ["[Intro]", "| E |"]]`,
    `('b', None)` -> `["b", null]`. `momento` só aparece quando existe, como
    no Python.
    """
    saida = {
        'titulo': m['titulo'],
        'artista': m['artista'],
        'tom': m['tom'],
        'corpo': m['corpo'],
    }
    if m.get('momento'):
        saida['momento'] = m['momento']
    return saida


def slug_por_identidade(musica_obj):
    """O slug de uma música de `CULTOS`, por identidade de objeto.

    `CULTOS` guarda as próprias músicas, não os slugs — e o site precisa do
    slug pra montar o link. Comparação por `is` de propósito: título repetido
    (medley que entra inteiro e em pedaços) acharia a música errada.
    """
    for slug, m in REPERTORIO.items():
        if m is musica_obj:
            return slug
    raise ValueError(f'música de CULTOS não encontrada em REPERTORIO: {musica_obj.get("titulo")!r}')


def montar():
    """Devolve o documento inteiro, pronto pra serializar.

    Separado de `main` porque o teste de deriva precisa montar sem escrever.
    """
    musicas = {}
    for slug, m in sorted(REPERTORIO.items()):
        md.validar(m)  # barato, e pega erro de modelagem antes de virar dado do site
        musicas[slug] = musica_para_json(m)
    # `cultos` é `[slug, tom]` — a mesma forma de `gerar_dados_ts.py`. É o que
    # o painel de operação lê pra montar a setlist: culto que já foi tocado é
    # dado real, não exemplo inventado na tela.
    cultos = {
        nome: [[slug_por_identidade(m), tom] for m, tom in ordem]
        for nome, ordem in sorted(CULTOS.items())
    }
    return {
        'meta': {
            'gerado_por': 'gerador/scripts/exportar_repertorio_json.py',
            'fonte': 'gerador/repertorio/*.py',
            'nao_editar': 'arquivo derivado — edite a fonte e regenere',
            'provisorio': (
                'ponte até o formato .cifra estabilizar (docs/achados-importacao.md); '
                'depois o site lê .cifra pelo parser e este arquivo some'
            ),
            'musicas': len(musicas),
            'cultos': len(cultos),
        },
        'musicas': musicas,
        'cultos': cultos,
    }


def serializar(documento):
    """JSON determinístico: mesma entrada, mesmos bytes. Sem isso o teste de
    deriva viraria ruído e o diff do commit mentiria sobre o que mudou."""
    return json.dumps(documento, ensure_ascii=False, indent=2) + '\n'


def main():
    texto = serializar(montar())
    DESTINO.parent.mkdir(parents=True, exist_ok=True)
    # newline='\n': o repositório é LF (ver .gitattributes), e no Windows o
    # padrão do Python escreveria CRLF.
    DESTINO.write_text(texto, encoding='utf-8', newline='\n')
    print(f'{len(REPERTORIO)} músicas -> {DESTINO}')


if __name__ == '__main__':
    main()
