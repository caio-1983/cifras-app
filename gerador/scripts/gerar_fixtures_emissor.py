"""Congela o contrato dos emissores Python em `tests/fixtures-emissor/`.

Gera, a partir de `gerador/rtf.py` e `gerador/html.py` — a implementação de
referência, validada em produção — a saída esperada byte a byte para o port
TypeScript. Roda uma vez, o resultado é commitado; não é gerado on-the-fly
pelos testes (o contrato tem que ficar parado enquanto o port avança).

Uso, a partir da raiz do repositório:

    python gerador/scripts/gerar_fixtures_emissor.py

Cobertura:
- as 13 músicas de `gerador.repertorio.REPERTORIO`, cada uma no tom de
  origem, em 3 tons distantes (escolha determinística, ver
  `tons_distantes` abaixo) e em C — em RTF e em HTML;
- os 3 cultos de `gerador.repertorio.CULTOS` — em RTF e em HTML;
- uma música sintética adversarial (`ADVERSARIAL`, abaixo), isolada, com
  `momento` + quebra de página sozinha — caractere por caractere hostil ao
  emissor, não uso real do acervo.
"""
import pathlib
import sys

RAIZ = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ))

from gerador import rtf, html  # noqa: E402
from gerador.modelo import musica as nova_musica, lab, labc, cif, pos, let, anot, B  # noqa: E402
from gerador.repertorio import REPERTORIO, CULTOS  # noqa: E402

DESTINO = RAIZ / 'tests' / 'fixtures-emissor'

#: Ciclo cromático de 12 tons usado em todo o projeto (mesma lista de
#: `gerador/tests/test_repertorio.py::test_todos_os_tons_do_acervo_transpoem_sem_erro`).
CICLO_12_TONS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B']

#: Além dos 3 tons distantes por música, todo mundo também vira C — tom de
#: referência comum, pedido à parte. Para as duas músicas que já nascem em C
#: (`alem-do-impossivel`, `eu-vou-construir`), o arquivo `_C` sai idêntico ao
#: arquivo de origem — não é bug, é o caso "mesmo tom não muda nada"
#: cobrindo o pipeline do emissor também (não só o do transpositor).
TOM_EXTRA = 'C'


def tons_distantes(origem):
    """3 tons "distantes" do tom de origem, escolha determinística.

    Regra: origem + 3, +6 e +9 posições no ciclo cromático de 12 tons acima
    (terça menor, trítono e sexta menor de distância). Não é escolha
    musical arbitrária — é so um deslocamento fixo no ciclo, que dá 3 tons
    espalhados (nunca adjacentes, nunca o próprio tom de origem) e cobre
    tom com sustenido, com bemol e com armadura pesada de forma repetível
    pra qualquer música, sem juízo de valor sobre qual tom "soa melhor".
    """
    i = CICLO_12_TONS.index(origem)
    return [CICLO_12_TONS[(i + deslocamento) % 12] for deslocamento in (3, 6, 9)]


# ------------------------------------------------------- música adversarial
# Não é repertório real — é uma fixture desenhada pra ser hostil ao emissor,
# cobrindo em um lugar só o que nenhuma música real do acervo junta:
# caracteres de escape de RTF/HTML na letra, espaço múltiplo no início E no
# fim de uma linha de cifra, melisma com 1/2/4 sublinhados, anotação em
# roxo, um caractere fora do plano básico (força o ramo `n - 65536` do
# `\u` do RTF, que nenhuma letra em português alcança) e `momento` + quebra
# de página isolada (hoje esse par só acontece uma vez, dentro dos cinco
# arquivos do culto 06SET — aqui vira um documento de uma música só, pra
# não depender de acertar o resto do culto pra testar essa combinação).
ADVERSARIAL = nova_musica(
    'TESTE ADVERSARIAL',
    'Fixture sintética',
    'C',
    momento='Ofertório',
    corpo=[
        labc('[Intro]', '| C | Am |'), B,
        lab('[Verso 1]'),
        cif('    | C   Am |   G   C |    '),  # espaço múltiplo no início E no fim
        let(r'Barra \ chave { } comercial & menor < maior >'),
        pos('   C          G'),
        let('cora_ção'),  # melisma: 1 sublinhado
        pos('   Am         F'),
        let('San__to'),  # melisma: 2 sublinhados
        pos('   G          C'),
        let('x____y'),  # melisma: 4 sublinhados
        anot('4ª vez, só teclado'),
        let('Trema incomum: ü — nota fora do plano básico: \U0001F3B5'),
        B,
    ],
)


