from ..modelo import lab, labc, cif, pos, let, anot, B

"""Culto de 06/09/2026. Cinco músicas, com marcação de momento."""



# ============================================================ VITORIOSO ÉS (G)
# Fonte: Vitorioso És_G_Fem. O arquivo original é medley com COM MUITO LOUVOR;
# aqui entra só Vitorioso És, como pedido na setlist.
VE_REFRAO = [
    lab('[Refrão]'),
    pos('Em              C'),
    let('    Vitorioso és'),
    pos('                          G'),
    let('Na tempestade estás'),
    pos('         D                 Em'),
    let('Teu nome infalível é'),
    pos('                             C'),
    let('Os reinos vêm e vão'),
    pos('                    G'),
    let('Teu trono acima está'),
    pos('         D                    C'),
    let('Teu nome imutável é'),
]

VE_PONTE = [
    lab('[Ponte] 2x'),
    cif('| C | D | Em | G/B |'),
    let('Como um trovão impetuoso,'),
    let('Poderoso és, grandioso és'),
    let('Que venha o céu, nós proclamamos'),
    let('Poderoso és, grandioso és'),
]

VITORIOSO = {
    'titulo': 'VITORIOSO ÉS',
    'artista': 'Gabriel Guedes',
    'tom': 'G',
    'corpo': (
        [lab('[Verso 1]'),
         pos(' G'),
         let('Lutamos com armas de fé'),
         pos('  Em'),
         let('E nada irá resistir'),
         pos('                       C'),
         let('Enquanto adoramos'),
         pos('          Em                      D/F#'),
         let('Em meio às tribulações'),
         pos('       G'),
         let('O nosso Deus é vencedor'),
         pos('                  | C | Am |'),
         let('Nós o adoramos'), B]
        + VE_REFRAO + [B]
        + [lab('[Verso 2]'),
           pos('    G'),
           let('O inferno não prevaleceu'),
           pos(' Em'),
           let('E nada irá me impedir'),
           pos('                 C'),
           let('Eu te adorarei'),
           pos(' Em                                    D/F#'),
           let('Muralhas vão estremecer'),
           pos(' G'),
           let('Cadeias irão se romper'),
           pos('                         | C | Am |'),
           let('Enquanto adoramos'), B]
        + VE_REFRAO + [B]
        + [labc('[Interlúdio]', '| C | D | Em | G/B |'), B]
        + VE_PONTE + [B]
        + VE_REFRAO + [B]
        + VE_PONTE + [B]
        + [labc('[Fim]', '| G | Em | Am | D |')]
    ),
}


# ========================================================= EU VOU CONSTRUIR (C)
EVC_VERSO2 = [
    lab('[Verso 2]'),
    cif('|: C | F :|'),
    let('Nome que é sobre todos é o Teu, Jesus'),
    let('Fonte da salvação só Tu és, Jesus'),
    let('Digno da minha vida Tu és, Jesus'),
    cif('| C/E | F |'),
    let('Oh, eu sou Teu, eu sou Teu'),
]

EVC_REFRAO2 = [
    lab('[Refrão] 2x'),
    cif('| F | Dm | C | Am G |'),
    let('Santo és incomparável'),
    let('És inigualável'),
    let('Abre os meus olhos, Senhor'),
    cif('| F | Dm | C/G | Am G |'),
    let('Mostra quem Tu és e enche o meu coração'),
    let('Do amor que faz mudar o mundo'),
]

EVC_PONTE = [
    cif('| F | G | Am | Em |'),
    let('Eu vou construir minha vida em Ti'),
    let('Tu és meu fundamento'),
    let('Eu vou confiar somente em Ti'),
    let('Não vou ser abalado'),
]

CONSTRUIR = {
    'titulo': 'EU VOU CONSTRUIR',
    'artista': 'Nívea Soares',
    'tom': 'C',
    'corpo': (
        [labc('[Intro]', '|: C | F :|'), B]
        + [lab('[Verso 1]'),
           cif('|: C | F :|'),
           let('Digno desta canção só Tu és, Senhor'),
           let('Digno do meu louvor só Tu és, Senhor'),
           let('Digno da minha vida Tu és, Senhor'),
           cif('| C/E | F |'),
           let('Oh, eu sou Teu, eu sou Teu'), B]
        + EVC_VERSO2 + [B]
        + [lab('[Refrão]'),
           cif('| F | Dm | C | Am |'),
           let('Santo és incomparável'),
           let('És inigualável'),
           let('Abre os meus olhos, Senhor'),
           cif('| F | Dm | C/E C | Am G | F | Dm |'),
           let('Mostra quem Tu és e enche o meu coração'),
           let('Do amor que faz mudar o mundo'), B]
        + EVC_VERSO2 + [B]
        + EVC_REFRAO2 + [B]
        + [labc('[Interlúdio]', '| F | G | Am | Em |'), B]
        + [lab('[Ponte] 2x')] + EVC_PONTE + [B]
        + EVC_REFRAO2 + [B]
        + [lab('[Ponte]')] + EVC_PONTE + [B]
        + [labc('[Fim]', '| F |')]
    ),
}


