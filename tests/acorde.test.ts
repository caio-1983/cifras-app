import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseAcorde, formatarAcorde, ehTokenAcorde } from '../src/acorde.ts';

test('parseAcorde: tríades simples', () => {
  assert.deepEqual(parseAcorde('C'), { raiz: { letra: 'C', acidente: 0 }, sufixo: '' });
  assert.deepEqual(parseAcorde('Am'), { raiz: { letra: 'A', acidente: 0 }, sufixo: 'm' });
  assert.deepEqual(parseAcorde('F#m'), { raiz: { letra: 'F', acidente: 1 }, sufixo: 'm' });
});

test('parseAcorde: sétimas e maj7 (7+)', () => {
  assert.deepEqual(parseAcorde('G7'), { raiz: { letra: 'G', acidente: 0 }, sufixo: '7' });
  assert.deepEqual(parseAcorde('F7+'), { raiz: { letra: 'F', acidente: 0 }, sufixo: '7+' });
  assert.deepEqual(parseAcorde('Bbm7'), { raiz: { letra: 'B', acidente: -1 }, sufixo: 'm7' });
});

test('parseAcorde: suspenso, nona, sexta', () => {
  assert.deepEqual(parseAcorde('Eb4'), { raiz: { letra: 'E', acidente: -1 }, sufixo: '4' });
  assert.deepEqual(parseAcorde('Asus4'), { raiz: { letra: 'A', acidente: 0 }, sufixo: 'sus4' });
  assert.deepEqual(parseAcorde('G9'), { raiz: { letra: 'G', acidente: 0 }, sufixo: '9' });
  assert.deepEqual(parseAcorde('Eb6'), { raiz: { letra: 'E', acidente: -1 }, sufixo: '6' });
});

test('parseAcorde: baixo invertido transpõe os dois lados', () => {
  assert.deepEqual(parseAcorde('A/C#'), {
    raiz: { letra: 'A', acidente: 0 },
    sufixo: '',
    baixo: { letra: 'C', acidente: 1 },
  });
  assert.deepEqual(parseAcorde('G/B'), {
    raiz: { letra: 'G', acidente: 0 },
    sufixo: '',
    baixo: { letra: 'B', acidente: 0 },
  });
  assert.deepEqual(parseAcorde('F/G'), {
    raiz: { letra: 'F', acidente: 0 },
    sufixo: '',
    baixo: { letra: 'G', acidente: 0 },
  });
});

test('parseAcorde: alterações entre parênteses ficam no sufixo, opacas', () => {
  assert.deepEqual(parseAcorde('E7(#5)(#9)'), {
    raiz: { letra: 'E', acidente: 0 },
    sufixo: '7(#5)(#9)',
  });
});

test('formatarAcorde reconstrói o texto original', () => {
  for (const texto of ['C', 'Am', 'F#m', 'G7', 'F7+', 'Bbm7', 'Eb4', 'A/C#', 'G/B', 'E7(#5)(#9)']) {
    assert.equal(formatarAcorde(parseAcorde(texto)), texto);
  }
});

test('parseAcorde: meia-diminuta, extensão entre parênteses e maj7 alternativo (7M)', () => {
  assert.deepEqual(parseAcorde('F#m7(5-)'), { raiz: { letra: 'F', acidente: 1 }, sufixo: 'm7(5-)' });
  assert.deepEqual(parseAcorde('Gm7(11)'), { raiz: { letra: 'G', acidente: 0 }, sufixo: 'm7(11)' });
  assert.deepEqual(parseAcorde('Ab7M'), { raiz: { letra: 'A', acidente: -1 }, sufixo: '7M' });
});

test('formatarAcorde preserva 7M e 7+ sem normalizar entre si', () => {
  assert.equal(formatarAcorde(parseAcorde('Ab7M')), 'Ab7M');
  assert.equal(formatarAcorde(parseAcorde('Ab7+')), 'Ab7+');
});

test('ehTokenAcorde distingue acorde de token estrutural', () => {
  assert.equal(ehTokenAcorde('C'), true);
  assert.equal(ehTokenAcorde('Bbm7'), true);
  assert.equal(ehTokenAcorde('A/C#'), true);
  assert.equal(ehTokenAcorde('|'), false);
  assert.equal(ehTokenAcorde('|:'), false);
  assert.equal(ehTokenAcorde(':|'), false);
  assert.equal(ehTokenAcorde('%'), false);
  assert.equal(ehTokenAcorde('/'), false);
  assert.equal(ehTokenAcorde('[Intro]'), false);
});