def escrever_rtf(caminho, ordem):
    """Escreve os bytes exatos que `rtf.documento()` devolve como string —
    sem passar pelo `caminho=` embutido em `documento()`, que abre o arquivo
    em modo texto (`open(..., 'w', encoding='ascii')`). No Windows, modo
    texto traduz todo `\\n` pra `\\r\\n` na gravação — um artefato da
    ESCRITA em disco, que não existe na string que `documento()` de fato
    devolve (é essa string, não o arquivo, que `test_repertorio.py` hasheia
    pra bater com o md5 publicado). Gravar em binário evita a tradução e
    mantém a fixture fiel ao contrato real: a string em memória."""
    caminho.parent.mkdir(parents=True, exist_ok=True)
    caminho.write_bytes(rtf.documento(ordem).encode('ascii'))


def escrever_html(caminho, ordem, titulo='Cifras'):
    caminho.parent.mkdir(parents=True, exist_ok=True)
    caminho.write_bytes(html.documento(ordem, titulo=titulo).encode('utf-8'))


def escrever_solo_com_quebra_rtf(caminho, m, tom):
    """Como `rtf.documento`, mas força `quebra_antes=True` numa música
    sozinha — `documento()` só marca quebra a partir do segundo item da
    lista, e aqui o ponto é testar quebra + momento sem precisar de uma
    segunda música de enchimento no meio. Gravação em binário, mesmo motivo
    de `escrever_rtf` acima."""
    caminho.parent.mkdir(parents=True, exist_ok=True)
    texto = rtf.CABECALHO + rtf.escrever(m, tom, quebra_antes=True) + '}\n'
    caminho.write_bytes(texto.encode('ascii'))


def escrever_solo_com_quebra_html(caminho, m, tom, titulo):
    caminho.parent.mkdir(parents=True, exist_ok=True)
    blocos = html.escrever(m, tom, quebra_antes=True)
    texto = ('<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8">'
             f'<title>{html.esc(titulo)}</title><style>{html.CSS}</style></head>'
             f'<body>{blocos}</body></html>')
    caminho.write_bytes(texto.encode('utf-8'))


