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
  assert.equal(texto, 'titulo: X\ntom: C\n---\n[Verso 1]\n~C          G\n>sílaba tônica aqui\n');
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

test('importarCifraCrua: barra colada no acorde é espaçada (achado item 9, caso real EU VOU CONSTRUIR: "| Bm7 |D/F# |")', () => {
  const cru = ['EU VOU CONSTRUIR – JULIANO SON', 'TOM: D', '', '{ponte}         | G7M | A | Bm7 |D/F# |', 'Eu vou construir'].join('\n');
  const cifra = importarCifraCrua(cru, 'eu-vou-construir.cifra');
  assert.ok(cifra.includes('[Ponte] | G7M | A | Bm7 | D/F# |'), cifra);
});

test('importarCifraCrua: linha POSICIONAL nunca é reespaçada — inserir espaço ali move o acorde de sílaba', () => {
  // O híbrido do achado item 2: barras alinhadas à sílaba, não divisão de
  // compasso. Normalizar espaçamento aqui destruiria o alinhamento, que é o
  // conteúdo da linha.
  const posicional = '~                       | Cm |         | Bb |';
  const cru = ['UM SÓ', 'Tom: Cm', '', posicional, 'Ele é a ressurreição e a vida'].join('\n');
  const cifra = importarCifraCrua(cru, 'um-so.cifra');
  assert.ok(cifra.includes(posicional), cifra);
});

test('importarCifraCrua: acorde colado a outro é RECUSADO, não importado como acorde inventado (caso real, EU E MINHA CASA)', () => {
  // O documento tem "| A | B |C#Bm7 | EGF# |": dois e três acordes grudados
  // sem espaço. Normalizar o espaçamento ao redor da barra separa "|" de
  // "C#Bm7", e aí o sufixo opaco do parser aceita "Bm7" como sufixo de C# —
  // importaria limpo um acorde que não existe. Nenhum sufixo do acervo
  // validado (673 acordes, 10 sufixos) começa com maiúscula A-G, então isso
  // é sempre acorde grudado: falhar alto e mandar para curadoria.
  const cru = ['EU E MINHA CASA', 'Tom: E', '', '[Intro] | A | B |C#Bm7 | EGF# |'].join('\n');
  assert.throws(
    () => importarCifraCrua(cru, 'eu-e-minha-casa.cifra'),
    /C#Bm7.*grudado|grudado.*C#Bm7/i,
  );
});

test('importarCifraCrua: sufixo legítimo do acervo continua passando (não é o mesmo que grudado)', () => {
  const cru = ['X', 'Tom: C', '', '[Intro] | Ab7M | F#m7(5-) | Gm7(11) | C/E | Dm7/A |'].join('\n');
  const cifra = importarCifraCrua(cru, 'x.cifra');
  assert.ok(cifra.includes('| Ab7M | F#m7(5-) | Gm7(11) | C/E | Dm7/A |'), cifra);
});

test('importarCifraCrua: "2x" e "pausa" viram anotação {…} no lugar de derrubar o arquivo (61 arquivos do acervo)', () => {
  const cru = ['MEU ABRIGO', 'Tom: A', '', '[Interlúdio] | A | A | D | D | 2x', '| pausa | pausa | Em | % |'].join('\n');
  const cifra = importarCifraCrua(cru, 'meu-abrigo.cifra');
  assert.ok(cifra.includes('[Interlúdio] | A | A | D | D | {2x}'), cifra);
  assert.ok(cifra.includes('| {pausa} | {pausa} | Em | % |'), cifra);
});

test('importarCifraCrua: linha posicional com "2x" não é anotada — falha alto e vai para curadoria', () => {
  // As chaves acrescentam dois caracteres. Numa linha `~` isso empurraria
  // todos os itens seguintes para fora da sílaba, então a anotação
  // automática não roda aqui. Consequência assumida: um `2x` dentro de
  // linha posicional derruba o arquivo, em vez de ser corrigido no chute.
  //
  // Refinamento possível, deixado de fora por falta de evidência: se o
  // token for o ÚLTIMO da linha, envolvê-lo não moveria nada. Não há
  // nenhum caso assim nos 421 — construir a exceção agora seria desenhar
  // para um arquivo que não existe.
  const cru = ['X', 'Tom: Am', '', '~Am        Em7       F7+    2x', 'Ele é o Grande Eu Sou'].join('\n');
  assert.throws(() => importarCifraCrua(cru, 'x.cifra'), /nota inválida: "2x"/);
});

test('importarCifraCrua: opção "tom" preenche o cabeçalho só quando o documento não traz nenhum', () => {
  const semTom = ['A MAIOR HONRA', '', '[Intro] | Ab | Eb |'].join('\n');
  assert.ok(importarCifraCrua(semTom, 'a-maior-honra.cifra', { tom: 'Ab' }).includes('tom: Ab'));
});

test('importarCifraCrua: o documento manda — a opção nunca sobrepõe o tom declarado', () => {
  // O nome do arquivo é metadado editorial e pode estar desatualizado; o
  // corpo é a cifra de verdade. Deixar a opção ganhar corromperia toda
  // transposição futura de um arquivo que estava certo.
  const comTom = ['X', 'Tom: C', '', '[Intro] | C | G |'].join('\n');
  const cifra = importarCifraCrua(comTom, 'x.cifra', { tom: 'Ab' });
  assert.ok(cifra.includes('tom: C'), cifra);
  assert.ok(!cifra.includes('tom: Ab'), cifra);
});

test('importar: linha que abre com acorde e depois compasso não vira letra cantada', () => {
  // Regressão silenciosa achada medindo o acervo do Drive: 110 linhas em 62
  // dos 377 arquivos entravam como texto cantado porque não COMEÇAVAM com
  // "|". O arquivo importava "limpo" e estava errado — a pior forma de erro
  // deste projeto.
  const cru = ['A CASA É SUA', 'Tom: G', '', '[Verso 1]', 'C9                | G | G4  G |', 'A casa é Sua'].join('\n');
  const musica = parseMusica(importarCifraCrua(cru, 'a-casa-e-sua.txt'), 'a-casa-e-sua.txt');
  const cantadas = musica.corpo.filter((l) => l.tipo === 'letra');
  assert.deepEqual(
    cantadas.map((l) => (l as { texto: string }).texto),
    ['A casa é Sua'],
  );
  const cifras = musica.corpo.filter((l) => l.tipo === 'cifra');
  assert.equal(cifras.length, 1);
  const acordes = (cifras[0] as { itens: { item: { tipo: string; textoOriginal?: string } }[] }).itens
    .filter((i) => i.item.tipo === 'acorde')
    .map((i) => i.item.textoOriginal);
  assert.deepEqual(acordes, ['C9', 'G', 'G4', 'G']);
});

test('importar: rótulo de seção grudado na cifra sai como subtítulo, não como acorde inválido', () => {
  const cru = ['CANÇÃO', 'Tom: F', '', 'INTRODUÇÃO                |: F | C :|'].join('\n');
  const texto = importarCifraCrua(cru, 'cancao.txt');
  assert.ok(texto.includes('[Intro] |: F | C :|'), texto);
});
