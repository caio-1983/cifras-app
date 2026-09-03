"""Gerador de cifras e documentos de culto.

Validado em produção: os cultos de 23/08, 28/08, 30/08 e 06/09 de 2026 saíram
daqui e foram tocados.

Uso típico:

    from gerador import modelo as md
    from gerador import rtf, html

    musica = md.musica('EMAÚS', 'Morada', 'B', corpo=[...])
    rtf.documento([(musica, 'G')], 'culto.rtf')     # -> Google Docs
    html.documento([(musica, 'G')])                 # -> tela e impressão

Para Google Docs use rtf; para o site use html. O porquê está em rtf.py.
"""
from . import modelo, transpor, rtf, html  # noqa: F401

__all__ = ['modelo', 'transpor', 'rtf', 'html']
