import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCabecalho, formatarCabecalho, obterCampo, comCampoAtualizado } from '../src/cabecalho.ts';

test('parseCabecalho lê campos na ordem original', () => {
  const linhas = ['titulo: O GRANDE EU SOU', 'artista: Nazareno', 'tom: C', 'momento: adoracao'];
  const cabecalho = parseCabecalho(linhas);
  assert.deepEqual(cabecalho.campos, [
    { chave: 'titulo', valor: 'O GRANDE EU SOU' },
    { chave: 'artista', valor: 'Nazareno' },
    { chave: 'tom', valor: 'C' },
    { chave: 'momento', valor: 'adoracao' },
  ]);
});

test('parseCabecalho aceita artista e momento ausentes', () => {
  const cabecalho = parseCabecalho(['titulo: X', 'tom: G']);
  assert.equal(obterCampo(cabecalho, 'titulo'), 'X');
  assert.equal(obterCampo(cabecalho, 'tom'), 'G');
  assert.equal(obterCampo(cabecalho, 'artista'), undefined);
});

test('parseCabecalho exige titulo e tom', () => {
  assert.throws(() => parseCabecalho(['artista: X']));
  assert.throws(() => parseCabecalho(['titulo: X']));
});

test('comCampoAtualizado troca o valor de um campo sem mudar a ordem', () => {
  const original = parseCabecalho(['titulo: X', 'artista: Y', 'tom: C', 'momento: adoracao']);
  const atualizado = comCampoAtualizado(original, 'tom', 'D');
  assert.deepEqual(atualizado.campos, [
    { chave: 'titulo', valor: 'X' },
    { chave: 'artista', valor: 'Y' },
    { chave: 'tom', valor: 'D' },
    { chave: 'momento', valor: 'adoracao' },
  ]);
});

test('formatarCabecalho reconstrói as linhas originais', () => {
  const linhas = ['titulo: O GRANDE EU SOU', 'artista: Nazareno', 'tom: C', 'momento: adoracao'];
  assert.deepEqual(formatarCabecalho(parseCabecalho(linhas)), linhas);
});
