import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizarEspacamentoCompasso, expandirTabs } from '../src/normalizacao.ts';
import { classificarLinha } from '../src/linhas.ts';

test('normalizarEspacamentoCompasso: insere espaço em volta de | quando faltando (achado item 9)', () => {
  assert.equal(normalizarEspacamentoCompasso('|Am|G|F Dm7| Am'), '| Am | G | F Dm7 | Am');
});

test('normalizarEspacamentoCompasso: |: e :| continuam como token de dois caracteres', () => {
  assert.equal(normalizarEspacamentoCompasso('|:C F|Am'), '|: C F | Am');
  assert.equal(normalizarEspacamentoCompasso('Am|:C'), 'Am |: C');
});

test('normalizarEspacamentoCompasso: linha já bem espaçada volta idêntica (idempotente)', () => {
  for (const linha of [
    '| C | % | % | % | % |',
    '| Dm7 |  /  /  /  C/E |',
    '|: C F | Am G | Em F | Am G :|',
    '| Am | F | C | G |',
  ]) {
    assert.equal(normalizarEspacamentoCompasso(linha), linha);
  }
});

test('normalizarEspacamentoCompasso: não mexe em espaçamento que não é ao redor de barra', () => {
  assert.equal(normalizarEspacamentoCompasso('| Dm7 |  /  /  /  C/E |'), '| Dm7 |  /  /  /  C/E |');
});

test('normalizarEspacamentoCompasso: aplicar duas vezes é igual a aplicar uma (idempotência sobre o próprio resultado)', () => {
  const linha = '|Am|G|F Dm7| Am';
  const normalizada = normalizarEspacamentoCompasso(linha);
  assert.equal(normalizarEspacamentoCompasso(normalizada), normalizada);
});

test('expandirTabs: expande até a próxima parada de 8, não troca tab por espaço 1-por-1', () => {
  assert.equal(expandirTabs('a\tb'), 'a       b'); // tab em col1 -> próxima parada é col8
  assert.equal(expandirTabs('\tX'), '        X'); // tab em col0 -> parada em col8, 8 espaços
  assert.equal(expandirTabs('\t\tX'), '                X'); // duas paradas seguidas
});

test('expandirTabs: aceita largura de parada customizada', () => {
  assert.equal(expandirTabs('a\tb', 4), 'a   b');
});

test('expandirTabs: linha sem tab volta idêntica', () => {
  assert.equal(expandirTabs('sem tab nenhuma'), 'sem tab nenhuma');
});

test('expandirTabs: linha de acorde crua com tabs (achado real, ESTAMOS DE PÉ) expande de forma consistente', () => {
  const expandida = expandirTabs('\t    A\t\t      E');
  assert.equal(expandida, '            A                 E');
  assert.equal(expandida.indexOf('A'), 12);
  assert.ok(expandida.indexOf('E') > expandida.indexOf('A'));
});

test('normalizarEspacamentoCompasso: saída é aceita pelo parser de linhas (linha sem espaço quebra antes, funciona depois)', () => {
  assert.throws(() => classificarLinha('|Am|G|F Dm7| Am'));

  const normalizada = normalizarEspacamentoCompasso('|Am|G|F Dm7| Am');
  const linha = classificarLinha(normalizada);
  assert.equal(linha.tipo, 'cifra');
  if (linha.tipo !== 'cifra') throw new Error('unreachable');
  const textos = linha.itens.map((i) => (i.item.tipo === 'literal' ? i.item.texto : 'ACORDE'));
  assert.deepEqual(textos, ['|', 'ACORDE', '|', 'ACORDE', '|', 'ACORDE', 'ACORDE', '|', 'ACORDE']);
});
