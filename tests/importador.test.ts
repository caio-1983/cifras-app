import { test } from 'node:test';
import assert from 'node:assert/strict';
import { importarCifraCrua } from '../src/importador.ts';
import { parseMusica } from '../src/index.ts';
import { obterCampo } from '../src/cabecalho.ts';

// Caso real: conteúdo exportado como texto puro de um Google Doc que veio
// da conversão em massa dos .docx do acervo (docs/scripts/converter-cifras.gs.js).
// BOM no início, quebra de linha \r\n, espaço sobrando no fim das linhas
// de cifra, e duas linhas em branco entre blocos (espaçamento de
// parágrafo do Word) — tudo isso é achado real, não hipotético.
const SANTO_ESPIRITO_LINHAS = [
  '﻿SANTO ESPÍRITO',
  'TOM: E',
  '',
  '',
  '[Intro]         |: E | % | A | % :| ',
  '',
  '',
  '[Verso]',
  '|: E | % | A | % :| ',
  'Não há nada igual, não há nada melhor',
  'A que se comparar, esperança viva',
  'Tua presença',
  '',
  '',
  'Eu provei e vi o mais doce amor',
  'Que liberta ao meu ser e a vergonha desfaz',
  'Tua presença',
  '',
  '',
  '[Refrão]',
  '|: E | % | A | F#m7 :| ',
  'Santo espírito, és bem-vindo aqui',
  'Vem inundar, encher esse lugar',
  'É o desejo do meu coração',
  'Sermos inundados por tua glória, Senhor',
  '',
  '',
  '[Verso]',
  '|: E | % | A | % :| ',
  'Não há nada igual, não há nada melhor',
  'A que se comparar, esperança viva',
  'Tua presença',
  '',
  '',
  'Eu provei e vi o mais doce amor',
  'Que liberta ao meu ser e a vergonha desfaz',
  'Tua presença',
  '',
  '',
  '[Refrão]',
  '|: E | % | A | F#m7 :| ',
  'Santo espírito, és bem-vindo aqui',
  'Vem inundar, encher esse lugar',
  'É o desejo do meu coração',
  'Sermos inundados por tua glória, Senhor',
  '',
  '',
  '[Interlúdio]        |: F | % | Bb | % :|',
  '',
  '',
  '[Ponte]                | A E/G# | F#m7 E/G# |',
  'Vamos provar quão real é tua presença',
  'Vamos provar da tua glória e bondade ',
  '',
  '',
  '| B | % |',
  'Senhor!',
];
const SANTO_ESPIRITO_CRU = SANTO_ESPIRITO_LINHAS.join('\r\n');

const ESTAMOS_DE_PE_CRU = [
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
].join('\n');

test('importarCifraCrua: caso real completo (ESTAMOS DE PÉ) parseia sem erro e produz AST correto', () => {
  const texto = importarCifraCrua(ESTAMOS_DE_PE_CRU, 'estamos-de-pe.cifra');
  const musica = parseMusica(texto, 'estamos-de-pe.cifra');

  assert.equal(obterCampo(musica.cabecalho, 'titulo'), 'ESTAMOS DE PÉ');
  assert.equal(obterCampo(musica.cabecalho, 'artista'), 'MARCUS SALLES');
  assert.equal(obterCampo(musica.cabecalho, 'tom'), 'A');

  // "[Refrão]" sozinho (sem cifra na mesma linha) vira tipo "subtitulo" de
  // verdade; "[Verso 2]"/"[Ponte]"/"[Final]" têm cifra na própria linha do
  // marcador, então classificarLinha os trata como tipo "cifra" (rótulo
  // como item literal + acordes) — comportamento documentado, não é
  // subtítulo puro. Checa cada forma pelo tipo certo.
  const subtitulosPuros = musica.corpo.filter((l) => l.tipo === 'subtitulo').map((l) => (l as { texto: string }).texto);
  assert.deepEqual(subtitulosPuros, ['[Refrão]', '[Refrão]', '[Refrão]']);

  assert.ok(texto.includes('[Verso 2] | A | % | F#m7 | % | D | % | A | % |'));
  assert.ok(texto.includes('[Ponte] | A | % | Em7 | % | G | % | D | % |'));
  assert.ok(texto.includes('[Final] | A | Em7 | D9 | A |'));

  // as três ocorrências de [Refrão] materializaram corpo idêntico, e a
  // primeira linha de cifra do refrão (originalmente com tab) virou
  // posicional (marcada com "~") — prova que expandirTabs +
  // marcarLinhasPosicionaisCruas + materializarSecoesReferenciadas
  // funcionaram encadeados, na ordem certa.
  const indicesRefrao = musica.corpo.reduce<number[]>(
    (acc, l, i) => (l.tipo === 'subtitulo' && l.texto === '[Refrão]' ? [...acc, i] : acc),
    [],
  );
  assert.equal(indicesRefrao.length, 3);
  for (const idx of indicesRefrao) {
    const linhaCifra = musica.corpo[idx + 1]!;
    assert.equal(linhaCifra.tipo, 'posicional');
  }
});

test('importarCifraCrua: linha de letra com dois pontos não vira subtítulo falso', () => {
  const bruto = ['X', 'Tom: C', '', '[Verso 1]', 'Ele disse: eu vou', '| C | G |'].join('\n');
  const texto = importarCifraCrua(bruto, 'teste.cifra');
  const musica = parseMusica(texto, 'teste.cifra');
  const letra = musica.corpo.find((l) => l.tipo === 'letra');
  assert.ok(letra);
  assert.equal((letra as { texto: string }).texto, 'Ele disse: eu vou');
});

