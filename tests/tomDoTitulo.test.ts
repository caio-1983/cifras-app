import { test } from 'node:test';
import assert from 'node:assert/strict';
import { tomDoTituloDrive } from '../src/tomDoTitulo.ts';

test('tomDoTituloDrive: títulos reais dos 18 arquivos sem tom no corpo', () => {
  assert.equal(tomDoTituloDrive('A MAIOR HONRA_Ab'), 'Ab');
  assert.equal(tomDoTituloDrive('CAMINHO NO DESERTO - TOM_G'), 'G');
  assert.equal(tomDoTituloDrive('DEUS, SOMENTE DEUS_TOM_A'), 'A');
  assert.equal(tomDoTituloDrive('EIS-ME AQUI_DT_TOM_G'), 'G');
  assert.equal(tomDoTituloDrive('EU VOU SEGUIR COM FÉ_D_Eli_Soares'), 'D');
  assert.equal(tomDoTituloDrive('Não Seremos Abalados_D_Feminino'), 'D');
  assert.equal(tomDoTituloDrive('SUBLIME_C_masculino'), 'C');
  assert.equal(tomDoTituloDrive('Sublime_D_original'), 'D');
  assert.equal(tomDoTituloDrive('RIO DE VIDA - TOM_G'), 'G');
  assert.equal(tomDoTituloDrive('NADA ALÉM DO SANGUE+PRA SEMPRE+OH QUÃO LINDO ESSE NOME É_Bb_Masculino'), 'Bb');
});

test('tomDoTituloDrive: título sem tom devolve undefined, não um chute', () => {
  for (const t of ['ELE VEM', 'Filho do Deus Vivo', 'QUE AMOR É ESSE', 'TEM TUDO A VER COM ELE', 'TEMOS QUE SER UM']) {
    assert.equal(tomDoTituloDrive(t), undefined, t);
  }
});

test('tomDoTituloDrive: "A" de artigo dentro do título nunca vira tom de Lá', () => {
  // A armadilha: quebrar em espaço acharia "A" em "A MAIOR HONRA" e daria
  // um tom errado com toda a aparência de estar certo.
  assert.equal(tomDoTituloDrive('A BOA PARTE'), undefined);
  assert.equal(tomDoTituloDrive('A CASA É SUA'), undefined);
  assert.equal(tomDoTituloDrive("Canta Minh'Alma_Que Segurança"), undefined);
});

test('tomDoTituloDrive: dois candidatos diferentes é ambiguidade, não escolha', () => {
  assert.equal(tomDoTituloDrive('MEDLEY_C_E'), undefined);
});

test('tomDoTituloDrive: tom menor e acidentes', () => {
  assert.equal(tomDoTituloDrive('RUJA O LEÃO_Am'), 'Am');
  assert.equal(tomDoTituloDrive('EU NAVEGAREI_TOM_Gm'), 'Gm');
  assert.equal(tomDoTituloDrive('EGITO_TOM_Gb'), 'Gb');
});

test('tomDoTituloDrive: "TOM" explícito ganha do candidato solto', () => {
  assert.equal(tomDoTituloDrive('SUBLIME_C_TOM_G'), 'G');
});
