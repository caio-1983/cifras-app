from ..modelo import lab, labc, cif, pos, let, anot, B

from .yahweh_e_tua_forte_mao import YAHWEH, TFM

EMAUS_VERSO = [
    pos('                                  E                      B'),
    let('Quem é esse que vem, nos abraçando'),
    pos('                  E'),
    let('Quem é esse que vem'),
    pos('                           B                  F#/A#'),
    let('Nos constrangendo com o olhar'),
    pos('                    E                 F#'),
    let('Ele é tão sábio ensina em amor'),
    pos('                     E                        F#'),
    let('Ele é tão manso cuida dos corações'),
    B,
    pos('  G#m F#                      E                   B'),
    let('Quem  é  esse que vem, nos abraçando'),
    pos('  G#m F#                   E'),
    let('Quem  é  esse que vem'),
    pos('                          B                    F#'),
    let('Nos constrangendo com o olhar'),
    pos('                  E                    F#'),
    let('Ele é tão sábio ensina em amor'),
    pos('                    E                         F#'),
    let('Ele é tão manso cuida dos corações'),
]

EMAUS_PRE = [
    lab('[Pré-refrão]'),
    pos('             E'),
    let('Ele entrou em casa'),
    pos('           F#'),
    let('Ele está à mesa'),
    pos('            G#m'),
    let('Ele nos observa'),
    pos('                 F#/A#'),
    let('Sabe que o esperamos'),
]

EMAUS_REF = [
    lab('[Refrão] 2x'),
    pos('             C#m                          B/D#'),
    let('E ao partir o pão os nossos olhos se abrem'),
    pos('                    E                       F#'),
    let('E reconhecemos quem Tu és'),
    pos('                   C#m                         B/D#'),
    let('Ao som da Tua voz, os nossos corações'),
    pos('                           E                             F#'),
    let('Queimam de amor, queimam de amor'),
]


def emaus_ponte(vezes):
    return [
        lab(f'[Ponte] {vezes}'),
        pos('E                                G#m'),
        let('  Nós arrumamos a casa'),
        pos('F#                          B/D#'),
        let('   Perfumamos ela toda'),
        pos('E                               G#m'),
        let('  Nós preparamos a mesa'),
        pos('F#                            B/D#'),
        let('   Tome o lugar de honra'),
    ]


EMAUS = {
    'titulo': 'EMAÚS',
    'artista': 'Morada',
    'tom': 'B',
    'corpo': (
        [labc('[Intro]', '| E G#m | F# B/D# |'), B]
        + [lab('[Verso 1]')] + EMAUS_VERSO + [B]
        + EMAUS_PRE + [B]
        + EMAUS_REF + [B]
        + emaus_ponte('2x') + [B]
        + [labc('[Interlúdio]', '| E G#m | F# B/D# |'), B]
        + EMAUS_PRE + [B]
        + EMAUS_REF + [B]
        + emaus_ponte('4x') + [B]
        + [lab('[Tag]'), cif('| E G#m | F# B/D# |'),
           let('Tome o lugar de honra'), B]
        + [labc('[Fim]', '| E |')]
    ),
}


NHNI_REF = [
    lab('[Refrão]'),
    cif('| F | % | Dm | % | F/A | Bb | Dm | Bb |'),
    let('Erga os olhos o Rei chegou a luz do mundo nos alcançou'),
    let('Não há um nome igual, não há um nome igual'),
    let('Cristo é o Senhor'),
    B,
    let('O invencível reinando está, montes se prostram pra o adorar'),
    let('Não há um nome igual, não há um nome igual'),
    let('Cristo é o Senhor'),
]

NHNI = {
    'titulo': 'NÃO HÁ UM NOME IGUAL',
    'artista': 'Ministério Avivah',
    'tom': 'F',
    'corpo': (
        [labc('[Intro]', '| F  C/E | F  Gm7  F  C/E | Dm7 | % |'), B]
        + [lab('[Verso 1]'),
           pos(' C/E   F    C/E   F   Gm  F   C/E    Dm'),
           let('Não   há um   ou-tro  no-me igual'),
           pos('C/E    F    C/E      F  Gm  F    C/E  Dm'),
           let('Mai--or   que a  te-rra, céu  e    mar'),
           pos(' F/A    Bb      F/A  Bb  C     Bb  F/A  Dm'),
           let('Sua    glória           to-dos hão  de    ver'),
           pos('      F/A            Bb'),
           let('E à Ele se render'),
           pos('F/A  Bb      C   Bb  F/A  Dm  Bb'),
           let('   I--  gual   ou-tro não  há'),
           B,
           let('Sua face brilha mais que o sol sua graça eterna em amor'),
           let('O Rei que soberano está em glória reinará igual outro não há'), B]
        + NHNI_REF + [B]
        + [lab('[Verso 2]'),
           let('Em Deus a esperança achei na cruz venceu o nosso Rei'),
           let('Poder que a morte não venceu'),
           let('Na cruz vida nos deu, igual outro não há'), B]
        + NHNI_REF + [B]
        + [labc('[Interlúdio]', '| F/A | % | % | % | F/A | % | % | % |'), B]
        + [lab('[Ponte] 2x'),
           cif('| F | % | Dm | % | Bb | % | Dm | Bb |'),
           let('Com Teu poder cadeias se rompem'),
           let('Terra e céu adoram Teu nome'),
           let('O nome de Jesus, o nome de Jesus é'),
           let('Santo, Santo, Santo'), B]
        + NHNI_REF
    ),
}
