"""Teste cruzado: o transpositor do gerador contra as fixtures da Fase 0.

O gerador e o núcleo da Fase 0 foram escritos em paralelo e cada um tem seu
transpositor. Antes de escolher qual fica, os dois precisam ser confrontados com
as provas do outro. Este arquivo faz metade do trabalho: roda `gerador/transpor.py`
contra `tests/esperado/`, que são transposições conferidas à mão pelo Caio.

A outra metade — rodar o núcleo da Fase 0 contra os 83 testes do gerador — só
pode ser feita com o código da Fase 0 em mãos.

O leitor de `.cifra` aqui é deliberadamente mínimo: serve para este teste, não
substitui o parser da Fase 0.
"""
import pathlib

import pytest

from gerador.transpor import (passos_e_semitons, transpor_compasso,
                              transpor_linha)

RAIZ = pathlib.Path(__file__).resolve().parents[2]

#: (arquivo de origem, arquivo esperado). São as fixtures da Fase 0.
CASOS = [
    ('o-grande-eu-sou', 'o-grande-eu-sou_D'),
    ('o-grande-eu-sou', 'o-grande-eu-sou_G'),
    ('ao-unico', 'ao-unico_Ab'),
    ('ao-unico', 'ao-unico_Bb'),
    ('digno-de-tudo', 'digno-de-tudo_C'),
]


def ler(caminho):
    """Devolve (cabeçalho, linhas do corpo)."""
    txt = pathlib.Path(caminho).read_text(encoding='utf-8')
    cab, _, corpo = txt.partition('\n---\n')
    meta = {}
    for linha in cab.strip().split('\n'):
        k, _, v = linha.partition(':')
        meta[k.strip()] = v.strip()
    return meta, corpo.rstrip('\n').split('\n')


def transpor_corpo(linhas, passos, semi):
    """Classifica cada linha e aplica o algoritmo certo.

    Os dois tipos de linha de cifra exigem tratamento diferente, e é justamente
    aqui que a primeira versão deste teste errou: linha `~` não tem barra, então
    a heurística "contém |" a deixava passar intacta.
    """
    out = []
    for linha in linhas:
        if linha.startswith('~'):
            # Posicional: acorde sobre a sílaba, coluna tem que ser preservada.
            out.append('~' + transpor_linha(linha[1:], passos, semi))
        elif linha.lstrip().startswith('[') and '|' in linha:
            # `[Rótulo] | cifra |` — só a parte depois do rótulo é transposta.
            fecha = linha.index(']') + 1
            out.append(linha[:fecha]
                       + transpor_compasso(linha[fecha:], passos, semi))
        elif '|' in linha:
            out.append(transpor_compasso(linha, passos, semi))
        else:
            out.append(linha)
    return out


@pytest.mark.parametrize('origem,esperado', CASOS)
def test_reproduz_fixture_da_fase0(origem, esperado):
    meta_o, corpo_o = ler(RAIZ / 'musicas' / f'{origem}.cifra')
    meta_e, corpo_e = ler(RAIZ / 'tests' / 'esperado' / f'{esperado}.cifra')

    passos, semi = passos_e_semitons(meta_o['tom'], meta_e['tom'])
    obtido = transpor_corpo(corpo_o, passos, semi)

    assert len(obtido) == len(corpo_e), (
        f'{esperado}: {len(obtido)} linhas contra {len(corpo_e)} esperadas')

    divergencias = [(i + 1, a, b) for i, (a, b) in enumerate(zip(obtido, corpo_e))
                    if a != b]
    assert not divergencias, '\n'.join(
        f'  linha {n}\n    obtido:   {a!r}\n    esperado: {b!r}'
        for n, a, b in divergencias[:10])


@pytest.mark.parametrize('origem,esperado', CASOS)
def test_cabecalho_da_fixture_bate(origem, esperado):
    """O tom de destino do nome do arquivo tem que ser o do cabeçalho."""
    meta_e, _ = ler(RAIZ / 'tests' / 'esperado' / f'{esperado}.cifra')
    assert esperado.endswith('_' + meta_e['tom'])
