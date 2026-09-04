import { test } from 'node:test';
import assert from 'node:assert/strict';
import { materializarSecoesReferenciadas } from '../src/materializacaoSecoes.ts';
import { normalizarCabecalhoBruto } from '../src/normalizacaoCabecalho.ts';
import { normalizarSubtitulo } from '../src/sinonimosSubtitulo.ts';
import { expandirTabs } from '../src/normalizacao.ts';

test('materializarSecoesReferenciadas: seção vazia copia o corpo da ocorrência anterior de mesmo rótulo', () => {
  const linhas = ['[Refrão]', 'linha 1', 'linha 2', '', '[Ponte]', 'outra coisa', '', '[Refrão]', '', '[Final]'];
  const resultado = materializarSecoesReferenciadas(linhas);
  assert.deepEqual(resultado, [
    '[Refrão]',
    'linha 1',
    'linha 2',
    '',
    '[Ponte]',
    'outra coisa',
    '',
    '[Refrão]',
    'linha 1',
    'linha 2',
    '',
    '[Final]',
  ]);
});

test('materializarSecoesReferenciadas: não insere separador em branco duplicado quando já existe um', () => {
  const linhas = ['[Refrão]', 'conteúdo', '', '[Refrão]', '', '[Final]'];
  const resultado = materializarSecoesReferenciadas(linhas);
  assert.deepEqual(resultado, ['[Refrão]', 'conteúdo', '', '[Refrão]', 'conteúdo', '', '[Final]']);
});

test('materializarSecoesReferenciadas: rótulo com cifra própria (marcador não vazio) só recebe o corpo que falta', () => {
  // "[Verso 2] | A | ... |" tem cifra na própria linha do marcador — falta
  // só a letra, que é copiada da primeira ocorrência de "[Verso 2]".
  const linhas = ['[Verso 2] | A | % |', 'letra um', 'letra dois', '', '[Verso 2] | A | % |', '', '[Final]'];
  const resultado = materializarSecoesReferenciadas(linhas);
  assert.deepEqual(resultado, [
    '[Verso 2] | A | % |',
    'letra um',
    'letra dois',
    '',
    '[Verso 2] | A | % |',
    'letra um',
    'letra dois',
    '',
    '[Final]',
  ]);
});

test('materializarSecoesReferenciadas: rótulo instrumental (sem corpo esperado) nunca é tratado como vazio', () => {
  // "[Intro]"/"[Final]" não têm corpo por definição — não são "seção só
  // com indicação", são instrumentais, mesmo sem nada depois deles.
  const linhas = ['[Intro] | A | % |', '', '[Verso 1]', 'letra', '', '[Final] | A |'];
  const resultado = materializarSecoesReferenciadas(linhas);
  assert.deepEqual(resultado, linhas);
});

test('materializarSecoesReferenciadas: seção vazia sem ocorrência anterior lança erro claro', () => {
  const linhas = ['[Refrão]', '', '[Final]'];
  assert.throws(() => materializarSecoesReferenciadas(linhas), /"\[Refrão\]".*linha 1.*não há ocorrência anterior/s);
});

test('materializarSecoesReferenciadas: caso real completo (ESTAMOS DE PÉ) — Verso 2 e Refrão repetidos materializam certo', () => {
  const bruto = [
    'ESTAMOS DE PÉ – MARCUS SALLES',
    'TOM: A',
    '',
    '',
    'Introdução: | A | % | Em7 | % | G | % | D | % |',
    '',
    '{estrofe_1} | A | % | F#m7 | % | D | % | A | % |',
    'Pressionados, mas não desanimados',
    'Perplexos, mas não desesperados',
    'Estamos de pé',
    '',
    '{estrofe_2} | A | % | F#m7 | % | D | % | A | % |',
    'Perseguidos, mas não abandonados',
    'Abatidos, mas não destruídos',
    'Estamos de pé',
    '',
    '{refrão}',
    '\t    A\t\t      E',
    'Não caminhamos pelo que vemos',
    '          \t   Bm    A/C#       D',
    'O que nos move, é o que nos cremos',
    '',
    '{estrofe_2} | A | % | F#m7 | % | D | % | A | % |',
    '{refrão}',
    '',
    '{ponte}  | A | % | Em7 | % | G | % | D | % |',
    'A perseguição não parou a igreja',
    '',
    '{refrão}',
    '{final}  | A | Em7 | D9 | A |',
  ];

  const { resto } = normalizarCabecalhoBruto(bruto);

  const candidataASubtitulo = (linha: string): boolean => {
    const t = linha.trim();
    return t.startsWith('{') || t.startsWith('[') || /^[^:{}[\]]+:/.test(t);
  };
  const processado = resto.map((linha) =>
    candidataASubtitulo(linha) ? normalizarSubtitulo(linha).texto : linha.includes('\t') ? expandirTabs(linha) : linha,
  );

  const materializado = materializarSecoesReferenciadas(processado);

  // segunda ocorrência de [Verso 2]: mantém a cifra própria, ganha a letra
  const idxVerso2Repetido = materializado.indexOf('[Verso 2] | A | % | F#m7 | % | D | % | A | % |', 5);
  assert.deepEqual(materializado.slice(idxVerso2Repetido, idxVerso2Repetido + 4), [
    '[Verso 2] | A | % | F#m7 | % | D | % | A | % |',
    'Perseguidos, mas não abandonados',
    'Abatidos, mas não destruídos',
    'Estamos de pé',
  ]);

  // refrão repetido duas vezes: as duas materializam com o mesmo corpo de 4 linhas (tab já expandido)
  const ocorrenciasRefrao = materializado.reduce<number[]>((acc, l, i) => (l === '[Refrão]' ? [...acc, i] : acc), []);
  assert.equal(ocorrenciasRefrao.length, 3);
  const corpoOriginal = materializado.slice(ocorrenciasRefrao[0]! + 1, ocorrenciasRefrao[0]! + 5);
  assert.equal(corpoOriginal.length, 4);
  assert.deepEqual(materializado.slice(ocorrenciasRefrao[1]! + 1, ocorrenciasRefrao[1]! + 5), corpoOriginal);
  assert.deepEqual(materializado.slice(ocorrenciasRefrao[2]! + 1, ocorrenciasRefrao[2]! + 5), corpoOriginal);

  // [Ponte] e [Final] nunca são tocados
  assert.ok(materializado.includes('[Ponte] | A | % | Em7 | % | G | % | D | % |'));
  assert.equal(materializado.at(-1), '[Final] | A | Em7 | D9 | A |');
});

