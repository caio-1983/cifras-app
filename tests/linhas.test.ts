import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classificarLinha } from '../src/linhas.ts';

test('linha vazia é separador', () => {
  assert.deepEqual(classificarLinha(''), { tipo: 'separador' });
  assert.deepEqual(classificarLinha('   '), { tipo: 'separador' });
});

test('subtítulo puro, sem cifra na mesma linha', () => {
  assert.deepEqual(classificarLinha('[Verso 1]'), { tipo: 'subtitulo', texto: '[Verso 1]' });
});

test('subtítulo com contagem de repetição (não é cifra)', () => {
  assert.deepEqual(classificarLinha('[Refrão] 2x'), { tipo: 'subtitulo', texto: '[Refrão] 2x' });
});

test('letra é a linha marcada com ">" (antes era "qualquer outra linha não vazia")', () => {
  assert.deepEqual(classificarLinha('>Ele é o Grande Eu Sou'), { tipo: 'letra', texto: 'Ele é o Grande Eu Sou' });
});

test('cifra pura, sem subtítulo', () => {
  const linha = classificarLinha('| Am | F | C | G |');
  assert.equal(linha.tipo, 'cifra');
  if (linha.tipo !== 'cifra') throw new Error('unreachable');
  assert.equal(linha.itens.length, 9); // | Am | F | C | G |
  assert.deepEqual(linha.itens[0], { coluna: 0, item: { tipo: 'literal', texto: '|' } });
  assert.deepEqual(linha.itens[1]!.item, {
    tipo: 'acorde',
    acorde: { raiz: { letra: 'A', acidente: 0 }, sufixo: 'm' },
    textoOriginal: 'Am',
  });
});

test('cifra com indentação (linha de continuação) preserva a coluna', () => {
  const linha = classificarLinha('        | Am | Dm G/B | C | Dm G |');
  assert.equal(linha.tipo, 'cifra');
  if (linha.tipo !== 'cifra') throw new Error('unreachable');
  assert.equal(linha.itens[0]!.coluna, 8);
});

test('subtítulo + cifra na mesma linha', () => {
  const linha = classificarLinha('[Intro] | C | Dm G/B | C | Dm G/B |');
  assert.equal(linha.tipo, 'cifra');
  if (linha.tipo !== 'cifra') throw new Error('unreachable');
  assert.deepEqual(linha.itens[0], { coluna: 0, item: { tipo: 'literal', texto: '[Intro]' } });
  assert.equal(linha.itens[1]!.coluna, 8); // "[Intro] " tem 8 caracteres
  assert.deepEqual(linha.itens[1]!.item, { tipo: 'literal', texto: '|' });
});

test('linha posicional separa o prefixo ~ do primeiro acorde', () => {
  const linha = classificarLinha('~Am        Em7       F7+');
  assert.equal(linha.tipo, 'posicional');
  if (linha.tipo !== 'posicional') throw new Error('unreachable');
  assert.deepEqual(linha.itens[0], { coluna: 0, item: { tipo: 'literal', texto: '~' } });
  assert.equal(linha.itens[1]!.coluna, 1);
  assert.deepEqual(linha.itens[1]!.item, {
    tipo: 'acorde',
    acorde: { raiz: { letra: 'A', acidente: 0 }, sufixo: 'm' },
    textoOriginal: 'Am',
  });
  assert.equal(linha.itens[2]!.coluna, 11);
  assert.equal(linha.itens[3]!.coluna, 21);
});

test('estruturas %, |:, :| e / isolado ficam como itens literais', () => {
  const linha = classificarLinha('|: Dm7 / C/E F |');
  assert.equal(linha.tipo, 'cifra');
  if (linha.tipo !== 'cifra') throw new Error('unreachable');
  const textos = linha.itens.map((i) => (i.item.tipo === 'literal' ? i.item.texto : 'ACORDE'));
  assert.deepEqual(textos, ['|:', 'ACORDE', '/', 'ACORDE', 'ACORDE', '|']);
});

test('acorde malformado dentro de linha de cifra lança erro', () => {
  assert.throws(() => classificarLinha('| Am | H7 |'));
});

test('anotação de execução entre chaves vira item literal único, mesmo com espaço interno', () => {
  const linha = classificarLinha('| Eb {dois ataques} | Gm7 |');
  assert.equal(linha.tipo, 'cifra');
  if (linha.tipo !== 'cifra') throw new Error('unreachable');
  const textos = linha.itens.map((i) => (i.item.tipo === 'literal' ? i.item.texto : 'ACORDE'));
  assert.deepEqual(textos, ['|', 'ACORDE', '{dois ataques}', '|', 'ACORDE', '|']);
});

test('anotação de execução funciona também em linha posicional', () => {
  const linha = classificarLinha('~Eb                  {dois ataques}');
  assert.equal(linha.tipo, 'posicional');
  if (linha.tipo !== 'posicional') throw new Error('unreachable');
  assert.deepEqual(linha.itens[2]!.item, { tipo: 'literal', texto: '{dois ataques}' });
});

test('linha que é só um rótulo entre chaves lança erro em vez de virar letra', () => {
  assert.throws(() => classificarLinha('{refrão}'), /rótulo de seção não convertido/);
  assert.throws(() => classificarLinha('  {solo}  '), /rótulo de seção não convertido/);
});

test('erro de rótulo entre chaves cita arquivo e linha quando o contexto é passado', () => {
  assert.throws(
    () => classificarLinha('{estrofe_1}', { numeroLinha: 12, nomeArquivo: 'so-tu-es-santo.cifra' }),
    /so-tu-es-santo\.cifra:12/,
  );
});

test('classificarLinha: linha de letra é marcada com ">" e o prefixo não entra no texto', () => {
  const linha = classificarLinha('>Ele é o Grande Eu Sou');
  assert.equal(linha.tipo, 'letra');
  assert.equal((linha as { texto: string }).texto, 'Ele é o Grande Eu Sou');
});

test('classificarLinha: o ">" fica na coluna 0, igual ao "~" — é o que faz o acorde bater com a sílaba na tela', () => {
  // Sem prefixo na letra, "~Am" põe o A na coluna 1 e "Sobre" o S na
  // coluna 0: o acorde SOA certo (o parser compensa o ~) mas aparece um
  // caractere à direita para quem confere à mão.
  const cifra = classificarLinha('~Am        Em7');
  const letra = classificarLinha('>Ele é o Grande');
  assert.equal(cifra.tipo, 'posicional');
  assert.equal((letra as { texto: string }).texto, 'Ele é o Grande');
});

test('classificarLinha: texto sem marcador nenhum é ERRO, não letra', () => {
  // O ganho da mudança: letra deixa de ser o "qualquer outra coisa" da
  // classificação. Um rótulo de seção não convertido, uma nota solta do
  // transcritor ou uma linha de cifra mal marcada param de virar letra da
  // música em silêncio.
  assert.throws(
    () => classificarLinha('Ele é o Grande Eu Sou', { nomeArquivo: 'x.cifra', numeroLinha: 7 }),
    /sem marcador.*x\.cifra:7/s,
  );
});

test('classificarLinha: letra que começa com ">" no conteúdo continua possível (o prefixo é só o primeiro)', () => {
  assert.equal((classificarLinha('>> vem, Senhor') as { texto: string }).texto, '> vem, Senhor');
});