# =============================================================== TEU TOQUE (Bb)
TT_PRE = [
    lab('[Pré-refrão]'),
    cif('| Eb | Gm7 | Bb | F |'),
    let('Deus, meu coração quer mais de Ti'),
    let('Faz algo novo em mim'),
    let('E eu me entrego a Ti'),
]

TT_REFRAO = [
    lab('[Refrão]'),
    cif('|: Eb | F | Gm7 | Bb/D |'),
    let('Meu prazer é viver em Teu amor,'),
    let('me envolver em Ti Senhor'),
    let('Meu desejo é Te conhecer'),
    let('Jesus, abro a Ti meu coração e os meus medos fugirão'),
    let('O Teu toque é tudo o que eu quero'),
]

TT_CORO = [
    lab('[Coro]'),
    cif('| Eb |  F |  Gm7 | Bb/D |'),
    let('Ô, ô, ô, ô'),
]

TEU_TOQUE = {
    'titulo': 'TEU TOQUE',
    'artista': 'Gabi Sampaio',
    'tom': 'Bb',
    'corpo': (
        [labc('[Intro]', 'Eb  F  Gm7  Bb/D'), anot('só teclado'), B]
        + [lab('[Verso 1]'),
           cif('|: Eb | Gm7 | Bb | F :|'),
           let('Como eu amo os momentos'),
           let('que eu passo contigo'),
           let('Onde encontro a paz que a tua palavra me traz'),
           let('Para Ti estou atento, permaneço ouvindo'),
           let('Aqui quero estar'), B]
        + [anot('entra a banda')] + TT_PRE + [B]
        + TT_REFRAO + [B]
        + TT_CORO + [B]
        + [lab('[Verso 2]'),
           cif('| Eb | Gm7 | Bb | F |'),
           let('És o fogo do dia'),
           let('E da noite a brisa'),
           let('O sopro em meu ser, o que me faz viver'),
           let('Não há dúvida alguma do amor que revelas'),
           let('mais doce afeição'), B]
        + TT_PRE + [B]
        + TT_REFRAO + [B]
        + TT_CORO + [B]
        + [lab('[Ponte] 3x'),
           pos('                          Eb        F  Eb'),
           let('Eu abro o coração a Ti'),
           pos('                          Gm7       Bb/D'),
           let('Eu abro o coração hoje aqui'),
           pos('                                   Eb        F  Eb'),
           let('Toca em mim com o Teu poder'),
           pos('                          Gm7            Bb/D'),
           let('Faz em mim Senhor, Teu querer'), B]
        + TT_REFRAO + [B]
        + [lab('[Coro] 2x'), cif('| Eb |  F |  Gm7 | Bb/D |'), B]
        + [lab('[Ponte] 2x'),
           anot('vocal: sol lá sib sol'),
           pos('                          Eb        (Gm)  F'),
           let('Eu abro o coração a Ti'),
           pos('                          Gm7       Bb/D'),
           let('Eu abro o coração hoje aqui'),
           anot('vocal: sol lá sib sol'),
           pos('                                   Eb        (Gm)  F'),
           let('Toca em mim com o Teu poder'),
           pos('                          Gm7            Bb/D'),
           let('Faz de mim Senhor, Teu querer')]
    ),
}


# ============================================================== QUEBRANTADO (G)
QB_REFRAO_A = [
    lab('[Refrão]'),
    cif('| G | % | Em | % |'),
    let('Pela cruz me chamou,'),
    let('gentilmente me atraiu'),
    cif('| D | % | C | % |'),
    let('E eu, sem palavras me aproximo'),
    let('quebrantado por seu amor'),
]

