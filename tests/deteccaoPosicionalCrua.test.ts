import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  pareceAcordeRestrito,
  pareceLinhaDeAcordeCrua,
  marcarLinhasPosicionaisCruas,
} from '../src/deteccaoPosicionalCrua.ts';
import { classificarLinha } from '../src/linhas.ts';

test('pareceAcordeRestrito: aceita todas as notações já vistas no acervo (achados 1-12)', () => {
  for (const t of [
    'C', 'Am', 'F#m', 'G7', 'F7+', 'Bbm7', 'Eb4', 'Asus4', 'G9', 'Eb6',
    'A/C#', 'G/B', 'E7(#5)(#9)', 'F#m7(5-)', 'Gm7(11)', 'Ab7M', 'G4',
    'Aº', 'D#o', 'A', 'E', 'Bm', 'Dm7/A',
  ]) {
    assert.equal(pareceAcordeRestrito(t), true, t);
  }
});

test('pareceAcordeRestrito: rejeita palavras comuns em português que "parseiam" no parser permissivo', () => {
  for (const palavra of ['Ele', 'Deus', 'Estamos', 'Não', 'Perseguidos', 'De', 'Perplexos', 'Da', 'Fé', 'Bem']) {
    assert.equal(pareceAcordeRestrito(palavra), false, palavra);
  }
});

test('pareceLinhaDeAcordeCrua: linhas de acorde reais do refrão (ESTAMOS DE PÉ, já com tab expandido)', () => {
  for (const linha of [
    '            A                 E',
    '                   Bm    A/C#       D',
    '            A                           E',
    '                       G      D',
    '                       A',
  ]) {
    assert.equal(pareceLinhaDeAcordeCrua(linha), true, linha);
  }
});

test('pareceLinhaDeAcordeCrua: rejeita as linhas de letra reais intercaladas com as de acorde', () => {
  for (const linha of [
    'Não caminhamos pelo que vemos',
    'O que nos move, é o que nos cremos',
    'Nação Santa, somos a igreja',
    'Vivemos por Fé',
    'Estamos de pé',
  ]) {
    assert.equal(pareceLinhaDeAcordeCrua(linha), false, linha);
  }
});

test('pareceLinhaDeAcordeCrua: linha vazia e linha já com marcador não contam, mesmo que o conteúdo bata', () => {
  assert.equal(pareceLinhaDeAcordeCrua(''), false);
  assert.equal(pareceLinhaDeAcordeCrua('   '), false);
  assert.equal(pareceLinhaDeAcordeCrua('[Refrão] A E'), false);
  assert.equal(pareceLinhaDeAcordeCrua('~A E'), false);
  assert.equal(pareceLinhaDeAcordeCrua('| A | E |'), false);
});

test('marcarLinhasPosicionaisCruas: prefixa ~ só nas linhas de acorde seguidas de letra (caso real completo)', () => {
  const linhas = [
    '[Refrão]',
    '            A                 E',
    'Não caminhamos pelo que vemos',
    '                   Bm    A/C#       D',
    'O que nos move, é o que nos cremos',
    '                       A',
    'Estamos de pé',
    '',
    '[Ponte] | A | % | Em7 | % | G | % | D | % |',
  ];
  const resultado = marcarLinhasPosicionaisCruas(linhas);
  assert.deepEqual(resultado, [
    '[Refrão]',
    '~            A                 E',
    'Não caminhamos pelo que vemos',
    '~                   Bm    A/C#       D',
    'O que nos move, é o que nos cremos',
    '~                       A',
    'Estamos de pé',
    '',
    '[Ponte] | A | % | Em7 | % | G | % | D | % |',
  ]);
});

test('marcarLinhasPosicionaisCruas: não marca linha de acorde sem letra depois (fim de bloco, órfã)', () => {
  const linhas = ['                       A', ''];
  assert.deepEqual(marcarLinhasPosicionaisCruas(linhas), linhas);
});

test('marcarLinhasPosicionaisCruas: round-trip pelo parser real — vira posicional, acordes corretos, coluna preservada', () => {
  const linhas = marcarLinhasPosicionaisCruas(['            A                 E', 'Não caminhamos pelo que vemos']);
  const linha = classificarLinha(linhas[0]!);
  assert.equal(linha.tipo, 'posicional');
  if (linha.tipo !== 'posicional') throw new Error('unreachable');
  const acordes = linha.itens.filter((i) => i.item.tipo === 'acorde').map((i) => (i.item.tipo === 'acorde' ? i.item.textoOriginal : ''));
  assert.deepEqual(acordes, ['A', 'E']);
  // "~" + linha original é o round-trip esperado (prepend puro, sem reformatar nada)
  assert.equal(linhas[0], '~            A                 E');
});
