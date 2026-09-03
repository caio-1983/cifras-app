from ..modelo import lab, labc, cif, pos, let, anot, B

_REF = [
    pos('      B              F#'),
    let('Eu serei pai de multidões'),
    pos('     C#m7              E'),
    let('Tocarei em muitas gerações'),
    pos('      B              F#'),
    let('Eu serei pai de multidões'),
    pos('     C#m7              E'),
    let('Tocarei em muitas gerações'),
]

_REF_FIM = _REF[:-2] + [
    pos('     C#m7              E   B'),
    let('Tocarei em muitas gerações'),
]

_VERSO = [
    pos('            B           F#'),
    let('Eu vejo um povo tão distante'),
    pos('       G#m                 E'),
    let('Tão sozinho, buscando salvação'),
    pos('        B         F#'),
    let('Eu vejo órfãos e viúvas'),
    pos('         G#m                 E'),
    let('Filhos pródigos tão longe do Pai'),
]

_PRE = [
    lab('[Pré-refrão]'),
    pos('      F#            G#m'),
    let('Consolar os que choram'),
    pos('      B       F#/A#'),
    let('Libertar os cativos'),
    pos('      C#m7   E'),
    let('Preparar o caminho'),
    pos('      B           F#'),
    let('Anunciar tua salvação'),
]

PDM = {
    'titulo': 'PAI DE MULTIDÕES',
    'artista': 'Fernandinho',
    'tom': 'B',
    'corpo': (
        [lab('[Refrão]')] + _REF + [B]
        + [lab('[Verso 1]')] + _VERSO + [B]
        + _PRE + [B]
        + [lab('[Refrão]')] + _REF + [B]
        + [lab('[Verso 1]')] + _VERSO + [B]
        + _PRE + [B]
        + [lab('[Refrão]')] + _REF + [B]
        + _REF + [B]
        + _REF_FIM
    ),
}
