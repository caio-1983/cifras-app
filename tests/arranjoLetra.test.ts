import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseMusica } from '../src/index.ts';
import { extrairArranjo, extrairArranjoTexto, extrairLetra } from '../src/arranjoLetra.ts';

const original = readFileSync('musicas/o-grande-eu-sou.cifra', 'utf8');
const musica = parseMusica(original, 'o-grande-eu-sou.cifra');

test('extrairArranjo: nenhuma linha cantada sobrevive, nem em pedaço', () => {
  const arranjo = extrairArranjoTexto(musica);
  for (const linha of extrairLetra(musica)) {
    if (linha.trim() === '') continue;
    assert.ok(!arranjo.includes(linha), `letra vazou para o arranjo: ${JSON.stringify(linha)}`);
  }
  assert.ok(!arranjo.includes('>'), arranjo);
});

test('extrairArranjo: o que interessa do arranjo continua lá — tom, seções e progressão', () => {
  const arranjo = extrairArranjoTexto(musica);
  assert.ok(arranjo.includes('tom: C'));
  assert.ok(arranjo.includes('[Verso 1]'));
  assert.ok(arranjo.includes('| C | Dm G/B |'));
});

test('extrairArranjo: é o arquivo inteiro menos a letra — nenhuma outra linha se perde', () => {
  const arranjo = extrairArranjo(musica);
  const cantadas = musica.corpo.filter((l) => l.tipo === 'letra').length;
  assert.ok(cantadas > 0, 'a fixture precisa ter letra para o teste valer');
  assert.equal(arranjo.corpo.length, musica.corpo.length - cantadas);
});

test('extrairLetra: devolve o texto cantado sem o ">" e sem cifra', () => {
  const letra = extrairLetra(musica);
  assert.ok(letra.some((l) => l.includes('Quero viver perto de Ti')), letra.join('\n'));
  for (const linha of letra) {
    assert.ok(!linha.startsWith('>'), linha);
    assert.ok(!linha.includes('|'), linha);
  }
});

test('extrairLetra: não começa nem termina em linha em branco, e não empilha vazios', () => {
  const letra = extrairLetra(musica);
  assert.notEqual(letra[0], '');
  assert.notEqual(letra.at(-1), '');
  for (let i = 1; i < letra.length; i++) {
    assert.ok(!(letra[i] === '' && letra[i - 1] === ''), `dois vazios seguidos em ${i}`);
  }
});

test('arranjo + letra cobrem o corpo inteiro: nada é inventado, nada some', () => {
  const arranjo = extrairArranjo(musica);
  const soLetra = musica.corpo.filter((l) => l.tipo === 'letra');
  assert.equal(arranjo.corpo.length + soLetra.length, musica.corpo.length);
});
