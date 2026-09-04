import test from 'node:test';
import assert from 'node:assert/strict';
import { marcarAnotacoesDeExecucao } from '../src/anotacaoExecucao.ts';

test('marcarAnotacoesDeExecucao: contagem de repetição no fim da linha (caso real, MEU ABRIGO)', () => {
  assert.equal(marcarAnotacoesDeExecucao('| A | A | D | D | 2x'), '| A | A | D | D | {2x}');
});

test('marcarAnotacoesDeExecucao: caixa e parênteses do original são preservados', () => {
  assert.equal(marcarAnotacoesDeExecucao('| E | B | 2X'), '| E | B | {2X}');
  assert.equal(marcarAnotacoesDeExecucao('| E | B | (2X)'), '| E | B | {(2X)}');
  assert.equal(marcarAnotacoesDeExecucao('| E | B | 4x'), '| E | B | {4x}');
});

test('marcarAnotacoesDeExecucao: pausa como compasso, em qualquer caixa (casos reais)', () => {
  assert.equal(marcarAnotacoesDeExecucao('| pausa |'), '| {pausa} |');
  assert.equal(marcarAnotacoesDeExecucao('| pausa | pausa | Em | % |'), '| {pausa} | {pausa} | Em | % |');
  assert.equal(marcarAnotacoesDeExecucao('| Ab Db | PAUSA | PAUSA |'), '| Ab Db | {PAUSA} | {PAUSA} |');
  assert.equal(marcarAnotacoesDeExecucao('| pausa?? |'), '| {pausa??} |');
});

test('marcarAnotacoesDeExecucao: espaçamento entre tokens é preservado', () => {
  assert.equal(marcarAnotacoesDeExecucao('2x  | A9 | E |'), '{2x}  | A9 | E |');
});

test('marcarAnotacoesDeExecucao: acorde nunca é confundido com anotação', () => {
  const cifra = '| A9 | E | F#m | D9 | % | / | C/E | Bb7+ | G4 |';
  assert.equal(marcarAnotacoesDeExecucao(cifra), cifra);
});

test('marcarAnotacoesDeExecucao: vocabulário é fechado — token estranho continua passando adiante (e derrubando o arquivo depois)', () => {
  // O valor de falhar alto: "MODULAÇÃO", "16" e "(Am" são achados reais que
  // precisam de curadoria, não de um pote onde todo lixo cabe.
  assert.equal(marcarAnotacoesDeExecucao('| C | MODULAÇÃO |'), '| C | MODULAÇÃO |');
  assert.equal(marcarAnotacoesDeExecucao('| C | (Am |'), '| C | (Am |');
  assert.equal(marcarAnotacoesDeExecucao('| C | 16 |'), '| C | 16 |');
});
