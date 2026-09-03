"""Gera `gerador-ts/dados-repertorio.ts` a partir do repertório Python.

Não é o contrato de saída (isso é `tests/fixtures-emissor/`) — é o contrato de
ENTRADA: os mesmos dados que os emissores Python leem (`gerador.repertorio`),
convertidos pra TypeScript sem passar pela mão de ninguém. Transcrever treze
músicas de letra e cifra à mão seria o jeito mais fácil de furar "fidelidade
byte a byte" antes mesmo de chegar no emissor — um erro de digitação na
importação faria o port divergir da fixture por um motivo que não tem nada a
ver com o emissor. `json.dumps` garante que a string TS de saída é literal ao
dict Python de entrada, caractere por caractere.

Uso, a partir da raiz do repositório:

    python gerador/scripts/gerar_dados_ts.py
"""
import json
import pathlib
import sys

RAIZ = pathlib.Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ))
sys.path.insert(0, str(RAIZ / 'gerador' / 'scripts'))

from gerador.repertorio import REPERTORIO, CULTOS  # noqa: E402
import gerar_fixtures_emissor as fixtures  # noqa: E402 (traz ADVERSARIAL)

DESTINO = RAIZ / 'gerador-ts' / 'dados-repertorio.ts'


def musica_para_json(m):
    """Corpo já é uma lista de tuplas (tipo, conteúdo); json.dumps vira array
    de 2 posições — `('labc', ('[Intro]', '| E |'))` -> `["labc", ["[Intro]", "| E |"]]`,
    `('b', None)` -> `["b", null]`. Mesma forma que `modelo.py` já usa internamente."""
    saida = {'titulo': m['titulo'], 'artista': m['artista'], 'tom': m['tom'], 'corpo': m['corpo']}
    if m.get('momento'):
        saida['momento'] = m['momento']
    return saida


def slug_por_identidade(musica_obj):
    for slug, m in REPERTORIO.items():
        if m is musica_obj:
            return slug
    raise ValueError(f'música de CULTOS não encontrada em REPERTORIO: {musica_obj.get("titulo")!r}')


def main():
    repertorio_json = {slug: musica_para_json(m) for slug, m in sorted(REPERTORIO.items())}
    cultos_json = {
        nome: [[slug_por_identidade(m), tom] for m, tom in ordem]
        for nome, ordem in sorted(CULTOS.items())
    }
    adversarial_json = musica_para_json(fixtures.ADVERSARIAL)

    linhas = [
        '// GERADO AUTOMATICAMENTE por gerador/scripts/gerar_dados_ts.py — não editar à mão.',
        '// Fonte: gerador/repertorio/*.py (Python, referência) via json.dumps — sem',
        '// transcrição manual, pra não introduzir divergência de dado antes mesmo de',
        '// chegar no emissor. Regenerar com:',
        '//   python gerador/scripts/gerar_dados_ts.py',
        '',
        "export type TuplaLinha = ['b', null] | [string, unknown];",
        '',
        'export interface MusicaDados {',
        '  titulo: string;',
        '  artista: string;',
        '  tom: string;',
        '  momento?: string;',
        '  corpo: TuplaLinha[];',
        '}',
        '',
        f'export const REPERTORIO: Record<string, MusicaDados> = {json.dumps(repertorio_json, ensure_ascii=False, indent=2)};',
        '',
        "/** Cada culto: lista de [slug em REPERTORIO, tom tocado]. */",
        f'export const CULTOS: Record<string, [string, string][]> = {json.dumps(cultos_json, ensure_ascii=False, indent=2)};',
        '',
        '/** Música sintética adversarial — ver tests/fixtures-emissor/MANIFESTO.md. */',
        f'export const ADVERSARIAL: MusicaDados = {json.dumps(adversarial_json, ensure_ascii=False, indent=2)};',
        '',
    ]

    DESTINO.parent.mkdir(parents=True, exist_ok=True)
    DESTINO.write_text('\n'.join(linhas), encoding='utf-8')
    print(f'{len(repertorio_json)} músicas, {len(cultos_json)} cultos, 1 adversarial -> {DESTINO}')


if __name__ == '__main__':
    main()