test('importarCifraCrua: cabeçalho cru com qualificador de tessitura (RENOVA-ME) sobrevive ao pipeline inteiro', () => {
  const bruto = ['RENOVA-ME', 'Tom: Eb (masculino)', '', '[Verso]', '| Eb7M | Fm7 | Bb/D | Eb7M |'].join('\n');
  const texto = importarCifraCrua(bruto, 'renova-me.cifra');
  const musica = parseMusica(texto, 'renova-me.cifra');
  assert.equal(obterCampo(musica.cabecalho, 'titulo'), 'RENOVA-ME');
  assert.equal(obterCampo(musica.cabecalho, 'tom'), 'Eb');
  assert.equal(obterCampo(musica.cabecalho, 'tessitura'), 'masculino');
});

test('importarCifraCrua: rótulo de subtítulo desconhecido em forma "[...]" é preservado como rótulo livre', () => {
  const bruto = ['X', 'Tom: C', '', '[Turnaround]', '| C | G |'].join('\n');
  const texto = importarCifraCrua(bruto, 'teste.cifra');
  const musica = parseMusica(texto, 'teste.cifra');
  const subtitulo = musica.corpo.find((l) => l.tipo === 'subtitulo');
  assert.equal((subtitulo as { texto: string }).texto, '[Turnaround]');
});

test('importarCifraCrua: cifra normalizada bate exatamente com o formato canônico (round-trip textual)', () => {
  const bruto = ['X', 'Tom: C', '', '[Verso 1]', '~C          G', 'sílaba tônica aqui'].join('\n');
  const texto = importarCifraCrua(bruto, 'teste.cifra');
  assert.equal(texto, 'titulo: X\ntom: C\n---\n[Verso 1]\n~C          G\nsílaba tônica aqui\n');
});

test('importarCifraCrua: caso real do Drive (SANTO ESPÍRITO) — BOM, \\r\\n, espaço no fim de linha e linha em branco duplicada, tudo limpo', () => {
  const texto = importarCifraCrua(SANTO_ESPIRITO_CRU, 'santo-espirito.cifra');
  const musica = parseMusica(texto, 'santo-espirito.cifra');

  assert.equal(obterCampo(musica.cabecalho, 'titulo'), 'SANTO ESPÍRITO');
  assert.equal(obterCampo(musica.cabecalho, 'tom'), 'E');

  // BOM não sobrou grudado no título
  assert.equal(texto.charCodeAt(0), 't'.charCodeAt(0));

  // nenhuma linha do resultado final tem \r nem espaço/tab sobrando no fim
  for (const linha of texto.split('\n')) {
    assert.ok(!linha.includes('\r'), `linha com \\r sobrando: ${JSON.stringify(linha)}`);
    assert.equal(linha, linha.replace(/[ \t]+$/, ''), `linha com espaço sobrando no fim: ${JSON.stringify(linha)}`);
  }

  // nunca duas linhas em branco seguidas
  assert.ok(!texto.includes('\n\n\n'));

  // [Verso] e [Refrão] já vinham com corpo completo nas duas ocorrências
  // (não precisam de materialização) — continuam com o corpo próprio,
  // idêntico entre as repetições
  const versos = musica.corpo.reduce<number[]>(
    (acc, l, i) => (l.tipo === 'subtitulo' && l.texto === '[Verso]' ? [...acc, i] : acc),
    [],
  );
  assert.equal(versos.length, 2);
});

// Caso real: OUSADO AMOR — artista em linha própria sem travessão ("OUSADO
// AMOR" / "ISAIAS SAAD" / "Tom: F") e seção de fechamento rotulada "[Fim]",
// não "[Final]". Achou dois bugs reais na primeira tentativa: o "Tom:"
// inteiro se perdia (virava linha de corpo), e "[Fim]" sem corpo abaixo
// disparava erro de materialização por não ser reconhecido como
// instrumental. Os dois foram corrigidos no núcleo do importador
// (normalizacaoCabecalho.ts e sinonimosSubtitulo.ts), não contornados
// aqui.
const OUSADO_AMOR_CRU = [
  '﻿OUSADO AMOR',
  'ISAIAS SAAD',
  'Tom: F',
  '',
  '',
  '[Intro] | Dm | C4 C | Bb9 | F |',
  '',
  '',
  '| Dm | C4 C | Bb9 | F |',
  'Antes de eu falar tu cantavas sobre mim',
  'Tu tens sido tão, tão bom pra mim',
  '',
  '',
  '[Refrão]',
  '| Dm | C4 C | Bb9 | F |',
  'Oh, impressionante, infinito e ousado amor de Deus',
  '',
  '',
  '[Fim]                | Dm | C4 C | Bb9 | F |',
].join('\r\n');

test('importarCifraCrua: caso real do Drive (OUSADO AMOR) — artista em linha própria sem travessão, e "[Fim]" reconhecido como "[Final]"', () => {
  const texto = importarCifraCrua(OUSADO_AMOR_CRU, 'ousado-amor.cifra');
  const musica = parseMusica(texto, 'ousado-amor.cifra');

  assert.equal(obterCampo(musica.cabecalho, 'titulo'), 'OUSADO AMOR');
  assert.equal(obterCampo(musica.cabecalho, 'artista'), 'ISAIAS SAAD');
  assert.equal(obterCampo(musica.cabecalho, 'tom'), 'F');

  assert.ok(texto.includes('[Final] | Dm | C4 C | Bb9 | F |'));
  assert.ok(!texto.includes('[Fim]'));
});
