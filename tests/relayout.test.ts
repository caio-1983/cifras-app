import { test } from 'node:test';
import assert from 'node:assert/strict';
import { colunaAbsoluta, larguraPreservada } from '../src/relayout.ts';

test('colunaAbsoluta: reproduz o caso Am/Em7/F7+ -> Bm/F#m7/G7+ (coluna do último item fica fixa)', () => {
  const itens = [
    { coluna: 0, textoOriginal: 'Am', textoNovo: 'Bm' },
    { coluna: 10, textoOriginal: 'Em7', textoNovo: 'F#m7' },
    { coluna: 20, textoOriginal: 'F7+', textoNovo: 'G7+' },
  ];
  assert.equal(colunaAbsoluta(itens), 'Bm        F#m7      G7+');
});

test('colunaAbsoluta: nada muda de largura -> saída idêntica ao original', () => {
  const itens = [
    { coluna: 0, textoOriginal: 'Em', textoNovo: 'Em' },
    { coluna: 10, textoOriginal: 'Bm7', textoNovo: 'Bm7' },
    { coluna: 20, textoOriginal: 'C7+', textoNovo: 'C7+' },
  ];
  assert.equal(colunaAbsoluta(itens), 'Em        Bm7       C7+');
});

test('colunaAbsoluta: colisão (acorde alarga demais) usa mínimo de 1 espaço', () => {
  const itens = [
    { coluna: 0, textoOriginal: 'Am', textoNovo: 'C#m7' },
    { coluna: 3, textoOriginal: 'Em7', textoNovo: 'X' },
  ];
  assert.equal(colunaAbsoluta(itens), 'C#m7 X');
});

test('larguraPreservada: reproduz | G Am Em7 | F | % | -> | A Bm F#m7 | G | % | (barra desliza)', () => {
  const itens = [
    { coluna: 0, textoOriginal: '|', textoNovo: '|' },
    { coluna: 2, textoOriginal: 'G', textoNovo: 'A' },
    { coluna: 4, textoOriginal: 'Am', textoNovo: 'Bm' },
    { coluna: 7, textoOriginal: 'Em7', textoNovo: 'F#m7' },
    { coluna: 11, textoOriginal: '|', textoNovo: '|' },
    { coluna: 13, textoOriginal: 'F', textoNovo: 'G' },
    { coluna: 15, textoOriginal: '|', textoNovo: '|' },
    { coluna: 17, textoOriginal: '%', textoNovo: '%' },
    { coluna: 19, textoOriginal: '|', textoNovo: '|' },
  ];
  assert.equal(larguraPreservada(itens), '| A Bm F#m7 | G | % |');
});

test('larguraPreservada: preserva espaçamento de alinhamento visual (>1 espaço) quando nada muda de largura', () => {
  const itens = [
    { coluna: 0, textoOriginal: 'C', textoNovo: 'C' },
    { coluna: 4, textoOriginal: 'F', textoNovo: 'F' },
  ];
  assert.equal(larguraPreservada(itens), 'C   F');
});

test('larguraPreservada: gap original é preservado mesmo quando o item anterior alarga (desliza, não encolhe)', () => {
  const itens = [
    { coluna: 0, textoOriginal: 'Em7', textoNovo: 'F#m7' },
    { coluna: 4, textoOriginal: 'C', textoNovo: 'C' },
  ];
  // gap original = 4 - (0+3) = 1; F#m7 tem 4 chars, então o próximo item desliza de 4 para 5
  assert.equal(larguraPreservada(itens), 'F#m7 C');
});

test('primeiro item de qualquer linha preserva a indentação original (leading whitespace)', () => {
  const itens = [
    { coluna: 8, textoOriginal: '|', textoNovo: '|' },
    { coluna: 10, textoOriginal: 'Am', textoNovo: 'Bm' },
  ];
  assert.equal(larguraPreservada(itens), '        | Bm');
  assert.equal(colunaAbsoluta(itens), '        | Bm');
});

test('colunaAbsoluta: barras de compasso usadas posicionalmente (híbrido) realinham como qualquer outro item', () => {
  const itens = [
    { coluna: 0, textoOriginal: '|', textoNovo: '|' },
    { coluna: 2, textoOriginal: 'Cm', textoNovo: 'C#m' },
    { coluna: 5, textoOriginal: '|', textoNovo: '|' },
    { coluna: 15, textoOriginal: '|', textoNovo: '|' },
    { coluna: 17, textoOriginal: 'Bb', textoNovo: 'A' },
    { coluna: 20, textoOriginal: '|', textoNovo: '|' },
  ];
  assert.equal(colunaAbsoluta(itens), '| C#m|         | A  |');
});

test('colunaAbsoluta: acorde que encolhe ao transpor não desloca os itens seguintes', () => {
  const itens = [
    { coluna: 0, textoOriginal: 'F#m7', textoNovo: 'Fm' },
    { coluna: 10, textoOriginal: 'Am', textoNovo: 'Bm' },
  ];
  assert.equal(colunaAbsoluta(itens), 'Fm        Bm');
});

test('colunaAbsoluta: item de anotação de execução atravessa relayout como literal, sem ser afetado', () => {
  const itens = [
    { coluna: 0, textoOriginal: 'Eb', textoNovo: 'Gb' },
    { coluna: 5, textoOriginal: '{dois ataques}', textoNovo: '{dois ataques}' },
  ];
  assert.equal(colunaAbsoluta(itens), 'Gb   {dois ataques}');
  assert.equal(larguraPreservada(itens), 'Gb   {dois ataques}');
});

test('colunaAbsoluta: chamadas sucessivas não compartilham estado entre linhas', () => {
  const primeira = [{ coluna: 0, textoOriginal: 'Am', textoNovo: 'Bm' }];
  const segunda = [{ coluna: 0, textoOriginal: 'C', textoNovo: 'D' }];
  assert.equal(colunaAbsoluta(primeira), 'Bm');
  assert.equal(colunaAbsoluta(segunda), 'D');
  assert.equal(colunaAbsoluta(primeira), 'Bm');
});
