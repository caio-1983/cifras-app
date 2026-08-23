import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizarSubtitulo } from '../src/sinonimosSubtitulo.ts';

test('normalizarSubtitulo: variantes de Intro fora de colchete (achado item 3)', () => {
  assert.deepEqual(normalizarSubtitulo('INTRO'), { texto: '[Intro]', reconhecido: true });
  assert.deepEqual(normalizarSubtitulo('Introdução:'), { texto: '[Intro]', reconhecido: true });
  assert.deepEqual(normalizarSubtitulo('{intro}'), { texto: '[Intro]', reconhecido: true });
});

test('normalizarSubtitulo: Solo bate por variantes lexicalmente diferentes (solo, só piano)', () => {
  assert.deepEqual(normalizarSubtitulo('{solo}'), { texto: '[Solo]', reconhecido: true });
  assert.deepEqual(normalizarSubtitulo('[Só piano]'), { texto: '[Solo]', reconhecido: true });
  assert.deepEqual(normalizarSubtitulo('[Solo]'), { texto: '[Solo]', reconhecido: true });
});

test('normalizarSubtitulo: rótulo com qualificador extra preserva o qualificador depois do canônico', () => {
  assert.deepEqual(normalizarSubtitulo('[Intro teclado]'), { texto: '[Intro teclado]', reconhecido: true });
  assert.deepEqual(normalizarSubtitulo('[Intro todos FORTE]'), { texto: '[Intro todos FORTE]', reconhecido: true });
});

test('normalizarSubtitulo: rótulos abertos do acervo, sem número dinâmico', () => {
  assert.deepEqual(normalizarSubtitulo('[Instrumental]'), { texto: '[Instrumental]', reconhecido: true });
  assert.deepEqual(normalizarSubtitulo('[Versos]'), { texto: '[Versos]', reconhecido: true });
  assert.deepEqual(normalizarSubtitulo('[Pontes 1 e 2]'), { texto: '[Pontes 1 e 2]', reconhecido: true });
  assert.deepEqual(normalizarSubtitulo('[Pontes 3 e 4]'), { texto: '[Pontes 3 e 4]', reconhecido: true });
  assert.deepEqual(normalizarSubtitulo('[Transição]'), { texto: '[Transição]', reconhecido: true });
  assert.deepEqual(normalizarSubtitulo('[Final]'), { texto: '[Final]', reconhecido: true });
});

test('normalizarSubtitulo: "Fim" é sinônimo de "Final" (achado real, OUSADO AMOR) — sem isso, esperaCorpoAbaixo tratava a seção de fechamento como referência vazia', () => {
  assert.deepEqual(normalizarSubtitulo('[Fim]'), { texto: '[Final]', reconhecido: true });
});

test('normalizarSubtitulo: Verso e Ponte numerados normalizam via regex, não via tabela', () => {
  assert.deepEqual(normalizarSubtitulo('verso 1'), { texto: '[Verso 1]', reconhecido: true });
  assert.deepEqual(normalizarSubtitulo('PONTE2'), { texto: '[Ponte 2]', reconhecido: true });
});

test('normalizarSubtitulo: rótulo sem sinônimo conhecido é preservado como texto livre, não inventado', () => {
  assert.deepEqual(normalizarSubtitulo('Todos'), { texto: '[Todos]', reconhecido: false });
  assert.deepEqual(normalizarSubtitulo('[Turnaround] (Intro)'), { texto: '[Turnaround] (Intro)', reconhecido: false });
});

test('normalizarSubtitulo: "Volta na INTRO" não é resolvido aqui de propósito — fica livre, não vira [Intro]', () => {
  // Frase de referência: pertence à materialização de seção referenciada
  // (decisão b), não à normalização lexical de rótulo. Ver docstring da função.
  const resultado = normalizarSubtitulo('Volta na INTRO');
  assert.equal(resultado.reconhecido, false);
  assert.equal(resultado.texto, '[Volta na INTRO]');
});

test('normalizarSubtitulo: "estrofe_N" (separador _, achado real) é sinônimo de "Verso N"', () => {
  assert.deepEqual(normalizarSubtitulo('{estrofe_1}'), { texto: '[Verso 1]', reconhecido: true });
  assert.deepEqual(normalizarSubtitulo('{estrofe_2}'), { texto: '[Verso 2]', reconhecido: true });
});

test('normalizarSubtitulo: rótulo com "label:" seguido de cifra na mesma linha (caso real, ESTAMOS DE PÉ)', () => {
  assert.deepEqual(normalizarSubtitulo('Introdução: | A | % | Em7 | % | G | % | D | % |'), {
    texto: '[Intro] | A | % | Em7 | % | G | % | D | % |',
    reconhecido: true,
  });
});

test('normalizarSubtitulo: "{rótulo}" com cifra depois do fechamento vira "[Rótulo] cifra", espaço único', () => {
  assert.deepEqual(normalizarSubtitulo('{estrofe_1} | A | % | F#m7 | % | D | % | A | % |'), {
    texto: '[Verso 1] | A | % | F#m7 | % | D | % | A | % |',
    reconhecido: true,
  });
  assert.deepEqual(normalizarSubtitulo('{final}  | A | Em7 | D9 | A |'), {
    texto: '[Final] | A | Em7 | D9 | A |',
    reconhecido: true,
  });
});

test('normalizarSubtitulo: núcleo já canônico do formato-cifra.md permanece estável', () => {
  for (const rotulo of ['Refrão', 'Ponte', 'Rampa', 'Tag', 'Pré-refrão', 'Intro', 'Interlúdio', 'Modulação']) {
    assert.deepEqual(normalizarSubtitulo(`[${rotulo}]`), { texto: `[${rotulo}]`, reconhecido: true });
  }
});
