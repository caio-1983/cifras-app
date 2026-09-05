r"""Emissor RTF — a saída que funciona no Google Docs.

Por que RTF e não HTML: o importador HTML do Google Docs descarta TODA forma de
quebra de página (classe CSS, style inline no <p>, <div>, <br>, <hr>) e ignora
@page{size:A4} — o documento sai em Letter, com as músicas emendadas. No RTF,
`\page` e o tamanho de papel pertencem ao formato, não ao CSS, e sobrevivem à
conversão. Verificado no PDF exportado pelo próprio Google.

Por que RTF e não .docx: RTF é ASCII puro. Dá para enviar pelo `create_file` com
`textContent` e comparar byte a byte com o original antes de subir. O .docx é
binário e exigiria transcrever base64 — que é exatamente onde a transcrição erra.

Ver docs/achados-google-docs.md para o histórico completo dos testes.
"""
from .transpor import (passos_e_semitons, transpor_compasso, transpor_linha,
                       limpar_letra)
from .modelo import validar

# Índices da tabela de cores declarada no cabeçalho.
ESCURO, AZUL, LARANJA, ROXO = 1, 2, 3, 4

CABECALHO = (
    r'{\rtf1\ansi\ansicpg1252\deff0'
    r'{\fonttbl{\f0\fswiss\fcharset0 Arial;}}'
    r'{\colortbl;'
    r'\red27\green27\blue27;'      # 1 escuro  #1b1b1b  letra
    r'\red0\green0\blue255;'       # 2 azul    #0000ff  rótulo
    r'\red255\green102\blue0;'     # 3 laranja #ff6600  cifra
    r'\red153\green0\blue255;}'    # 4 roxo    #9900ff  anotação
    r'\paperw11906\paperh16838'                  # A4 em twips
    r'\margl1440\margr1440\margt1440\margb1440'  # 72pt = 1440 twips
    '\n'
)

# Entrelinha 1.15 = 1.15 * 240 twips.
PAR = r'\pard\sl276\slmult1\f0'


def esc(t, duro=False):
    r"""Escapa texto para RTF.

    duro=True troca espaço por `\~` (espaço inquebrável). Obrigatório nas linhas
    de cifra: sem isso o Docs colapsa os espaços múltiplos e o alinhamento por
    coluna morre.
    """
    out = []
    for c in t:
        if c in '\\{}':
            out.append('\\' + c)
        elif c == ' ':
            out.append('\\~' if duro else ' ')
        elif ord(c) < 128:
            out.append(c)
        else:
            n = ord(c)
            if n > 0xFFFF:
                # Fora do BMP: RTF exige o par substituto UTF-16, porque \uN
                # é inteiro de 16 bits com sinal. Um escape só estoura a faixa.
                v = n - 0x10000
                for x in (0xD800 + (v >> 10), 0xDC00 + (v & 0x3FF)):
                    out.append(r'\u%d?' % (x - 65536))
            else:
                out.append(r'\u%d?' % (n if n < 32768 else n - 65536))
    return ''.join(out)


def par(texto, cor=ESCURO, tam=12, negrito=False, quebra=False):
    ini = PAR + (r'\page' if quebra else '')
    b0, b1 = (r'\b ', r'\b0') if negrito else ('', '')
    # O espaço após \cfN é delimitador do control word e é consumido pelo
    # parser; por isso o texto começa imediatamente depois dele.
    return f'{ini}\\fs{tam * 2}\\cf{cor} {b0}{texto}{b1}\\par\n'


def escrever(m, tom_destino, quebra_antes=False):
    """Emite uma música transposta para `tom_destino`."""
    validar(m)
    passos, semi = passos_e_semitons(m['tom'], tom_destino)
    out = []
    quebra = quebra_antes

    if m.get('momento'):
        out.append(par(esc(m['momento']), negrito=True, quebra=quebra))
        quebra = False
    out.append(par(esc(m['titulo']), tam=15, negrito=True, quebra=quebra))
    if m.get('artista'):
        out.append(par(esc(m['artista']), tam=15, negrito=True))
    out.append(par(esc(f'Tom: {tom_destino}'), negrito=True))
    out.append(par(''))

    for tipo, txt in m['corpo']:
        if tipo == 'b':
            out.append(par(''))
        elif tipo == 'lab':
            out.append(par(esc(txt), AZUL, negrito=True))
        elif tipo == 'labc':
            rot, ch = txt
            ch = transpor_compasso(ch, passos, semi)
            out.append(PAR + r'\fs24\cf%d \b %s\~\cf%d %s\b0\par' % (
                AZUL, esc(rot), LARANJA, esc(ch, duro=True)) + '\n')
        elif tipo in ('cif', 'pos'):
            fn = transpor_linha if tipo == 'pos' else transpor_compasso
            out.append(par(esc(fn(txt, passos, semi), duro=True),
                           LARANJA, negrito=True))
        elif tipo == 'anot':
            out.append(par(esc(txt), ROXO, negrito=True))
        elif tipo == 'let':
            out.append(par(esc(limpar_letra(txt))))
    return ''.join(out)


def documento(ordem, caminho=None):
    """Monta o RTF de um culto.

    ordem: lista de (musica, tom_destino), na ordem de execução.
    Cada música depois da primeira começa em página nova.
    """
    corpo = ''.join(escrever(m, t, quebra_antes=(i > 0))
                    for i, (m, t) in enumerate(ordem))
    rtf = CABECALHO + corpo + '}\n'
    if caminho:
        with open(caminho, 'w', encoding='ascii') as f:
            f.write(rtf)
    return rtf
