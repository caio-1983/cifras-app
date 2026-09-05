/**
 * O contrato do port dos emissores: cada fixture de `tests/fixtures-emissor/`
 * (gerada por `gerador/scripts/gerar_fixtures_emissor.py`, a partir da
 * implementação Python de referência) tem que ser reproduzida byte a byte
 * pelo port TypeScript (`gerador-ts/`).
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import * as rtf from '../gerador-ts/rtf.ts';
import * as html from '../gerador-ts/html.ts';
import { REPERTORIO, CULTOS, ADVERSARIAL } from '../gerador-ts/dados-repertorio.ts';

const RAIZ_FIXTURES = fileURLToPath(new URL('./fixtures-emissor/', import.meta.url));

function ler(caminhoRelativo: string): string {
  return readFileSync(RAIZ_FIXTURES + caminhoRelativo, 'utf8');
}

// -------------------------------------------------------- 13 músicas do repertório
// Os tons de cada música (origem + distantes + extra) são descobertos pelo
// nome dos arquivos de fixture, em vez de duplicar aqui a regra "+3/+6/+9 no
// ciclo de 12 tons" que só existe em gerar_fixtures_emissor.py — o contrato é
// o conteúdo do arquivo, não a regra que o gerou.
const arquivosRtf = readdirSync(RAIZ_FIXTURES + 'rtf');

for (const [slug, musica] of Object.entries(REPERTORIO)) {
  const prefixo = `${slug}_`;
  const tonsDistantes = arquivosRtf
    .filter((f) => f.startsWith(prefixo) && f.endsWith('.rtf'))
    .map((f) => f.slice(prefixo.length, -'.rtf'.length));
  assert.ok(tonsDistantes.length >= 3, `${slug}: esperava pelo menos 3 tons além da origem, achei ${tonsDistantes.length}`);

  for (const tom of [musica.tom, ...tonsDistantes]) {
    const sufixo = tom === musica.tom ? '' : `_${tom}`;
    test(`RTF: ${slug} no tom ${tom} bate com a fixture`, () => {
      assert.equal(rtf.documento([[musica, tom]]), ler(`rtf/${slug}${sufixo}.rtf`));
    });
    test(`HTML: ${slug} no tom ${tom} bate com a fixture`, () => {
      assert.equal(html.documento([[musica, tom]], musica.titulo), ler(`html/${slug}${sufixo}.html`));
    });
  }
}

// -------------------------------------------------------------------- cultos
for (const [nome, ordemDados] of Object.entries(CULTOS)) {
  const ordem: [(typeof REPERTORIO)[string], string][] = ordemDados.map(([slug, tom]) => {
    const musica = REPERTORIO[slug];
    if (!musica) throw new Error(`culto ${nome}: slug desconhecido ${JSON.stringify(slug)}`);
    return [musica, tom];
  });

  test(`RTF: culto ${nome} bate com a fixture`, () => {
    assert.equal(rtf.documento(ordem), ler(`rtf/culto_${nome}.rtf`));
  });
  test(`HTML: culto ${nome} bate com a fixture`, () => {
    assert.equal(html.documento(ordem, `Culto ${nome}`), ler(`html/culto_${nome}.html`));
  });
}

// --------------------------------------------------- culto 06SET: critério inegociável
// Reproduzido aqui de novo, isolado — se algum dia esse teste específico
// falhar sozinho (com os de cima passando), o motivo é outra coisa quebrando
// só o 06SET, não um problema geral do port.
test('RTF: culto 06SET bate com o documento publicado (md5 39df11d417747ee3443f234f3a872c47)', async () => {
  const { createHash } = await import('node:crypto');
  const ordem = CULTOS['06SET']!.map(([slug, tom]) => [REPERTORIO[slug]!, tom] as [(typeof REPERTORIO)[string], string]);
  const saida = rtf.documento(ordem);
  const md5 = createHash('md5').update(saida, 'ascii').digest('hex');
  assert.equal(md5, '39df11d417747ee3443f234f3a872c47');
});

// -------------------------------------------------------- música adversarial
// Gerada com `momento` + quebra de página forçada numa música sozinha (ver
// `escrever_solo_com_quebra_*` em gerar_fixtures_emissor.py) — replica aqui
// a mesma montagem, chamando `escrever(..., quebraAntes: true)` direto em vez
// de `documento()` (que só marca quebra a partir do segundo item da lista).
test('RTF: música adversarial (momento + quebra sozinha, escapes, melisma, fora do BMP) bate com a fixture', () => {
  const saida = rtf.CABECALHO + rtf.escrever(ADVERSARIAL, 'C', true) + '}\n';
  assert.equal(saida, ler('rtf/adversarial.rtf'));
});

test('HTML: música adversarial bate com a fixture', () => {
  const blocos = html.escrever(ADVERSARIAL, 'C', true);
  const saida =
    '<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8">' +
    `<title>${html.esc(ADVERSARIAL.titulo)}</title><style>${html.CSS}</style></head>` +
    `<body>${blocos}</body></html>`;
  assert.equal(saida, ler('html/adversarial.html'));
});

test('emissor: música sem artista sai sem a linha de artista, em vez de ser recusada', () => {
  // O acervo tem 90 músicas cujo documento não registra autor. Exigir o
  // campo obrigaria a inventar um nome ou a esconder um quarto da
  // biblioteca; as duas coisas são piores que uma linha a menos.
  const sem = { titulo: 'X', tom: 'C', corpo: [['cif', '| C | G |']] };
  const saida = html.escrever(sem as never, 'C', false, { momento: false });
  assert.ok(saida.includes('X'));
  assert.ok(!saida.includes('<p><b><span class=h></span></b></p>'), saida);
});

test('emissor: com artista, nada muda — a linha continua exatamente onde estava', () => {
  const com = { titulo: 'X', artista: 'Fulano', tom: 'C', corpo: [['cif', '| C | G |']] };
  const saida = html.escrever(com as never, 'C', false, { momento: false });
  assert.ok(saida.includes('<p><b><span class=h>Fulano</span></b></p>'), saida);
});
