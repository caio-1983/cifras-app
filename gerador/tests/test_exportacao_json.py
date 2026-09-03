"""`dados/repertorio.json` é derivado — estes testes impedem que ele minta.

O arquivo é commitado (o site precisa dele em tempo de execução) mas gerado
(a fonte é `gerador/repertorio/*.py`). Arquivo gerado e commitado é
exatamente o tipo de coisa que sai de sincronia em silêncio: alguém edita uma
música, esquece de regenerar, e o site serve a versão antiga sem nenhum erro
aparecer. O teste de deriva é o que fecha essa porta.
"""
import json
import pathlib

import pytest

from gerador.repertorio import REPERTORIO, CULTOS
from gerador.scripts.exportar_repertorio_json import DESTINO, montar, serializar


def carregar():
    return json.loads(DESTINO.read_text(encoding='utf-8'))


def test_json_existe():
    assert DESTINO.exists(), (
        f'{DESTINO} não existe — rode `python gerador/scripts/exportar_repertorio_json.py`'
    )


def test_json_commitado_esta_em_dia_com_o_repertorio():
    """O teste de deriva. Se falhar, a fonte mudou e o JSON não foi regenerado."""
    assert DESTINO.read_text(encoding='utf-8') == serializar(montar()), (
        'dados/repertorio.json está desatualizado em relação a gerador/repertorio/*.py — '
        'rode `python gerador/scripts/exportar_repertorio_json.py` e commite o resultado'
    )


def test_json_tem_as_treze_musicas():
    d = carregar()
    assert sorted(d['musicas']) == sorted(REPERTORIO)
    assert d['meta']['musicas'] == len(REPERTORIO)


def test_json_tem_os_cultos_com_a_ordem_e_o_tom_tocados():
    """A setlist do painel é culto que já foi tocado, não exemplo de tela.

    O que o site precisa é `[slug, tom]` na ORDEM em que foi tocado — ordem e
    tom são o dado; trocar qualquer um dos dois muda o que a banda toca.
    """
    d = carregar()
    assert sorted(d['cultos']) == sorted(CULTOS)
    assert d['meta']['cultos'] == len(CULTOS)

    porta_slug = {id(m): slug for slug, m in REPERTORIO.items()}
    for nome, ordem in CULTOS.items():
        esperado = [[porta_slug[id(m)], tom] for m, tom in ordem]
        assert d['cultos'][nome] == esperado, nome
        # Todo slug de culto tem que abrir: link quebrado no painel é culto
        # que não pode ser executado.
        for slug, _ in esperado:
            assert slug in d['musicas'], f'{nome}: {slug} fora do repertório'


@pytest.mark.parametrize('slug', sorted(REPERTORIO))
def test_corpo_atravessa_o_json_sem_perder_nada(slug):
    """Fidelidade: o corpo que sai do JSON é o mesmo que está no Python.

    JSON não tem tupla — `('b', None)` vira `["b", null]` e volta como lista.
    O que tem que bater é o conteúdo, item a item, incluindo o par
    (rótulo, cifra) do `labc` e os espaços de alinhamento das linhas `pos`,
    que são o dado mais frágil do acervo.
    """
    origem = REPERTORIO[slug]
    exportada = carregar()['musicas'][slug]

    assert exportada['titulo'] == origem['titulo']
    assert exportada['artista'] == origem['artista']
    assert exportada['tom'] == origem['tom']
    assert exportada.get('momento') == origem.get('momento')

    assert len(exportada['corpo']) == len(origem['corpo'])
    for i, (linha_json, (tipo, conteudo)) in enumerate(zip(exportada['corpo'], origem['corpo'])):
        assert linha_json[0] == tipo, f'{slug} linha {i}'
        if tipo == 'labc':
            assert linha_json[1] == list(conteudo), f'{slug} linha {i}'
        else:
            assert linha_json[1] == conteudo, f'{slug} linha {i}'


@pytest.mark.parametrize('slug', sorted(REPERTORIO))
def test_linhas_posicionais_preservam_a_coluna_exata(slug):
    """As linhas `pos` são o dado que um round-trip descuidado estraga.

    Um `.strip()` em qualquer ponto da cadeia tira a indentação e o acorde sai
    de cima da sílaba. Comparação de string crua, sem normalizar nada.
    """
    origem = [c for t, c in REPERTORIO[slug]['corpo'] if t == 'pos']
    exportadas = [c for t, c in carregar()['musicas'][slug]['corpo'] if t == 'pos']
    assert exportadas == origem


def test_arquivo_e_lf_e_termina_com_quebra():
    """O repositório é LF (.gitattributes). No Windows o padrão do Python
    escreveria CRLF, e o teste de deriva passaria a falhar em todo checkout."""
    bruto = DESTINO.read_bytes()
    assert b'\r' not in bruto, 'JSON com CRLF — o exportador precisa de newline="\\n"'
    assert bruto.endswith(b'\n')


def test_exportador_e_deterministico():
    """Mesma entrada, mesmos bytes — senão o diff do commit mente sobre o que mudou."""
    assert serializar(montar()) == serializar(montar())
