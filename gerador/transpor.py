"""Transposição por intervalo, preservando a letra da nota.

Transpor NÃO é somar semitons. Somar semitons e escolher a grafia por uma tabela
fixa produz erro em tom com bemol: Ab -> quarto grau vira C# em vez de Db, e
casos piores como C/Fb.

O algoritmo aqui é: calcular o intervalo entre tom de origem e destino como
(passos de letra, semitons); mover a letra pelos passos; acertar o acidente pelos
semitons. A letra é preservada por construção, então a grafia sai certa sozinha,
sem tabela de exceção.

    B -> G  =  5 passos de letra, 8 semitons
    C#m7 -> letra C+5 = A;  (0+1+8)%12 = 9 = A;  acidente 0  ->  Am7
    F#/A# -> D/F#   (as duas metades transpostas separadamente)
"""
import re

LETRAS = ['C', 'D', 'E', 'F', 'G', 'A', 'B']
PC = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
ACID = {'': 0, '#': 1, 'b': -1, '##': 2, 'bb': -2}
INV = {0: '', 1: '#', -1: 'b', 2: '##', -2: 'bb'}

NOTA_RE = re.compile(r'^([A-G])(#{1,2}|b{1,2})?(.*)$')

#: Literais de estrutura que atravessam a transposição intactos.
#: `|` barra de compasso, `|:` `:|` repetição, `%` repete o compasso anterior,
#: `/` sustenta o acorde por mais um tempo.
ESTRUTURA = ('|', '|:', ':|', '%', '/')


def passos_e_semitons(origem, destino):
    """Intervalo entre dois tons, como (passos de letra, semitons)."""
    mo, md = NOTA_RE.match(origem), NOTA_RE.match(destino)
    if not mo or not md:
        raise ValueError(f'tom inválido: {origem!r} -> {destino!r}')
    lo, ao = mo.group(1), mo.group(2) or ''
    ld, ad = md.group(1), md.group(2) or ''
    passos = (LETRAS.index(ld) - LETRAS.index(lo)) % 7
    semi = ((PC[ld] + ACID[ad]) - (PC[lo] + ACID[ao])) % 12
    return passos, semi


def transpor_nota(nota, passos, semi):
    m = NOTA_RE.match(nota)
    letra, acid = m.group(1), m.group(2) or ''
    nova_letra = LETRAS[(LETRAS.index(letra) + passos) % 7]
    alvo = (PC[letra] + ACID[acid] + semi) % 12
    delta = (alvo - PC[nova_letra]) % 12
    if delta > 6:
        delta -= 12
    if delta not in INV:
        raise ValueError(
            f'acidente impossível ao transpor {nota!r}: precisaria de {delta} '
            f'alterações sobre {nova_letra}. Provável tom de destino absurdo.')
    return nova_letra + INV[delta]


def transpor_acorde(tok, passos, semi):
    """Transpõe um token. Estrutura e texto não-acorde passam intactos.

    Cobre a notação brasileira inteira porque o sufixo nunca é interpretado:
    7+, 7M, 4, 9, (5-), (11), sus4, º — tudo é preservado como veio.
    """
    if tok in ESTRUTURA or not NOTA_RE.match(tok):
        return tok
    if '/' in tok:                       # baixo invertido: transpõe os dois lados
        cima, baixo = tok.split('/', 1)
        return (transpor_acorde(cima, passos, semi) + '/'
                + transpor_acorde(baixo, passos, semi))
    m = NOTA_RE.match(tok)
    return transpor_nota(m.group(1) + (m.group(2) or ''), passos, semi) + m.group(3)


def transpor_compasso(linha, passos, semi):
    """Linha de compasso (`| C | Am |`): troca cada token no lugar.

    Substituição in-place, então o espaçamento original é preservado — inclusive
    quando o nome do acorde muda de largura. Não usar em linha posicional.
    """
    return re.sub(r'\S+', lambda m: transpor_acorde(m.group(), passos, semi), linha)


def transpor_linha(linha, passos, semi):
    """Linha posicional (acorde sobre a sílaba): preserva a COLUNA de cada token.

    `Em7` vira `F#m7` e fica um caractere mais largo. Sem recalcular, tudo à
    direita anda e o acorde sai de cima da sílaba. Aqui cada token é reancorado
    na coluna que ocupava; quando dois acordes ficariam colados, entra um espaço
    de separação em vez de sobrepor.
    """
    itens = [(m.start(), m.group()) for m in re.finditer(r'\S+', linha)]
    if not itens:
        return linha
    out = ''
    for col, tok in itens:
        novo = transpor_acorde(tok, passos, semi)
        if len(out) < col:
            out += ' ' * (col - len(out))
        elif out:
            out += ' '
        out += novo
    return out


def limpar_letra(t):
    """Tira o sublinhado de melisma: 'cora_ção' -> 'coração', 'San__to' -> 'Santo'.

    Cuidado: em linha posicional o '_' às vezes segurava a coluna do acorde
    seguinte. Ao limpar, conferir o alinhamento dessas linhas.
    """
    return t.replace('_', '')
