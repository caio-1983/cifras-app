import { test } from 'node:test';
import assert from 'node:assert/strict';
import { serializarMusica } from '../src/serializador.ts';
import type { Musica } from '../src/tipos.ts';

test('serializarMusica remonta cabeçalho, separador --- e corpo', () => {
  const musica: Musica = {
    cabecalho: { campos: [{ chave: 'titulo', valor: 'X' }, { chave: 'tom', valor: 'D' }] },
    corpo: [
      {
        tipo: 'cifra',
        itens: [
          { coluna: 0, item: { tipo: 'literal', texto: '|' } },
          {
            coluna: 2,
            item: {
              tipo: 'acorde',
              acorde: { raiz: { letra: 'C', acidente: 0 }, sufixo: '', baixo: { letra: 'E', acidente: 0 } },
              textoOriginal: 'E/G#',
            },
          },
          { coluna: 7, item: { tipo: 'literal', texto: '|' } },
        ],
      },
      { tipo: 'letra', texto: 'a letra' },
      { tipo: 'separador' },
      { tipo: 'subtitulo', texto: '[Refrão] 2x' },
    ],
  };
  const esperado = ['titulo: X', 'tom: D', '---', '| C/E |', '>a letra', '', '[Refrão] 2x'].join('\n');
  assert.equal(serializarMusica(musica), esperado);
});

test('linha posicional serializa com coluna absoluta', () => {
  const musica: Musica = {
    cabecalho: { campos: [{ chave: 'titulo', valor: 'X' }, { chave: 'tom', valor: 'C' }] },
    corpo: [
      {
        tipo: 'posicional',
        itens: [
          { coluna: 0, item: { tipo: 'literal', texto: '~' } },
          {
            coluna: 1,
            item: { tipo: 'acorde', acorde: { raiz: { letra: 'B', acidente: 0 }, sufixo: 'm' }, textoOriginal: 'Am' },
          },
          {
            coluna: 11,
            item: {
              tipo: 'acorde',
              acorde: { raiz: { letra: 'F', acidente: 1 }, sufixo: 'm7' },
              textoOriginal: 'Em7',
            },
          },
          {
            coluna: 21,
            item: { tipo: 'acorde', acorde: { raiz: { letra: 'G', acidente: 0 }, sufixo: '7+' }, textoOriginal: 'F7+' },
          },
        ],
      },
    ],
  };
  const linhas = serializarMusica(musica).split('\n');
  assert.equal(linhas[3], '~Bm        F#m7      G7+');
});
