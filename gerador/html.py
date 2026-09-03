"""Emissor HTML — para a tela e para impressão pelo navegador.

Este é o emissor que o site vai usar: no navegador, `page-break-before` e
`@page{size:A4}` funcionam normalmente, então o mesmo HTML serve para ler na
tela e para imprimir/gerar PDF com a paginação certa.

ATENÇÃO — não use este emissor para criar Google Docs. O importador do Docs
descarta a quebra de página e ignora @page (o documento sai em Letter, com as
músicas emendadas). Para Google Docs, use rtf.py. Ver docs/achados-google-docs.md.
"""
import re
import unicodedata

from .transpor import (passos_e_semitons, transpor_compasso, transpor_linha,
                       limpar_letra)
from .modelo import validar

CSS = ('@page{size:A4;margin:72pt}body{max-width:451.4pt}'
       'p{margin:0;font-family:Arial,sans-serif;font-size:12pt;'
       'line-height:1.15;color:#1b1b1b}'
       '.h{font-size:15pt}.l{color:#0000ff}.c{color:#ff6600}.a{color:#9900ff}'
       '.pb{page-break-before:always}')

_ESC = {'&': '&amp;', '<': '&lt;', '>': '&gt;'}


def esc(t):
    for k, v in _ESC.items():
        t = t.replace(k, v)
    return t


def duro(t):
    """Preserva espaços múltiplos e iniciais — o alinhamento por coluna depende
    disso, porque HTML colapsa espaços em branco por padrão."""
    t = esc(t)
    if t.startswith(' '):
        n = len(t) - len(t.lstrip(' '))
        t = '&nbsp;' * n + t[n:]
    return re.sub(r'  +', lambda m: '&nbsp;' * len(m.group()), t)


def escrever(m, tom_destino, quebra_antes=False):
    validar(m)
    passos, semi = passos_e_semitons(m['tom'], tom_destino)
    p = []
    cls = ' class=pb' if quebra_antes else ''

    if m.get('momento'):
        p.append(f'<p{cls}><b>{esc(m["momento"])}</b></p>')
        cls = ''
    p.append(f'<p{cls}><b><span class=h>{esc(m["titulo"])}</span></b></p>')
    p.append(f'<p><b><span class=h>{esc(m["artista"])}</span></b></p>')
    p.append(f'<p><b>Tom: {tom_destino}</b></p>')
    p.append('<p>&nbsp;</p>')

    for tipo, txt in m['corpo']:
        if tipo == 'b':
            p.append('<p>&nbsp;</p>')
        elif tipo == 'lab':
            p.append(f'<p><b><span class=l>{esc(txt)}</span></b></p>')
        elif tipo == 'labc':
            rot, ch = txt
            ch = transpor_compasso(ch, passos, semi)
            p.append(f'<p><b><span class=l>{esc(rot)} </span></b>'
                     f'<b><span class=c>{duro(ch)}</span></b></p>')
        elif tipo in ('cif', 'pos'):
            fn = transpor_linha if tipo == 'pos' else transpor_compasso
            p.append(f'<p><b><span class=c>'
                     f'{duro(fn(txt, passos, semi))}</span></b></p>')
        elif tipo == 'anot':
            p.append(f'<p><b><span class=a>{duro(txt)}</span></b></p>')
        elif tipo == 'let':
            p.append(f'<p>{esc(limpar_letra(txt))}</p>')
    return ''.join(p)


def documento(ordem, titulo='Cifras'):
    """Página completa. ordem: lista de (musica, tom_destino)."""
    blocos = ''.join(escrever(m, t, quebra_antes=(i > 0))
                     for i, (m, t) in enumerate(ordem))
    return ('<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8">'
            f'<title>{esc(titulo)}</title><style>{CSS}</style></head>'
            f'<body>{blocos}</body></html>')


def slug(t):
    """Nome de arquivo/URL a partir de um título."""
    t = unicodedata.normalize('NFKD', t).encode('ascii', 'ignore').decode()
    return re.sub(r'[^a-z0-9]+', '-', t.lower()).strip('-')
