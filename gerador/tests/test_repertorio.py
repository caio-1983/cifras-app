"""Regressão contra os cultos que já foram tocados.

Estes são os testes mais fortes do projeto: não verificam uma regra inventada,
verificam que o gerador continua produzindo exatamente o documento que a banda
usou no culto. Qualquer refatoração que mude a saída quebra aqui.

O md5 de referência é o do arquivo que foi publicado no Drive em 01/09/2026 e
verificado no PDF exportado pelo próprio Google: 12 páginas, A4, cinco músicas
em páginas separadas.
"""
import hashlib

import pytest

from gerador import rtf
from gerador.modelo import validar
from gerador.repertorio import REPERTORIO, CULTOS

#: Culto_06SET publicado. Ver docs/achados-google-docs.md.
MD5_06SET = '39df11d417747ee3443f234f3a872c47'


@pytest.mark.parametrize('slug', sorted(REPERTORIO))
def test_repertorio_valida(slug):
    validar(REPERTORIO[slug])


@pytest.mark.parametrize('slug', sorted(REPERTORIO))
def test_repertorio_emite_no_tom_de_origem(slug):
    m = REPERTORIO[slug]
    saida = rtf.documento([(m, m['tom'])])
    assert f'Tom: {m["tom"]}' in saida
    saida.encode('ascii')


def test_culto_06set_bate_com_o_publicado():
    """Reprodução byte a byte do documento que foi para o culto de 06/09."""
    saida = rtf.documento(CULTOS['06SET'])
    md5 = hashlib.md5(saida.encode('ascii')).hexdigest()
    assert md5 == MD5_06SET, (
        'a saída mudou em relação ao documento publicado. Se a mudança for '
        'intencional, republique, confira o PDF e atualize MD5_06SET.')


@pytest.mark.parametrize('nome,quebras', [
    ('30AGO_Noite', 3), ('28AGO_Sexta', 2), ('06SET', 4),
])
def test_uma_quebra_por_musica_menos_a_primeira(nome, quebras):
    saida = rtf.documento(CULTOS[nome])
    assert saida.count('\\page') == quebras


def test_todos_os_tons_do_acervo_transpoem_sem_erro():
    """Varre cada música do repertório contra os doze tons. Pega acidente
    impossível e grafia absurda em qualquer combinação."""
    tons = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']
    for m in REPERTORIO.values():
        for tom in tons:
            saida = rtf.documento([(m, tom)])
            assert '##' not in saida and 'bb' not in saida, (m['titulo'], tom)
