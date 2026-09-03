from ..modelo import lab, labc, cif, pos, let, anot, B

# ----------------------------------------------------- ALÉM DO IMPOSSÍVEL (C)
ADI = {
    'titulo': 'ALÉM DO IMPOSSÍVEL',
    'artista': 'Felipe Rodrigues',
    'tom': 'C',
    'corpo': (
        [lab('[Verso 1]'),
         cif('|: Am  /  /  G/B | C :|'),
         let('Eu creio no Deus do impossível'),
         let('Eu creio que tudo podes fazer'),
         let('Eu não viverei pelo que vejo'),
         let('Eu posso ir além com seu poder'), B]
        + [lab('[Pré-refrão]'),
           cif('|: F | G | Am | C :|'),
           let('Em ti, muralhas caem'),
           let('Portas se abrem'),
           let('Eu posso ir além do impossível'),
           let('Em ti não há limites, eu tudo posso'),
           let('O inferno treme ao ouvir a sua voz'), B]
        + [lab('[Refrão]'),
           cif('|: F | G | Am | C/E :|'),
           let('Não temo as ondas da tempestade'),
           let('Sua voz acalma o mar'),
           let('E tira o medo que me assombra'),
           let('Vitorioso és na batalha'),
           let('Não há o que temer, em todo'),
           let('Tempo tu me guardas')]
    ),
}


# ------------------------------------------------------------ EU ME RENDO (B)
EMR_VERSO = [
    lab('[Verso 1]'),
    cif('| B9 | B7M | E7M | % |'),
    let('A Ti eu vou clamar pois tudo'),
    let('vem de ti e tudo está em Ti'),
    cif('| B9 | B7M | E7M | E7M B/D# |'),
    let('Por Ti vou caminhar,'),
    let('tu és a direção o sol a me guiar'),
]

EMR_PONTE = [
    lab('[Ponte]'),
    cif('| C#m7 | F#sus4 F# |'),
    let('Tudo pode passar'),
    cif('| B7M D#m7 | E9 B/D# |'),
    let('Teu amor jamais me deixará'),
    cif('| C#m7 C#m7/B | F# |'),
    let('Sempre há de existir'),
    cif('| B7M D#m7 | E9 | % |'),
    let('Novo amanhã preparado pra mim'),
]

EMR_PONTE2 = [
    lab('[Ponte]'),
    cif('| C#m7 | F#sus4 F# |'),
    let('Tudo pode passar'),
    cif('| B7M D#m7 | E9 B/D# |'),
    let('Teu amor jamais me deixará'),
    cif('| C#m7 C#m7/B | F# |'),
    let('Sempre há de existir'),
    cif('| B7M D#m7 |: E9 | % :|'),
    let('Novo amanhã preparado pra mim'),
    cif('| E9 | F# |'),
    let('preparado pra mim'),
]

EMR_REFRAO = [
    lab('[Refrão]'),
    cif('|: B9 | F# | G#m7 | E9 :|'),
    let('Eu me rendo aos Teus pés'),
    let('és tudo que eu preciso pra viver'),
    let('Eu me lanço em Teus braços'),
    let('onde encontro meu refúgio'),
    cif('| B | D#m7 | E9 | % |'),
    let('Jesus, eis-me aqui!'),
    cif('| G#m7(9) | F#/A# | E9 | % |'),
    let('Jesus, eis-me aqui!'),
]

EMR = {
    'titulo': 'EU ME RENDO',
    'artista': 'Renascer Praise',
    'tom': 'B',
    'corpo': (
        [labc('[Intro]', '|: B9 | B7M | G#m7(9) | % :|'), B]
        + EMR_VERSO + [B]
        + EMR_PONTE + [B]
        + EMR_VERSO + [B]
        + EMR_PONTE2 + [B]
        + EMR_REFRAO + [B]
        + [labc('[Intro]', '| B9 | B7M | G#m7(9) | % |'), B]
        + EMR_VERSO + [B]
        + EMR_PONTE2 + [B]
        + EMR_REFRAO
    ),
}
