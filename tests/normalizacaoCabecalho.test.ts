import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizarCabecalhoBruto } from '../src/normalizacaoCabecalho.ts';
import { parseCabecalho, obterCampo } from '../src/cabecalho.ts';

test('normalizarCabecalhoBruto: título solto + "Tom: X (qualificador)" (caso real, RENOVA-ME)', () => {
  const bruto = ['RENOVA-ME', 'Tom: Eb (masculino)', '', '[Verso]', '| Eb7M | Fm7 | Bb/D | Eb7M |'];
  const { cabecalho, resto } = normalizarCabecalhoBruto(bruto);
  assert.deepEqual(cabecalho, ['titulo: RENOVA-ME', 'tom: Eb', 'tessitura: masculino']);
  assert.deepEqual(resto, ['[Verso]', '| Eb7M | Fm7 | Bb/D | Eb7M |']);
});

test('normalizarCabecalhoBruto: cabeçalho canônico produzido é aceito por parseCabecalho, e tessitura fica recuperável', () => {
  const { cabecalho } = normalizarCabecalhoBruto(['RENOVA-ME', 'Tom: Eb (masculino)', '']);
  const parsed = parseCabecalho(cabecalho);
  assert.equal(obterCampo(parsed, 'titulo'), 'RENOVA-ME');
  assert.equal(obterCampo(parsed, 'tom'), 'Eb');
  assert.equal(obterCampo(parsed, 'tessitura'), 'masculino');
});

test('normalizarCabecalhoBruto: "TOM:" e "Tom:" normalizam para a mesma chave em minúsculo (resolve o achado item 10)', () => {
  assert.deepEqual(normalizarCabecalhoBruto(['X', 'TOM: C', '']).cabecalho, ['titulo: X', 'tom: C']);
  assert.deepEqual(normalizarCabecalhoBruto(['X', 'Tom: C', '']).cabecalho, ['titulo: X', 'tom: C']);
});

test('normalizarCabecalhoBruto: tom sem qualificador não inventa tessitura', () => {
  const { cabecalho } = normalizarCabecalhoBruto(['X', 'Tom: C', '']);
  assert.deepEqual(cabecalho, ['titulo: X', 'tom: C']);
});

test('normalizarCabecalhoBruto: aceita campos extras entre título e tom (ex.: artista)', () => {
  const { cabecalho, resto } = normalizarCabecalhoBruto(['X', 'Artista: Fulano', 'Tom: G', '', '[Intro]']);
  assert.deepEqual(cabecalho, ['titulo: X', 'artista: Fulano', 'tom: G']);
  assert.deepEqual(resto, ['[Intro]']);
});

test('normalizarCabecalhoBruto: sem linha em branco antes do corpo, para no primeiro que não é "chave: valor"', () => {
  const { cabecalho, resto } = normalizarCabecalhoBruto(['X', 'Tom: C', '[Intro]']);
  assert.deepEqual(cabecalho, ['titulo: X', 'tom: C']);
  assert.deepEqual(resto, ['[Intro]']);
});

test('normalizarCabecalhoBruto: título com travessão separa título e artista (caso real, ESTAMOS DE PÉ)', () => {
  const { cabecalho } = normalizarCabecalhoBruto(['ESTAMOS DE PÉ – MARCUS SALLES', 'TOM: A', '']);
  assert.deepEqual(cabecalho, ['titulo: ESTAMOS DE PÉ', 'artista: MARCUS SALLES', 'tom: A']);
});

test('normalizarCabecalhoBruto: hífen comum (não travessão) também separa título e artista', () => {
  const { cabecalho } = normalizarCabecalhoBruto(['TITULO - ARTISTA', 'Tom: C', '']);
  assert.deepEqual(cabecalho, ['titulo: TITULO', 'artista: ARTISTA', 'tom: C']);
});

test('normalizarCabecalhoBruto: hífen sem espaço ao redor não separa nada — é parte do título', () => {
  const { cabecalho } = normalizarCabecalhoBruto(['MEIA-NOITE', 'Tom: C', '']);
  assert.deepEqual(cabecalho, ['titulo: MEIA-NOITE', 'tom: C']);
});

test('normalizarCabecalhoBruto: consome todas as linhas em branco entre cabeçalho e corpo, não só uma (caso real)', () => {
  const { cabecalho, resto } = normalizarCabecalhoBruto(['X', 'TOM: A', '', '', 'Introdução: | A | % |']);
  assert.deepEqual(cabecalho, ['titulo: X', 'tom: A']);
  assert.deepEqual(resto, ['Introdução: | A | % |']);
});

test('normalizarCabecalhoBruto: artista em linha própria, sem travessão (caso real, OUSADO AMOR) — antes esse "Tom:" se perdia inteiro', () => {
  const { cabecalho, resto } = normalizarCabecalhoBruto(['OUSADO AMOR', 'ISAIAS SAAD', 'Tom: F', '', '']);
  assert.deepEqual(cabecalho, ['titulo: OUSADO AMOR', 'artista: ISAIAS SAAD', 'tom: F']);
  assert.deepEqual(resto, []);
});

test('normalizarCabecalhoBruto: linha após o título que já parece corpo (marcador "[") não vira artista por engano', () => {
  const { cabecalho, resto } = normalizarCabecalhoBruto(['X', '[Intro]', 'Tom: C']);
  assert.deepEqual(cabecalho, ['titulo: X']);
  assert.deepEqual(resto, ['[Intro]', 'Tom: C']);
});

test('normalizarCabecalhoBruto: linha em branco DENTRO do cabeçalho não encerra o cabeçalho (caso real, CANÇÃO DO CÉU) — antes o "tom" se perdia inteiro', () => {
  const { cabecalho, resto } = normalizarCabecalhoBruto(['CANÇÃO DO CÉU', '', '', 'Tom: E', '[Intro] | A | % |']);
  assert.deepEqual(cabecalho, ['titulo: CANÇÃO DO CÉU', 'tom: E']);
  assert.deepEqual(resto, ['[Intro] | A | % |']);
});

test('normalizarCabecalhoBruto: depois de uma linha em branco, só campo CONHECIDO continua o cabeçalho', () => {
  // A branca é o que hoje protege contra engolir letra que tem dois-pontos.
  // Tolerar a branca sem restringir a chave faria "Senhor: eu te amo" virar
  // campo de cabeçalho — por isso, depois da branca, a chave tem que ser uma
  // das conhecidas do formato.
  const { cabecalho, resto } = normalizarCabecalhoBruto(['X', '', 'Senhor: eu te amo', 'resto da letra']);
  assert.deepEqual(cabecalho, ['titulo: X']);
  assert.deepEqual(resto, ['Senhor: eu te amo', 'resto da letra']);
});

test('normalizarCabecalhoBruto: campo desconhecido ANTES de qualquer branca continua aceito (não restringe o que já funcionava)', () => {
  const { cabecalho } = normalizarCabecalhoBruto(['X', 'Tom: C', 'bpm: 72', '']);
  assert.deepEqual(cabecalho, ['titulo: X', 'tom: C', 'bpm: 72']);
});

test('normalizarCabecalhoBruto: tessitura entre parênteses sobrevive à branca no meio', () => {
  const { cabecalho } = normalizarCabecalhoBruto(['RENOVA-ME', '', 'Tom: Eb (masculino)', '', 'corpo']);
  assert.deepEqual(cabecalho, ['titulo: RENOVA-ME', 'tom: Eb', 'tessitura: masculino']);
});
