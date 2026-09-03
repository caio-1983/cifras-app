from ..modelo import lab, labc, cif, pos, let, anot, B





# --------------------------------------------------------- EXALTAMOS YAHWEH
_verso = [
    pos('E'),
    let('Cantai louvores ao Senhor'),
    pos('                                        B'),
    let('Exultai ao Deus da Salvação'),
    pos('E'),
    let('Ele e não nós que nos formou'),
    pos('                                        B'),
    let('Se prostrem toda tribo e nação'),
]

_refrao = [
    pos('   A'),
    let('Louvores, honras e ações de graças'),
    pos('  B'),
    let('Soberania, Majestade e força'),
    pos('     C#m'),
    let('Ao Deus temível'),
    pos('                                                 B'),
    let('Mais do que os falsos deuses, Yahweh'),
]

_exaltamos = [
    pos('             A'),
    let('Exaltamos Yahweh'),
    pos('             B'),
    let('Exaltamos Yahweh'),
    pos('            C#m'),
    let('Exaltamos Yahweh'),
    pos('             B'),
    let('Exaltamos Yahweh'),
    pos(' A'),
    let('Yahweh'),
    pos('             B'),
    let('Exaltamos Yahweh'),
    pos('            C#m'),
    let('Exaltamos Yahweh'),
]

YAHWEH = {
    'titulo': 'EXALTAMOS YAHWEH',
    'artista': 'FHOP',
    'tom': 'E',
    'corpo': (
        [labc('[Intro]', '| E | % |'), B]
        + [lab('[Verso 1]')] + _verso
        + [pos('           F#m7'), let('Ao Supremo Deus'), B]
        + [lab('[Refrão]')] + _refrao + [B]
        + [labc('[Interlúdio]', '| E |  /  /  Esus4 | E | % |'), B]
        + [lab('[Verso 1]')] + _verso
        + [pos('           F#m7              B'),
           let('Ao Supremo Deus, ao Supremo Deus'), B]
        + [lab('[Refrão] 4x')] + _refrao + [B]
        + _exaltamos
        + [pos('             B'), let('Exaltamos Yahweh'), B]
        + [labc('[Solo]', '| A | % | B | % |'),
           cif('        | C#m | % | B | % |'), B]
        + [lab('[Refrão]'),
           pos('  A                  B'),
           let('Louvores, honras e ações de graças'),
           pos('   C#m           B'),
           let('Soberania, Majestade e força'),
           pos('    A'),
           let('Ao Deus temível'),
           pos('                B             C#m   F#/A#'),
           let('Mais do que os falsos deuses, Yahweh'), B]
        + _exaltamos
        + [pos('             B   E'), let('Exaltamos Yahweh')]
    ),
}


# ----------------------------------------------------------- TUA FORTE MÃO
_prerefrao = [
    lab('[Pré-refrão]'),
    cif('| Bb9 | C |'),
    let('Sei que o meu Redentor vive'),
    cif('| Gm7 | C |'),
    let('Que se levantará'),
    let('Sobre a terra'),
    cif('| Bb9 | C |'),
    let('Tua bondade transbordará'),
    cif('| Gm7 |'),
    let('Meus desertos'),
    cif('| Bb9 | C |'),
    let('Com misericórdia'),
]

_refrao_tfm = [
    lab('[Refrão]'),
    pos('                 F'),
    let('Tua forte mão'),
    pos('                          C9/E'),
    let('Guarda os meus dias'),
    pos('                        Dm7'),
    let('Mesmo sem te ver'),
    pos('                       Bb9'),
    let('Eu pertenço a Ti'),
    pos('                         F/A'),
    let('Teu perdão me cura, Deus'),
    pos('                    C/E'),
    let('Tua cruz me limpa'),
    pos('                             Gm7'),
    let('Eu sei que não mereço'),
    pos('                        Bb9'),
    let('Mas me amas com amor'),
    let('Sem fim'),
]

TFM = {
    'titulo': 'TUA FORTE MÃO',
    'artista': 'O Canto das Igrejas',
    'tom': 'F',
    'corpo': (
        [labc('[Intro]', '| Bb9 | F9 | Dm7 | Csus4 C |'), B]
        + [lab('[Verso 1]'),
           cif('| Bb9 | Gm7 |'),
           let('Se a minha alma teme o amanhã'),
           cif('| Bb9 C | Dm7 |'),
           let('E o coração não vê o Teu cuidado'),
           cif('| Bb9 | Gm7 |'),
           let('Se eu não consigo ouvir a Tua voz'),
           pos('                  Dm7  C4      C'),
           let('Ainda assim confiarei'), B]
        + _prerefrao + [B]
        + _refrao_tfm + [B]
        + [labc('[Interlúdio]', '| Bb9 | F9 | Dm7 | C |'), B]
        + _prerefrao + [B]
        + _refrao_tfm + [B]
        + [labc('[Solo] 4x', '|: Dm7 F9 | Gm7 :|'), B]
        + _refrao_tfm + [B]
        + [labc('[Saída]', '|: Bb9 | F9 | Dm7 | C :|'), B,
           pos('                         Bb9'),
           let('Me amas com amor sem fim')]
    ),
}
