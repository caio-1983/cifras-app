import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transporMusicaTexto, parseMusica } from '../src/index.ts';
import { serializarMusica } from '../src/serializador.ts';
import { obterCampo } from '../src/cabecalho.ts';

function ler(caminho: string): string {
  return readFileSync(new URL(caminho, import.meta.url), 'utf8');
}

const CASOS_GOLDEN = [
  { origem: '../musicas/o-grande-eu-sou.cifra', destino: 'D', esperado: '../tests/esperado/o-grande-eu-sou_D.cifra' },
  { origem: '../musicas/o-grande-eu-sou.cifra', destino: 'G', esperado: '../tests/esperado/o-grande-eu-sou_G.cifra' },
  { origem: '../musicas/ao-unico.cifra', destino: 'Ab', esperado: '../tests/esperado/ao-unico_Ab.cifra' },
  { origem: '../musicas/digno-de-tudo.cifra', destino: 'C', esperado: '../tests/esperado/digno-de-tudo_C.cifra' },
  { origem: '../musicas/ao-unico.cifra', destino: 'Bb', esperado: '../tests/esperado/ao-unico_Bb.cifra' },
];

for (const caso of CASOS_GOLDEN) {
  test(`golden-file: ${caso.origem} -> ${caso.destino}`, () => {
    const textoOrigem = ler(caso.origem);
    const textoEsperado = ler(caso.esperado);
    const resultado = transporMusicaTexto(textoOrigem, caso.destino);
    assert.equal(resultado, textoEsperado);
  });
}

for (const arquivo of [
  '../musicas/o-grande-eu-sou.cifra',
  '../musicas/ao-unico.cifra',
  '../musicas/ruja-o-leao.cifra',
  '../musicas/santo-espirito.cifra',
  '../musicas/ousado-amor.cifra',
  '../musicas/tu-es-bom.cifra',
]) {
  test(`round-trip string-level: ${arquivo} transposto para o próprio tom reproduz o original`, () => {
    const texto = ler(arquivo);
    const musica = parseMusica(texto);
    const tomOrigem = obterCampo(musica.cabecalho, 'tom');
    assert.ok(tomOrigem);
    const resultado = transporMusicaTexto(texto, tomOrigem as string);
    assert.equal(resultado, texto);
  });

  test(`round-trip AST-level: ${arquivo}`, () => {
    const texto = ler(arquivo);
    const musica = parseMusica(texto);
    const reparseado = parseMusica(serializarMusica(musica) + '\n');
    assert.deepEqual(reparseado, musica);
  });
}
