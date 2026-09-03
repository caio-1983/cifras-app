"""Testes dos emissores.

O teste que mais importa aqui é o da quebra de página: três versões de documento
foram entregues quebradas porque ninguém contou as páginas.
"""
import pytest

from gerador import rtf, html
from gerador.modelo import musica, lab, labc, cif, pos, let, anot, B, validar


def m1():
    return musica('EMAÚS', 'Morada', 'B', momento=None, corpo=[
        labc('[Intro]', '| E G#m | F# B/D# |'), B,
        lab('[Verso 1]'),
        pos('                                  E                      B'),
        let('Quem é esse que vem, nos abraçando'),
        cif('| E | % |'),
        let('Nos constrangendo com o olhar'),
    ])


def m2():
    return musica('QUEBRANTADO', 'Vineyard', 'G', momento='Ofertório', corpo=[
        lab('[Verso 1]'),
        cif('| G | % | D | % |'),
        let('Eu olho para cruz e para cruz eu vou'),
        anot('4ª vez'),
    ])


# ------------------------------------------------------------------- RTF
def test_rtf_uma_quebra_por_musica_menos_a_primeira():
    saida = rtf.documento([(m1(), 'B'), (m2(), 'C'), (m1(), 'G')])
    assert saida.count(r'\page') == 2


def test_rtf_quebra_vai_na_linha_de_momento_e_nao_no_titulo():
    """Se a música tem momento, a quebra tem que ficar ANTES dele — senão o
    'Ofertório' fica órfão no rodapé da página anterior."""
    saida = rtf.documento([(m1(), 'B'), (m2(), 'C')])
    i_quebra = saida.index(r'\page')
    i_momento = saida.index('Ofert')
    i_titulo = saida.index('QUEBRANTADO')
    assert i_quebra < i_momento < i_titulo


def test_rtf_declara_a4_e_margem():
    saida = rtf.documento([(m1(), 'B')])
    assert r'\paperw11906\paperh16838' in saida   # A4
    assert r'\margl1440' in saida                 # 72pt


def test_rtf_e_ascii_puro():
    """Precondição para poder enviar por textContent e conferir byte a byte."""
    saida = rtf.documento([(m1(), 'B'), (m2(), 'C')])
    saida.encode('ascii')
    assert 'EMA\\u218?S' in saida or r'\u' in saida


def test_rtf_preserva_coluna_com_espaco_inquebravel():
    """Espaço comum colapsa no Docs; \\~ não. Sem isso o acorde sai de cima
    da sílaba."""
    saida = rtf.documento([(m1(), 'B')])
    assert r'\~\~' in saida


def test_rtf_escapa_chaves_e_barra():
    mus = musica('T', 'A', 'C', corpo=[let('chave { } e barra \\')])
    saida = rtf.documento([(mus, 'C')])
    assert r'\{' in saida and r'\}' in saida and '\\\\' in saida


def test_rtf_transpoe_o_conteudo():
    """Quebrantado de G para C. Na saída os espaços da linha de cifra já viraram
    `\\~`, então a comparação é contra a forma escapada."""
    saida = rtf.documento([(m2(), 'C')])
    assert r'|\~C\~|\~%\~|\~G\~|\~%\~|' in saida
    assert 'Tom: C' in saida


# ------------------------------------------------------------------ HTML
def test_html_marca_quebra_a_partir_da_segunda():
    saida = html.documento([(m1(), 'B'), (m2(), 'C')])
    assert saida.count('class=pb') == 1


def test_html_preserva_espacos_multiplos():
    saida = html.documento([(m1(), 'B')])
    assert '&nbsp;&nbsp;' in saida


def test_html_escapa_entidades():
    mus = musica('T', 'A', 'C', corpo=[let('a & b < c > d')])
    saida = html.documento([(mus, 'C')])
    assert '&amp;' in saida and '&lt;' in saida and '&gt;' in saida


def test_html_slug():
    assert html.slug('AH, JESUS / CORAÇÃO IGUAL AO TEU') == 'ah-jesus-coracao-igual-ao-teu'


# ------------------------------------------------------------- validação
def test_validar_recusa_secao_so_com_rotulo():
    """Regra do padrão: rótulo sem conteúdo não existe — replicar o bloco."""
    mus = musica('T', 'A', 'C', corpo=[lab('[Refrão]'), lab('[Ponte]'), let('x')])
    with pytest.raises(ValueError, match='só com'):
        validar(mus)


def test_validar_recusa_tom_invalido():
    with pytest.raises(ValueError, match='tom'):
        validar(musica('T', 'A', 'H', corpo=[let('x')]))


def test_validar_recusa_tipo_desconhecido():
    with pytest.raises(ValueError, match='tipo desconhecido'):
        validar({'titulo': 'T', 'artista': 'A', 'tom': 'C',
                 'corpo': [('refrao', 'x')]})


def test_validar_recusa_musica_sem_artista():
    with pytest.raises(ValueError, match='artista'):
        validar({'titulo': 'T', 'artista': '', 'tom': 'C', 'corpo': [let('x')]})
