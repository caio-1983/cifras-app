import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transporMusica } from '../src/transpositor.ts';
import type { Musica } from '../src/tipos.ts';

function musicaSintetica(): Musica {
  return {
    cabecalho: { campos: [{ chave: 'titulo', valor: 'X' }, { chave: 'tom', valor: 'C' }] },
    corpo: [
      {
        tipo: 'cifra',
        itens: [
          { coluna: 0, item: { tipo: 'literal', texto: '|' } },
          {
            coluna: 2,
            item: {
              tipo: 'acorde',
              acorde: { raiz: { letra: 'E', acidente: 0 }, sufixo: '', baixo: { letra: 'G', acidente: 1 } },
              textoOriginal: 'E/G#',
            },
          },
          { coluna: 7, item: { tipo: 'literal', texto: '|' } },
        ],
      },
      { tipo: 'letra', texto: 'não muda' },
      { tipo: 'separador' },
    ],
  };
}

test('transporMusica atualiza o campo tom do cabeçalho', () => {
  const resultado = transporMusica(musicaSintetica(), 'Ab');
  assert.deepEqual(resultado.cabecalho.campos, [
    { chave: 'titulo', valor: 'X' },
    { chave: 'tom', valor: 'Ab' },
  ]);
});

test('transporMusica transpõe raiz e baixo de cada acorde (caso E/G# -> C/E)', () => {
  const resultado = transporMusica(musicaSintetica(), 'Ab');
  const linha = resultado.corpo[0]!;
  if (linha.tipo !== 'cifra') throw new Error('unreachable');
  const itemAcorde = linha.itens[1]!.item;
  if (itemAcorde.tipo !== 'acorde') throw new Error('unreachable');
  assert.deepEqual(itemAcorde.acorde.raiz, { letra: 'C', acidente: 0 });
  assert.deepEqual(itemAcorde.acorde.baixo, { letra: 'E', acidente: 0 });
  assert.equal(itemAcorde.textoOriginal, 'E/G#'); // preservado para o relayout
});

test('transporMusica não altera itens literais, letra ou separador', () => {
  const resultado = transporMusica(musicaSintetica(), 'Ab');
  const linha0 = resultado.corpo[0]!;
  assert.deepEqual(linha0.tipo === 'cifra' ? linha0.itens[0] : null, {
    coluna: 0,
    item: { tipo: 'literal', texto: '|' },
  });
  assert.deepEqual(resultado.corpo[1], { tipo: 'letra', texto: 'não muda' });
  assert.deepEqual(resultado.corpo[2], { tipo: 'separador' });
});

test('transporMusica para o mesmo tom é identidade', () => {
  const original = musicaSintetica();
  const resultado = transporMusica(original, 'C');
  assert.deepEqual(resultado, original);
});
