import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { transporMusicaTexto } from '../src/index.ts';

function ler(caminho: string): string {
  return readFileSync(new URL(caminho, import.meta.url), 'utf8');
}

test('acentos sobrevivem ao ciclo completo de transposição', () => {
  const resultado = transporMusicaTexto(ler('../musicas/ao-unico.cifra'), 'D');
  assert.match(resultado, /Ao único/);
  assert.match(resultado, /Invisível, mas real/);
  assert.match(resultado, /Consagramos todo nosso ser/);
});

test('saída não tem CRLF, só LF', () => {
  const resultado = transporMusicaTexto(ler('../musicas/o-grande-eu-sou.cifra'), 'D');
  assert.equal(resultado.includes('\r'), false);
});

test('saída termina com exatamente uma newline', () => {
  const resultado = transporMusicaTexto(ler('../musicas/o-grande-eu-sou.cifra'), 'D');
  assert.equal(resultado.endsWith('\n'), true);
  assert.equal(resultado.endsWith('\n\n'), false);
});
