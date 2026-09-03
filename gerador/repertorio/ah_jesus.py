from ..modelo import lab, labc, cif, pos, let, anot, B

BASE = '| C7M | % | G/B | % | Am7 | % |'
REF1 = '| C7M | % | Bm7 | % | Am7 | % |'

_PRE = [
    lab('[Pré-refrão]'),
    cif('| C9 | D | Em7 | Bm7 |'),
    let('Não adianta fingir'),
    let('Que está tudo bem'),
    let('Se de Ti eu recebi perdão'),
    let('Mas não consigo perdoar ninguém'),
    cif('| C9 | D | Em7 | Bm7 |'),
    let('A outra face eu não dei'),
    let('Só o meu ego escutei'),
    let('Até amei os meus amigos'),
    let('Mas meus inimigos odiei'),
    B,
    cif('| C9 | D | Bm7 | Em7 |'),
    let('Na minha hipocrisia'),
    let('Me achei melhor que o outro'),
    let('Sem perceber a trave'),
    let('Que estava no meu olho'),
    B,
    cif('| C9 | D | Bm7 | Em7 |'),
    let('Em pele de ovelha'),
    let('Agindo como um lobo'),
    let('Me esqueci do reino'),
    let('Juntando os meus tesouros'),
]

_REFRAO1 = [
    lab('[Refrão 1]'),
    cif(REF1),
    let('Ah, Jesus'),
    let('Quebra o meu orgulho'),
    let('E faz-me olhar pra cruz'),
    let('Tira a dureza do meu coração'),
    let('De joelhos, eu imploro o'),
    cif(REF1),
    let('Teu perdão pois Tua graça'),
    let('Joga a minha carne ao chão'),
    let('E me ensina o valor da comunhão'),
    let('Do beber do vinho e partilhar do pão'),
]


def _refrao2():
    return [
        lab('[Refrão 2]'),
        cif('| G  /  /  G/B | C D |'),
        let('Dá-me um coração igual ao Teu'),
        let('Meu Mestre'),
        cif('| G  /  /  G/B | C D |'),
        let('Dá-me um coração igual ao Teu'),
        cif('| Bm7  Em7 | Bm7  Em7 |'),
        let('Coração disposto a obedecer'),
        let('Cumprir todo o Teu querer'),
        cif('| Am7  G/B  C  D | G |'),
        let('Dá-me um coração igual ao Teu'),
        B,
        cif('| G  /  /  G/B | C D |'),
        let('Dá-me um coração igual ao Teu'),
        let('Meu Mestre'),
        cif('| G  /  /  G/B | C D |'),
        let('Dá-me um coração igual ao Teu'),
        cif('| Bm7  Em7 | Bm7  Em7 |'),
        let('Coração disposto a obedecer'),
        let('Cumprir todo o Teu querer'),
        cif('| Am7  G/B  C  D |'),
        let('Dá-me um cora_ção igual ao Teu'),
    ]


AH_JESUS = {
    # Medley. Só o refrão de "Coração Igual ao Teu" entra ([Refrão 2]);
    # todo o resto — inclusive [Verso 2] e [Ponte] — é de "Ah, Jesus".
    'titulo': 'AH, JESUS / CORAÇÃO IGUAL AO TEU',
    'artista': 'Julliany Souza',
    'tom': 'G',
    'corpo': (
        [labc('[Intro]', BASE), B]

        + [lab('[Verso 1]'),
           cif('| G | G9 | Em7 | % |'),
           let('Quem foi muito perdoado'),
           let('Deveria saber o valor de ser amado'),
           let('Mas por outro lado'),
           let('O bem que eu quero fazer'),
           cif('| Am7 | G/B | C | Cm6 |'),
           let('De fato eu não faço'),
           let('E, dependendo do pecado'),
           let('Eu nem me sinto incomodado'),
           let('Então esbarro na Tua palavra'),
           let('E sou confrontado'), B]

        + _PRE + [B]
        + _REFRAO1 + [B]
        + [labc('[Solo]', BASE), B]
        + _PRE + [B]
        + _REFRAO1 + [B]
        + [labc('[Solo]', REF1), B]

        + [lab('[Verso 2]'),
           cif('| C7M | G/B | Am7 | G/B |'),
           let('Eu sou o vaso, Tu és o oleiro'),
           let('Quebra minha vida,'),
           let('Me refaz por inteiro'),
           cif('| C7M | G/B | Am7 | G/B |'),
           let('Tomo a minha cruz e nego a mim mesmo'),
           let('Pois do pecado'),
           let('Não sou mais prisioneiro'),
           B,
           cif('| C7M | G/B |'),
           let('Mesmo com falhas, esse é o meu desejo'),
           cif('| Am7  G/B  C  D | G | % |'),
           let('Dá-me um coração igual ao Teu'), B]

        + _refrao2() + [B]
        + _REFRAO1 + [B]
        + [labc('[Solo]', REF1), B]
        + [labc('[Interlúdio]', REF1), B]

        + [lab('[Ponte]'),
           cif('| C7M | G/B | Am7 | G/B |'),
           let('Judas veio ao Teu encontro'),
           let('Com a traição pesando'),
           let('Mas Te vejo se inclinando'),
           let('E os pés do traidor lavando'),
           B,
           cif('| C7M | G/B | Am7 | G/B |'),
           let('Vejo Pedro Te negando'),
           let('E o galo então cantando'),
           let('Mesmo assim, Tu dizes:'),
           let('Pedro, apascenta o meu rebanho'),
           B,
           cif('| C7M | G/B |'),
           let('Quebrantado, estou chorando'),
           let('Minha alma está clamando'),
           cif('| Am7  G/B  C  D | G | % |'),
           let('Dá-me um cora_ção igual ao Teu'), B]

        + _refrao2() + [B]
        + _REFRAO1 + [B]
        + [labc('[Fim]', REF1)]
    ),
}