QUEBRANTADO = {
    'titulo': 'QUEBRANTADO',
    'artista': 'Vineyard',
    'tom': 'G',
    'momento': 'Ofertório',
    'corpo': (
        [labc('[Intro]', '| C | Am | Em | D |'), B]
        + [lab('[Verso 1]'),
           cif('| G | % | D | % |'),
           let('Eu olho para cruz e para cruz eu vou'),
           cif('| Em | % | C | % |'),
           let('Do seu sofrer participar, da sua obra eu vou cantar'),
           cif('| G | % | D | % |'),
           let('Meu Salvador, na cruz mostrou'),
           cif('| Em | % | C | Am |'),
           let('o amor do Pai, o justo Deus'), B]
        + QB_REFRAO_A + [B]
        + [labc('[Interlúdio]', '| C | Am | Em | D |'),
           cif('| C | Am | Em | % |'), B]
        + [lab('[Verso 2]'),
           cif('| G | % | D | % |'),
           let('Imerecida vida de graça recebi'),
           cif('| Em | % | C | % |'),
           let('por sua cruz da morte me livrou'),
           cif('| G | % | D | % |'),
           let('Trouxe-me a vida, eu estava condenado'),
           cif('| Em | % | C | % |'),
           let('Mas agora pela cruz eu fui reconciliado'), B]
        + [lab('[Refrão] 3x'),
           cif('| C | D | Em | G/B |'),
           let('Pela cruz me chamou,'),
           let('gentilmente me atraiu'),
           cif('| C | D | Em | G/B |'),
           let('E eu, sem palavras me aproximo'),
           let('quebrantado por seu amor'), B]
        + [lab('[Ponte] 2x'),
           cif('|: Am | % | C | % :|'),
           let('Impressionante é o seu amor'),
           let('Me redimiu e me mostrou o quanto é fiel')]
    ),
}


# ============================================================ A MAIOR HONRA (Ab)
AMH_VERSO_B = [
    cif('| Db | Bbm7 | Fm7 | Ab9/C |'),
    let('Tudo o que eu tinha considero perda'),
    let('Se enfrento a morte, tenho a certeza'),
    cif('| Db | Bbm7 | Fm7 | Ab9/C |'),
    let('Que o morrer é lucro e o viver é Cristo'),
    let('Sigo a porta estreita, só há um caminho:'),
]


def amh_refrao(vezes=''):
    return [
        lab('[Refrão]' + (' ' + vezes if vezes else '')),
        cif('| Db | Eb4 | Fm7 | Ab/C |'),
        let('Jesus, a maior honra da minha vida'),
        let('A maior honra da minha vida'),
        let('É do Teu sofrer participar'),
        cif('| Db | Eb4 | Fm7 | Ab/C |'),
        let('Pra Tua glória vivo os meus dias'),
        let('Quem perder a vida, encontrará'),
    ]


MAIOR_HONRA = {
    'titulo': 'A MAIOR HONRA',
    'artista': 'Julliany Souza',
    'tom': 'Ab',
    'momento': 'Apelo / Ceia',
    'corpo': (
        [labc('[Intro]', '| Db | Eb4 | Fm7 | % |'), B]
        + [lab('[Verso 1]'),
           cif('| Ab9 | Ab9/C | Db9 | % |'),
           let('Nego a mim mesmo'),
           let('e carrego a minha cruz'),
           cif('| Ab9 | Ab9/C | Db9 | % |'),
           let('Se me acorrentarem,'),
           let('tenho a liberdade: Jesus')]
        + AMH_VERSO_B + [B]
        + amh_refrao() + [B]
        + [labc('[Interlúdio]', '| Db | Eb4 | Fm7 | % |'), B]
        + [lab('[Verso 2]')] + AMH_VERSO_B + [B]
        + amh_refrao('2x') + [B]
        + [labc('[Rampa]', '| Db9 | % |'), B]
        + [labc('[Interlúdio]', '| Ab | Bbm7 | Ab/C | Db |'),
           cif('| Ab/Eb | Bbm7 | Ab/C | Db |'), B]
        + [lab('[Ponte] 4x'),
           cif('| Ab | Bbm7 | Ab/C | Db |'),
           let('Minha recompensa não é o paraíso'),
           let('O meu maior prêmio é estar Contigo'),
           anot('4ª vez'),
           cif('| Ab/Eb | Bbm7 | Ab/C | Db |'),
           let('Minha recompensa não é o paraíso'),
           let('O meu maior prêmio é estar Contigo'), B]
        + amh_refrao('2x') + [B]
        + [labc('[Fim]', '| Db | Eb4 | Fm7 | Ab/C |')]
    ),
}


