"""Testes do núcleo de transposição.

Vários destes vêm de bug real: cada um marcado com o culto em que apareceu.
"""
import pytest

from gerador.transpor import (passos_e_semitons, transpor_nota, transpor_acorde,
                              transpor_compasso, transpor_linha, limpar_letra)


def tp(origem, destino, tok):
    p, s = passos_e_semitons(origem, destino)
    return transpor_acorde(tok, p, s)


# ------------------------------------------------------------ grafia enarmônica
@pytest.mark.parametrize('origem,destino,entrada,esperado', [
    # Eu Me Rendo, culto de 28/08: B -> G, a música inteira em campo natural.
    ('B', 'G', 'B7M', 'G7M'),
    ('B', 'G', 'C#m7', 'Am7'),
    ('B', 'G', 'D#m7', 'Bm7'),
    ('B', 'G', 'G#m7(9)', 'Em7(9)'),
    ('B', 'G', 'F#sus4', 'Dsus4'),
    ('B', 'G', 'E9', 'C9'),
    # Quebrantado, culto de 06/09: G -> C.
    ('G', 'C', 'Em', 'Am'),
    ('G', 'C', 'D', 'G'),
    # Tom com bemol: o quarto grau de Ab é Db, nunca C#.
    ('C', 'Ab', 'F', 'Db'),
    ('C', 'Ab', 'C', 'Ab'),
    # Tom com sustenido: a sensível de D é C#, nunca Db.
    ('C', 'D', 'B', 'C#'),
])
def test_grafia(origem, destino, entrada, esperado):
    assert tp(origem, destino, entrada) == esperado


def test_nao_produz_grafia_absurda():
    """A estratégia ingênua (pitch class + tabela fixa de grafia) produzia C/Fb
    ao levar Ao Único de C para Ab. Aqui o baixo sai Eb/G, certo.

    Cb e Fb NÃO são banidos: a escala de Gb maior contém Cb de verdade
    (Gb Ab Bb Cb Db Eb F), então F7M em C vira Cb7M em Gb e está correto. O que
    nunca pode aparecer é acidente duplo, e a letra tem que ser sempre a de
    origem deslocada pelos passos do intervalo.
    """
    assert tp('C', 'Ab', 'G/B') == 'Eb/G'
    assert tp('C', 'Gb', 'F7M') == 'Cb7M'

    from gerador.transpor import LETRAS
    for tom in ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']:
        passos, _ = passos_e_semitons('C', tom)
        for acorde in ['C', 'Dm7', 'Em7', 'F7M', 'Am7', 'Bm7(5-)']:
            r = tp('C', tom, acorde)
            assert '##' not in r and 'bb' not in r, (tom, acorde, r)
            esperada = LETRAS[(LETRAS.index(acorde[0]) + passos) % 7]
            assert r[0] == esperada, (tom, acorde, r, esperada)


# --------------------------------------------------------- notação brasileira
@pytest.mark.parametrize('entrada,esperado', [
    ('F7+', 'G7+'),       # 7+ é maj7
    ('F7M', 'G7M'),       # 7M é o mesmo maj7, outra escrita — ambos no acervo
    ('Eb4', 'F4'),        # 4 é sus4
    ('Bb9', 'C9'),        # 9 é add9
    ('F#m7(5-)', 'G#m7(5-)'),   # meia-diminuta
    ('Gm7(11)', 'Am7(11)'),
    ('Csus4', 'Dsus4'),
])
def test_sufixo_preservado(entrada, esperado):
    assert tp('C', 'D', entrada) == esperado


def test_baixo_invertido_transpoe_os_dois_lados():
    assert tp('B', 'G', 'F#/A#') == 'D/F#'
    assert tp('B', 'G', 'B/D#') == 'G/B'
    assert tp('B', 'G', 'C#m7/B') == 'Am7/G'


@pytest.mark.parametrize('tok', ['|', '|:', ':|', '%', '/'])
def test_estrutura_passa_intacta(tok):
    assert tp('C', 'Ab', tok) == tok


# --------------------------------------------------------------- linhas
def test_compasso_preserva_espacamento():
    """Bug do culto de 30/08: aplicar o algoritmo posicional numa linha de
    compasso gerava '| F9  |' com espaço dobrado, porque F9 é mais estreito
    que Bb9. Linha de compasso substitui no lugar."""
    p, s = passos_e_semitons('Bb', 'F')
    assert transpor_compasso('| Bb9 | C |', p, s) == '| F9 | G |'
    assert transpor_compasso('|: Dm7 F9 | Gm7 :|', p, s) == '|: Am7 C9 | Dm7 :|'


def test_posicional_preserva_coluna():
    """O acorde tem que continuar sobre a mesma sílaba mesmo mudando de largura."""
    p, s = passos_e_semitons('C', 'D')
    linha = '     Em7          C'
    out = transpor_linha(linha, p, s)
    assert out.index('F#m7') == 5
    assert out.index('D', 6) == 18


def test_posicional_nao_sobrepoe_acordes_vizinhos():
    p, s = passos_e_semitons('C', 'B')
    out = transpor_linha('C  G', p, s)
    assert out == 'B  F#'
    assert '  ' in out or ' ' in out


def test_posicional_linha_vazia():
    assert transpor_linha('', 0, 0) == ''
    assert transpor_linha('     ', 0, 0) == '     '


# --------------------------------------------------------------- identidade
def test_mesmo_tom_nao_muda_nada():
    p, s = passos_e_semitons('F', 'F')
    assert (p, s) == (0, 0)
    linha = '  Bb9   /   Gm7  |  F/A  '
    assert transpor_compasso(linha, p, s) == linha


def test_volta_ao_original():
    """Ida e volta tem que devolver a grafia de origem."""
    for destino in ['D', 'Eb', 'G', 'Ab', 'B']:
        ida = tp('C', destino, 'Am7')
        p, s = passos_e_semitons(destino, 'C')
        assert transpor_acorde(ida, p, s) == 'Am7'


# --------------------------------------------------------------- melisma
@pytest.mark.parametrize('entrada,esperado', [
    ('cora_ção', 'coração'),
    ('San__to', 'Santo'),
    ('Coroa__mos', 'Coroamos'),
    ('estreme__ça', 'estremeça'),
    ('sem sublinhado', 'sem sublinhado'),
])
def test_limpar_letra(entrada, esperado):
    assert limpar_letra(entrada) == esperado


# --------------------------------------------------------------- erro
def test_tom_invalido():
    with pytest.raises(ValueError):
        passos_e_semitons('H', 'C')
