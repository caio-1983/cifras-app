import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseTom, formatarTom } from '../src/tom.ts';

test('parseTom reconhece tom maior simples', () => {
  assert.deepEqual(parseTom('C'), { letra: 'C', acidente: 0, menor: false });
  assert.deepEqual(parseTom('Ab'), { letra: 'A', acidente: -1, menor: false });
  assert.deepEqual(parseTom('D'), { letra: 'D', acidente: 0, menor: false });
});

test('parseTom reconhece tom menor', () => {
  assert.deepEqual(parseTom('Bm'), { letra: 'B', acidente: 0, menor: true });
  assert.deepEqual(parseTom('C#m'), { letra: 'C', acidente: 1, menor: true });
  assert.deepEqual(parseTom('Gm'), { letra: 'G', acidente: 0, menor: true });
});

test('parseTom rejeita formato inválido', () => {
  assert.throws(() => parseTom('H'));
  assert.throws(() => parseTom('Cmm'));
  assert.throws(() => parseTom(''));
  assert.throws(() => parseTom('c'));
});

test('formatarTom é o inverso de parseTom', () => {
  for (const texto of ['C', 'Ab', 'Bm', 'C#m', 'D']) {
    assert.equal(formatarTom(parseTom(texto)), texto);
  }
});