def main():
    inventario = []

    for slug, m in sorted(REPERTORIO.items()):
        origem = m['tom']
        destinos = tons_distantes(origem)
        inventario.append((slug, origem, destinos))

        escrever_rtf(DESTINO / 'rtf' / f'{slug}.rtf', [(m, origem)])
        escrever_html(DESTINO / 'html' / f'{slug}.html', [(m, origem)], titulo=m['titulo'])

        for tom in destinos + [TOM_EXTRA]:
            escrever_rtf(DESTINO / 'rtf' / f'{slug}_{tom}.rtf', [(m, tom)])
            escrever_html(DESTINO / 'html' / f'{slug}_{tom}.html', [(m, tom)], titulo=m['titulo'])

    for nome, ordem in sorted(CULTOS.items()):
        escrever_rtf(DESTINO / 'rtf' / f'culto_{nome}.rtf', ordem)
        escrever_html(DESTINO / 'html' / f'culto_{nome}.html', ordem, titulo=f'Culto {nome}')

    escrever_solo_com_quebra_rtf(DESTINO / 'rtf' / 'adversarial.rtf', ADVERSARIAL, 'C')
    escrever_solo_com_quebra_html(DESTINO / 'html' / 'adversarial.html', ADVERSARIAL, 'C', ADVERSARIAL['titulo'])

    manifesto = [
        '# Fixtures do emissor — contrato do port TS',
        '',
        'Geradas por `gerador/scripts/gerar_fixtures_emissor.py` a partir de',
        '`gerador/rtf.py`/`gerador/html.py` (implementação de referência, validada',
        'em produção). Regenerar só quando o comportamento do emissor Python mudar',
        'de propósito — o contrato do port TS depende destes arquivos ficarem',
        'parados.',
        '',
        '## Tons distantes: regra determinística',
        '',
        'Para cada música, os 3 "tons distantes" são origem + 3, +6 e +9 posições',
        'no ciclo cromático de 12 tons ' + str(CICLO_12_TONS) + '.',
        '(terça menor, trítono, sexta menor). Escolha mecânica, não musical —',
        'garante variedade de armadura (sustenido/bemol) sem juízo de valor. Além',
        f'desses três, todas também saem em `{TOM_EXTRA}` (pedido à parte) — nas',
        'duas músicas que já nascem em C, o arquivo `_C` é idêntico ao de origem',
        '(caso "mesmo tom não muda nada", documentado, não é falha de geração).',
        '',
        '## Inventário',
        '',
        '| slug | tom origem | tons distantes | + |',
        '|---|---|---|---|',
    ]
    for slug, origem, destinos in inventario:
        manifesto.append(f'| `{slug}` | {origem} | {", ".join(destinos)} | {TOM_EXTRA} |')

    n_musicas = len(inventario)
    n_arquivos_musica = n_musicas * (1 + 3 + 1) * 2
    n_arquivos_culto = len(CULTOS) * 2
    manifesto += [
        '',
        f'{n_musicas} músicas × (1 origem + 3 distantes + 1 extra) × 2 formatos '
        f'(RTF/HTML) = {n_arquivos_musica} arquivos de música, mais {len(CULTOS)} '
        f'cultos × 2 formatos = {n_arquivos_culto} arquivos de culto, mais 2 '
        f'(RTF+HTML) da música adversarial.',
        '',
        '## Cultos',
        '',
        '| nome | músicas (na ordem, com o tom tocado) |',
        '|---|---|',
    ]
    for nome, ordem in sorted(CULTOS.items()):
        musicas_str = ', '.join(f'{m["titulo"]} ({t})' for m, t in ordem)
        manifesto.append(f'| `{nome}` | {musicas_str} |')

    manifesto += [
        '',
        '## Música adversarial (`adversarial.rtf`/`.html`)',
        '',
        'Sintética, não é repertório real. Isolada num documento de uma música só,',
        'com `momento` (Ofertório) + quebra de página forçada — hoje esse par só',
        'ocorre uma vez, embutido no meio dos cinco arquivos do culto 06SET; aqui',
        'fica testável sem depender do resto do culto. Cobre no mesmo lugar:',
        '',
        '- letra com `\\ { } & < >` (escape de RTF e de HTML ao mesmo tempo)',
        '- linha de compasso com espaço múltiplo no início E no fim',
        '- melisma com 1, 2 e 4 sublinhados (`cora_ção`, `San__to`, `x____y`)',
        '- anotação de execução (roxo)',
        '- `ü` (acento incomum no acervo) e um caractere fora do plano básico',
        '  (força o ramo `n - 65536` do `\\u` do RTF — nenhuma letra em português',
        '  chega lá, mas o código tem esse ramo e precisa ser exercitado)',
    ]

    (DESTINO / 'MANIFESTO.md').write_text('\n'.join(manifesto) + '\n', encoding='utf-8')

    total = sum(1 for _ in DESTINO.rglob('*') if _.is_file())
    print(f'{n_musicas} musicas, {len(CULTOS)} cultos, 1 adversarial.')
    print(f'{total} arquivos escritos em {DESTINO}')


if __name__ == '__main__':
    main()