test('materializarSecoesReferenciadas: roteiro de execução (corrida de marcadores com cifra própria) nunca é materializado — caso real, EU VOU CONSTRUIR', () => {
  // Achado real: 10 dos 73 arquivos do acervo terminam com a ORDEM em que
  // as seções são tocadas, cada linha com a cifra de lembrete. Não são
  // repetições de seção — materializar a letra ali viraria 3 linhas de
  // roteiro em ~30 de letra duplicada. Decisão do usuário: preservar.
  const linhas = [
    '[Verso 1]',
    '| D | G7M |',
    'Digno desta canção',
    '',
    '[Refrão]',
    '| G7M | Em7 |',
    'Santo, és incomparável',
    '',
    '[Intro] | D  A | G |',
    '[Verso 1] | D/F# | G7M |',
    '[Refrão 2x] | G7M | Em7 |',
  ];
  assert.deepEqual(materializarSecoesReferenciadas(linhas), linhas);
});

test('materializarSecoesReferenciadas: seção instrumental com cifra na própria linha e sem ocorrência anterior não é erro — caso real, TE LOUVAREI', () => {
  // "[Rampa] | F/A Bb | C |" é uma seção completa: a cifra está na linha do
  // marcador. Antes, "Rampa" esperava corpo abaixo, o corpo vazio a fazia
  // parecer referência, e não havendo ocorrência anterior o importador
  // derrubava o arquivo inteiro. Vale para Solo/Instrumental/Turnaround
  // também, que aparecem do mesmo jeito no acervo.
  // Estrutura do arquivo real: o "[Rampa]" está ISOLADO entre uma seção com
  // letra e um "[Refrão]" normal — não é corrida de roteiro, então é a regra
  // "trouxe a própria cifra, logo é seção completa" que tem de segurá-lo.
  const linhas = [
    '[Verso 1]',
    '| F/C | % |',
    'Não sou apenas servo',
    '',
    '[Rampa] | F/A Bb | C |',
    '',
    '[Refrão]',
    '| F F/A | Bb |',
    'Te louvarei',
  ];
  assert.deepEqual(materializarSecoesReferenciadas(linhas), linhas);
});

test('materializarSecoesReferenciadas: marcador nu, sem cifra nenhuma e sem ocorrência anterior, CONTINUA sendo erro', () => {
  // O comportamento que o caso TU ÉS BOM estabeleceu como certo: falhar
  // alto em vez de adivinhar. Um marcador que não traz nada é referência
  // de verdade, e sem origem para copiar o arquivo tem que ser recusado.
  assert.throws(
    () => materializarSecoesReferenciadas(['[Verso 1]', 'letra', '', '[Refrão]', '']),
    /seção "\[Refrão\]".*não há ocorrência anterior/,
  );
});

test('materializarSecoesReferenciadas: cifra própria NÃO impede materialização quando há ocorrência anterior com corpo (o caso Verso 2 continua valendo)', () => {
  const linhas = ['[Verso 2] | A | % |', 'letra um', '', '[Verso 2] | A | % |', '', '[Final]'];
  assert.deepEqual(materializarSecoesReferenciadas(linhas), [
    '[Verso 2] | A | % |',
    'letra um',
    '',
    '[Verso 2] | A | % |',
    'letra um',
    '',
    '[Final]',
  ]);
});
