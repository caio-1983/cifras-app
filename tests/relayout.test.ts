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

// --------------------------------------------- as duas causas de gap <= 0
// Chegam aqui iguais (o próximo item começaria em cima do anterior) e têm
// tratamento oposto. O que as separa é `gapOriginal`: a folga que existia no
// FONTE. Ver o cabeçalho de colunaAbsoluta.

test('colunaAbsoluta: colisão EXATA por alargamento (gap 0, folga na origem) separa com 1 espaço', () => {
  // "| A | F#m |" de E para Db, tokenizado: o "|" do meio começava na coluna 4,
  // exatamente onde "A" -> "Gb" passa a terminar. A origem tinha folga (1
  // espaço), o alargamento comeu — é colisão, não grafia.
  const itens = [
    { coluna: 0, textoOriginal: '|', textoNovo: '|' },
    { coluna: 2, textoOriginal: 'A', textoNovo: 'Gb' },
    { coluna: 4, textoOriginal: '|', textoNovo: '|' },
    { coluna: 6, textoOriginal: 'F#m', textoNovo: 'Ebm' },
    { coluna: 10, textoOriginal: '|', textoNovo: '|' },
  ];
  assert.equal(colunaAbsoluta(itens), '| Gb | Ebm |');
});

test('colunaAbsoluta: dois acordes que colidiriam não podem sair colados — Gb/Bb + Cb não é acorde feio, é outro acorde', () => {
  // NÃO HÁ UM NOME IGUAL, F -> Gb: "F/A  Bb" -> "Gb/Bb" (5) na coluna 0 e
  // "Cb" na coluna 5. Colados sairia "Gb/BbCb", que se lê como um acorde
  // diferente. É o argumento que sustenta a decisão de inserir o espaço.
  const itens = [
    { coluna: 0, textoOriginal: 'F/A', textoNovo: 'Gb/Bb' },
    { coluna: 5, textoOriginal: 'Bb', textoNovo: 'Cb' },
  ];
  assert.equal(colunaAbsoluta(itens), 'Gb/Bb Cb');
});

test('colunaAbsoluta: adjacência da ORIGEM (gap 0 sem folga na origem) é preservada colada — o marcador "~"', () => {
  // "~Am        G": o "~" é item na coluna 0 e "Am" na coluna 1. Nunca houve
  // folga entre os dois; separar deslocaria uma coluna cada acorde de cada
  // linha posicional do acervo.
  const itens = [
    { coluna: 0, textoOriginal: '~', textoNovo: '~' },
    { coluna: 1, textoOriginal: 'Am', textoNovo: 'C#m7' },
    { coluna: 11, textoOriginal: 'G', textoNovo: 'B' },
  ];
  assert.equal(colunaAbsoluta(itens), '~C#m7      B');
});

test('colunaAbsoluta: adjacência da ORIGEM sem envolver "~" — anotação colada num acorde', () => {
  // "{dois ataques}Am" é tokenizado em dois itens sem espaço entre eles
  // (colunas 0 e 14). Adjacência legítima existe fora do marcador de linha:
  // por isso a regra é gapOriginal, e não "ignore o primeiro item".
  const itens = [
    { coluna: 0, textoOriginal: '{dois ataques}', textoNovo: '{dois ataques}' },
    { coluna: 14, textoOriginal: 'Am', textoNovo: 'Bm' },
  ];
  assert.equal(colunaAbsoluta(itens), '{dois ataques}Bm');
});

test('colunaAbsoluta: adjacência da ORIGEM comprimida por alargamento não vira espaço negativo', () => {
  // gapOriginal === 0 e gapDesejado < 0 ao mesmo tempo: o item anterior alargou
  // POR CIMA de uma adjacência que já era colada. Não existe inserir -2
  // espaços; a grafia da origem manda e os dois continuam colados.
  // Hoje o acervo não produz este caso (0 ocorrências em musicas/*.cifra × 12
  // tons); os 437 arquivos da importação vão produzir.
  const itens = [
    { coluna: 0, textoOriginal: '~', textoNovo: '~' },
    { coluna: 1, textoOriginal: 'A', textoNovo: 'Gb' },
    { coluna: 2, textoOriginal: 'Bb', textoNovo: 'C' },
  ];
  // "Bb" era colado em "A" (coluna 2 = 1 + len("A")); "Gb" alargou e o gap
  // desejado ficou -1. Sai colado, não com espaço nem com erro.
  assert.equal(colunaAbsoluta(itens), '~GbC');
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
  // "C#m" alarga e encosta na barra da coluna 5, que tinha folga na origem:
  // colisão, entra o espaço. Aqui é acorde contra barra de compasso — não gera
  // ambiguidade de leitura como acorde contra acorde geraria, mas a regra é a
  // mesma, e a barra separada lê melhor que "C#m|".
  assert.equal(colunaAbsoluta(itens), '| C#m |        | A  |');
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
