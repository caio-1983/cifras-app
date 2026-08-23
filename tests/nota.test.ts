import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseNota, formatarNota, semitom, transporNota, deltaEntreTons } from '../src/nota.ts';
import type { Nota } from '../src/tipos.ts';

function nota(letra: Nota['letra'], acidente = 0): Nota {
  return { letra, acidente };
}

test('parseNota reconhece nota natural, sustenido e bemol', () => {
  assert.deepEqual(parseNota('C'), { nota: nota('C', 0), resto: '' });
  assert.deepEqual(parseNota('C#'), { nota: nota('C', 1), resto: '' });
  assert.deepEqual(parseNota('Db'), { nota: nota('D', -1), resto: '' });
});

test('parseNota devolve o resto da string não consumido', () => {
  assert.deepEqual(parseNota('F7+'), { nota: nota('F', 0), resto: '7+' });
  assert.deepEqual(parseNota('Bbm7'), { nota: nota('B', -1), resto: 'm7' });
});

test('formatarNota é o inverso de parseNota para os casos simples', () => {
  for (const texto of ['C', 'C#', 'Db', 'F#', 'Bb', 'G']) {
    const { nota: n } = parseNota(texto);
    assert.equal(formatarNota(n), texto);
  }
});

test('semitom calcula a classe de altura 0-11', () => {
  assert.equal(semitom(nota('C')), 0);
  assert.equal(semitom(nota('C', 1)), 1);
  assert.equal(semitom(nota('D', -1)), 1);
  assert.equal(semitom(nota('B', 1)), 0);
  assert.equal(semitom(nota('C', -1)), 11);
});

test('deltaEntreTons: C -> D (maior segunda acima)', () => {
  const { deltaLetra, deltaSemitom } = deltaEntreTons(
    { letra: 'C', acidente: 0, menor: false },
    { letra: 'D', acidente: 0, menor: false },
  );
  assert.equal(deltaLetra, 1);
  assert.equal(deltaSemitom, 2);
});

test('deltaEntreTons: C -> Ab', () => {
  const { deltaLetra, deltaSemitom } = deltaEntreTons(
    { letra: 'C', acidente: 0, menor: false },
    { letra: 'A', acidente: -1, menor: false },
  );
  assert.equal(deltaLetra, 5);
  assert.equal(deltaSemitom, 8);
});

test('deltaEntreTons: C -> G', () => {
  const { deltaLetra, deltaSemitom } = deltaEntreTons(
    { letra: 'C', acidente: 0, menor: false },
    { letra: 'G', acidente: 0, menor: false },
  );
  assert.equal(deltaLetra, 4);
  assert.equal(deltaSemitom, 7);
});

test('transporNota: caso regressivo E/G# (C) -> C/E (Ab)', () => {
  const { deltaLetra, deltaSemitom } = deltaEntreTons(
    { letra: 'C', acidente: 0, menor: false },
    { letra: 'A', acidente: -1, menor: false },
  );
  const raiz = transporNota(nota('E'), deltaLetra, deltaSemitom);
  const baixo = transporNota(nota('G', 1), deltaLetra, deltaSemitom);
  assert.equal(formatarNota(raiz), 'C');
  assert.equal(formatarNota(baixo), 'E');
});

test('transporNota: quarto grau de Ab é Db, nunca C#', () => {
  // F é o quarto grau de C; ao transpor C->Ab, F deve virar o quarto grau de Ab = Db.
  const { deltaLetra, deltaSemitom } = deltaEntreTons(
    { letra: 'C', acidente: 0, menor: false },
    { letra: 'A', acidente: -1, menor: false },
  );
  const resultado = transporNota(nota('F'), deltaLetra, deltaSemitom);
  assert.equal(formatarNota(resultado), 'Db');
});

test('transporNota: sensível de D é C#, nunca Db', () => {
  // B é a sensível de C; ao transpor C->D, B deve virar a sensível de D = C#.
  const { deltaLetra, deltaSemitom } = deltaEntreTons(
    { letra: 'C', acidente: 0, menor: false },
    { letra: 'D', acidente: 0, menor: false },
  );
  const resultado = transporNota(nota('B'), deltaLetra, deltaSemitom);
  assert.equal(formatarNota(resultado), 'C#');
});

test('transporNota: tabela de casos com tons menores do acervo', () => {
  // Cada caso transpõe a raiz do acorde de dominante (V) do tom de origem e
  // confere que vira a raiz do V do tom de destino — invariante musicalmente
  // significativa, não só aritmética.
  const casos: Array<{
    nota: Nota;
    origem: { letra: Nota['letra']; acidente: number };
    destino: { letra: Nota['letra']; acidente: number };
    esperado: string;
  }> = [
    // V de Em é B; V de Gm é D (Em -> Gm, terça menor acima)
    { nota: nota('B'), origem: { letra: 'E', acidente: 0 }, destino: { letra: 'G', acidente: 0 }, esperado: 'D' },
    // V de Dm é A; V de Cm é G (Dm -> Cm, segunda maior abaixo)
    { nota: nota('A'), origem: { letra: 'D', acidente: 0 }, destino: { letra: 'C', acidente: 0 }, esperado: 'G' },
    // V de C#m é G#; V de Dm é A (C#m -> Dm, meio tom acima)
    { nota: nota('G', 1), origem: { letra: 'C', acidente: 1 }, destino: { letra: 'D', acidente: 0 }, esperado: 'A' },
    // V de Bm é F#; V de Am é E (Bm -> Am, segunda maior abaixo)
    { nota: nota('F', 1), origem: { letra: 'B', acidente: 0 }, destino: { letra: 'A', acidente: 0 }, esperado: 'E' },
  ];
  for (const c of casos) {
    const { deltaLetra, deltaSemitom } = deltaEntreTons(
      { ...c.origem, menor: true },
      { ...c.destino, menor: true },
    );
    const resultado = transporNota(c.nota, deltaLetra, deltaSemitom);
    assert.equal(formatarNota(resultado), c.esperado, JSON.stringify(c));
  }
});

test('invariante: transpor e depois transpor de volta reproduz letra e acidente originais', () => {
  const origem = { letra: 'C' as const, acidente: 0, menor: false };
  const destino = { letra: 'A' as const, acidente: -1, menor: false };
  const ida = deltaEntreTons(origem, destino);
  const volta = deltaEntreTons(destino, origem);

  for (const letra of ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const) {
    for (const acidente of [-1, 0, 1]) {
      const original = nota(letra, acidente);
      const transposta = transporNota(original, ida.deltaLetra, ida.deltaSemitom);
      const deVolta = transporNota(transposta, volta.deltaLetra, volta.deltaSemitom);
      assert.deepEqual(deVolta, original, `falhou para ${formatarNota(original)}`);
    }
  }
});
