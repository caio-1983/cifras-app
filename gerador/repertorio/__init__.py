"""Repertório modelado à mão, de cifras reais do acervo.

Estas treze músicas foram modeladas uma a uma durante a montagem dos cultos de
23/08, 28/08, 30/08 e 06/09 de 2026 — todas foram tocadas. Servem para três
coisas:

1. **Massa de teste real.** Cobrem linha posicional, linha de compasso, medley,
   anotação de execução, melisma, momento de culto, tom com bemol e tom com
   sustenido. Nenhum arquivo sintético cobre isso.
2. **Referência de modelagem.** Quando aparecer dúvida de como representar
   alguma coisa, é aqui que está o precedente.
3. **Semente do acervo.** Quando o formato `.cifra` estabilizar (ver
   docs/achados-importacao.md), estas viram os primeiros arquivos convertidos.

**São Python temporariamente, não por design.** O destino é `.cifra` em
`musicas/`. Ficaram assim porque foram escritas antes de o formato existir, e
mover agora seria converter para um formato que ainda vai mudar.
"""
from .yahweh_e_tua_forte_mao import YAHWEH, TFM
from .emaus_e_nao_ha_um_nome_igual import EMAUS, NHNI
from .alem_do_impossivel_e_eu_me_rendo import ADI, EMR
from .pai_de_multidoes import PDM
from .ah_jesus import AH_JESUS
from .setlist_06set import (VITORIOSO, CONSTRUIR, TEU_TOQUE, QUEBRANTADO,
                            MAIOR_HONRA)

#: Repertório indexado por slug.
REPERTORIO = {
    'exaltamos-yahweh': YAHWEH,
    'tua-forte-mao': TFM,
    'emaus': EMAUS,
    'nao-ha-um-nome-igual': NHNI,
    'alem-do-impossivel': ADI,
    'eu-me-rendo': EMR,
    'pai-de-multidoes': PDM,
    'ah-jesus': AH_JESUS,
    'vitorioso-es': VITORIOSO,
    'eu-vou-construir': CONSTRUIR,
    'teu-toque': TEU_TOQUE,
    'quebrantado': QUEBRANTADO,
    'a-maior-honra': MAIOR_HONRA,
}

#: Cultos que já foram tocados, com o tom de cada música. Reproduzir qualquer um
#: deles é o teste de regressão mais forte que existe no projeto.
CULTOS = {
    '30AGO_Noite': [(YAHWEH, 'F'), (EMAUS, 'B'), (NHNI, 'F'), (TFM, 'Ab')],
    '28AGO_Sexta': [(ADI, 'C'), (EMR, 'G'), (PDM, 'B')],
    '06SET': [(VITORIOSO, 'G'), (CONSTRUIR, 'C'), (TEU_TOQUE, 'Bb'),
              (QUEBRANTADO, 'C'), (MAIOR_HONRA, 'Ab')],
}

__all__ = ['REPERTORIO', 'CULTOS']
