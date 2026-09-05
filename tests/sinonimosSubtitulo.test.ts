import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizarSubtitulo, esperaCorpoAbaixo } from '../src/sinonimosSubtitulo.ts';

test('normalizarSubtitulo: variantes de Intro fora de colchete (achado item 3)', () => {
  assert.deepEqual(normalizarSubtitulo('INTRO'), { texto: '[Intro]', reconhecido: true });
  assert.deepEqual(normalizarSubtitulo('Introdução:'), { texto: '[Intro]', reconhecido: true });
  assert.deepEqual(normalizarSubtitulo('{intro}'), { texto: '[Intro]', reconhecido: true });
});

test('normalizarSubtitulo: "[Só piano]" é preservado, não vira "[Solo]" — diz qual instrumento toca', () => {
  // O arquivo curado à mão (musicas/ruja-o-leao.cifra) preserva "[Só
  // piano]". Normalizar para "[Solo]" jogaria fora informação de arranjo.
  assert.deepEqual(normalizarSubtitulo('[Só piano]'), { texto: '[Só piano]', reconhecido: false });
});

test('normalizarSubtitulo: Solo bate por variantes lexicalmente diferentes (solo)', () => {
  assert.deepEqual(normalizarSubtitulo('{solo}'), { texto: '[Solo]', reconhecido: true });
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

test('esperaCorpoAbaixo: rótulo instrumental com qualificador é reconhecido pela base (caso real, RUJA O LEÃO)', () => {
  // "[Intro teclado]" sozinho, seguido de "[Intro todos FORTE] | Am |...",
  // é como o próprio usuário curou musicas/ruja-o-leao.cifra à mão. Só
  // olhando o rótulo inteiro, "Intro teclado" não batia com "Intro" e o
  // importador recusava um arquivo que já estava certo.
  assert.equal(esperaCorpoAbaixo('[Intro teclado]'), false);
  assert.equal(esperaCorpoAbaixo('[Intro todos FORTE]'), false);
  assert.equal(esperaCorpoAbaixo('[Intro 2X]'), false);
  assert.equal(esperaCorpoAbaixo('[Final da música]'), false);
});

test('esperaCorpoAbaixo: seção com letra continua esperando corpo, mesmo com qualificador', () => {
  // O contraponto que não pode ceder: em TU ÉS BOM o "{refrão}" vazio
  // também vem seguido de outro marcador, e ali falhar alto é o certo —
  // foi resolvido com curadoria humana, não com código.
  assert.equal(esperaCorpoAbaixo('[Refrão]'), true);
  assert.equal(esperaCorpoAbaixo('[Refrão Final]'), true);
  assert.equal(esperaCorpoAbaixo('[Verso 2]'), true);
  assert.equal(esperaCorpoAbaixo('[Ponte]'), true);
});

test('normalizarSubtitulo: "refrão_2x" (achado real, REINA / DOCE NOME) vira "[Refrão 2x]"', () => {
  // O separador "_" já era reconhecido para "estrofe_1", mas só antes de
  // NÚMERO. Aqui o que vem depois é contagem de repetição, e sem isso o
  // rótulo ficava "[refrão_2x]" — minúsculo, irreconhecível, e sem casar
  // com o "[Refrão]" anterior na hora de materializar.
  assert.deepEqual(normalizarSubtitulo('{refrão_2x}'), { texto: '[Refrão 2x]', reconhecido: true });
  assert.deepEqual(normalizarSubtitulo('{refrão-2x}'), { texto: '[Refrão 2x]', reconhecido: true });
  assert.deepEqual(normalizarSubtitulo('[ponte_2X]'), { texto: '[Ponte 2X]', reconhecido: true });
});

test('normalizarSubtitulo: "pré-refrão" continua batendo antes de "refrão" (o hífen dele é do nome)', () => {
  assert.deepEqual(normalizarSubtitulo('{pré-refrão}'), { texto: '[Pré-refrão]', reconhecido: true });
  assert.deepEqual(normalizarSubtitulo('{pre-refrao_2x}'), { texto: '[Pré-refrão 2x]', reconhecido: true });
});

test('rótulo sem dois pontos, colado na cifra da mesma linha, vira subtítulo', () => {
  // Forma real do acervo: "INTRODUÇÃO                |: F | C | ... :|".
  // A variante com dois pontos já era reconhecida; esta não, e por isso o
  // rótulo ia parar dentro da linha de cifra, onde "INTRODUÇÃO" não parseia
  // como acorde e derruba o arquivo inteiro.
  const r = normalizarSubtitulo('INTRODUÇÃO                |: F | C | Em | Am :|');
  assert.equal(r.reconhecido, true);
  assert.equal(r.texto, '[Intro] |: F | C | Em | Am :|');
});

test('linha de cifra que abre com acorde NÃO vira subtítulo', () => {
  // O mesmo formato — texto, espaços, compasso — mas "C9" não é sinônimo
  // de seção nenhuma. É o que impede a regra acima de comer cifra: quem
  // decide é o vocabulário, não a forma da linha.
  const r = normalizarSubtitulo('C9                | G | G4  G |');
  assert.equal(r.reconhecido, false);
});
