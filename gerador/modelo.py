"""Modelo de uma música: o que os emissores consomem.

Uma música é um dicionário com metadados e um `corpo`, que é uma lista de linhas
tipadas `(tipo, conteúdo)`. Os tipos existem porque cada um tem regra própria de
cor, negrito e — o que mais importa — de transposição.

    'lab'   rótulo de seção: [Refrão], [Verso 1]        azul, negrito
    'labc'  rótulo + cifra na mesma linha               azul + laranja
    'cif'   linha de compasso: | C | Am |               laranja, negrito
    'pos'   linha posicional: acorde sobre a sílaba     laranja, negrito
    'let'   linha de letra                              escuro
    'anot'  anotação de execução: '4ª vez', 'só teclado'  roxo, negrito
    'b'     linha em branco

A diferença entre 'cif' e 'pos' NÃO é cosmética: são algoritmos diferentes de
transposição. 'cif' substitui no lugar, 'pos' reancora por coluna. Classificar
errado destrói o alinhamento — ver transpor.py.
"""

B = ('b', None)


def lab(texto):
    """Rótulo de seção. Ex.: lab('[Refrão] 2x')"""
    return ('lab', texto)


def labc(rotulo, cifra):
    """Rótulo com a cifra na mesma linha. Ex.: labc('[Intro]', '| C | Am |')"""
    return ('labc', (rotulo, cifra))


def cif(texto):
    """Linha de compasso. Ex.: cif('|: F | G | Am | C :|')"""
    return ('cif', texto)


def pos(texto):
    """Linha posicional — acorde alinhado por coluna sobre a sílaba."""
    return ('pos', texto)


def let(texto):
    """Linha de letra."""
    return ('let', texto)


def anot(texto):
    """Anotação de execução, fora do vocabulário de seções."""
    return ('anot', texto)


def musica(titulo, artista, tom, corpo, momento=None):
    """Monta o dicionário de uma música.

    momento: onde ela entra no culto (Ofertório, Apelo / Ceia). Vira uma linha
    discreta acima do título. Só aparece em documento de culto.
    """
    m = {'titulo': titulo, 'artista': artista, 'tom': tom, 'corpo': corpo}
    if momento:
        m['momento'] = momento
    return m


TIPOS_VALIDOS = {'lab', 'labc', 'cif', 'pos', 'let', 'anot', 'b'}


def validar(m):
    """Confere o modelo antes de emitir. Levanta ValueError na primeira falha.

    Barato de rodar e pega os erros que só apareceriam no documento pronto.
    """
    # 'artista' NÃO entra aqui: 90 das 341 músicas do acervo não registram
    # autor no documento de origem. Exigir o campo obrigaria a inventar um
    # nome ou a esconder um quarto da biblioteca. Sem artista, o emissor
    # simplesmente não escreve a linha. Paridade em gerador-ts/modelo.ts.
    for campo in ('titulo', 'tom', 'corpo'):
        if not m.get(campo):
            raise ValueError(f'música sem {campo}: {m.get("titulo", "?")!r}')
    from .transpor import NOTA_RE
    if not NOTA_RE.match(m['tom']):
        raise ValueError(f'tom inválido: {m["tom"]!r}')

    vistos = set()
    for i, item in enumerate(m['corpo']):
        if not isinstance(item, tuple) or len(item) != 2:
            raise ValueError(f'{m["titulo"]}: linha {i} não é (tipo, conteúdo)')
        tipo, txt = item
        if tipo not in TIPOS_VALIDOS:
            raise ValueError(f'{m["titulo"]}: tipo desconhecido {tipo!r} na linha {i}')
        if tipo == 'labc' and (not isinstance(txt, tuple) or len(txt) != 2):
            raise ValueError(f'{m["titulo"]}: labc na linha {i} precisa de (rótulo, cifra)')
        if tipo == 'lab':
            vistos.add(txt)

    # Regra do padrão: seção não pode existir só como rótulo, sem conteúdo.
    for i, (tipo, _) in enumerate(m['corpo'][:-1]):
        if tipo == 'lab':
            prox = m['corpo'][i + 1][0]
            if prox in ('lab', 'b'):
                raise ValueError(
                    f'{m["titulo"]}: seção {m["corpo"][i][1]!r} está só com '
                    f'rótulo, sem conteúdo. O padrão manda replicar o bloco.')
    return m
