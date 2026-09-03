/**
 * Teste cruzado: o núcleo da Fase 0 (`src/`) contra os casos de
 * `gerador/tests/test_transpor.py`.
 *
 * `gerador/tests/test_cruzado_fase0.py` já fez a outra metade — rodou o
 * transpositor Python contra as fixtures conferidas à mão da Fase 0, e
 * reproduziu as cinco byte a byte. Este arquivo fecha o ciclo: os mesmos
 * pares entrada/esperado do `test_transpor.py`, copiados literalmente (não
 * executados via Python — não há ponte entre as duas linguagens, nem é o
 * objetivo desta tarefa construir uma), rodados contra o núcleo de verdade.
 *
 * Como testar "o núcleo" sem uma função `transpor_acorde` isolada: não
 * existe, no núcleo, uma função exportada que transponha um token solto —
 * a distinção acorde/estrutura mora em `tokenizarTrecho` (linhas.ts), e só
 * é exercitada dentro de uma linha classificada. Cada caso de token é
 * embrulhado no menor `.cifra` válido (`titulo: T\ntom: X\n---\n| TOKEN |`),
 * passado por `transporMusicaTexto` — a função pública real, já estável — e
 * o token é extraído de volta da linha de saída. Isso testa a cadeia
 * inteira (cabeçalho → classificação → tokenização → parse de acorde →
 * transposição → formatação → relayout → serialização), não um atalho.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { transporMusicaTexto } from '../src/index.ts';
import { parseTom } from '../src/tom.ts';
import { deltaEntreTons } from '../src/nota.ts';

/** Embrulha um token solto numa linha de compasso de uma música só, transpõe, devolve o token de volta. */
function tp(origem: string, destino: string, token: string): string {
  const texto = `titulo: T\ntom: ${origem}\n---\n| ${token} |\n`;
  const linhas = transporMusicaTexto(texto, destino).split('\n');
  const linhaCorpo = linhas[3]!;
  const m = /^\|\s*(.*?)\s*\|$/.exec(linhaCorpo);
  if (!m) throw new Error(`linha de corpo inesperada: ${JSON.stringify(linhaCorpo)}`);
  return m[1]!;
}

/** Transpõe uma linha de compasso inteira (sem embrulho — a linha já começa com "|"). */
function tpCompasso(origem: string, destino: string, linha: string): string {
  const texto = `titulo: T\ntom: ${origem}\n---\n${linha}\n`;
  return transporMusicaTexto(texto, destino).split('\n')[3]!;
}

/** Transpõe uma linha posicional inteira (prefixo "~" adicionado aqui). */
function tpPosicional(origem: string, destino: string, linhaSemTil: string): string {
  const texto = `titulo: T\ntom: ${origem}\n---\n~${linhaSemTil}\n`;
  const saida = transporMusicaTexto(texto, destino).split('\n')[3]!;
  return saida.slice(1); // tira o "~" de volta, pra comparar só o conteúdo
}

// ------------------------------------------------------------ grafia enarmônica
test('grafia enarmônica: casos reais de culto e tom com bemol/sustenido', () => {
  const casos: [string, string, string, string][] = [
    // Eu Me Rendo, culto de 28/08: B -> G, a música inteira em campo natural.
    ['B', 'G', 'B7M', 'G7M'],
    ['B', 'G', 'C#m7', 'Am7'],
    ['B', 'G', 'D#m7', 'Bm7'],
    ['B', 'G', 'G#m7(9)', 'Em7(9)'],
    ['B', 'G', 'F#sus4', 'Dsus4'],
    ['B', 'G', 'E9', 'C9'],
    // Quebrantado, culto de 06/09: G -> C.
    ['G', 'C', 'Em', 'Am'],
    ['G', 'C', 'D', 'G'],
    // Tom com bemol: o quarto grau de Ab é Db, nunca C#.
    ['C', 'Ab', 'F', 'Db'],
    ['C', 'Ab', 'C', 'Ab'],
    // Tom com sustenido: a sensível de D é C#, nunca Db.
    ['C', 'D', 'B', 'C#'],
  ];
  for (const [origem, destino, entrada, esperado] of casos) {
    assert.equal(tp(origem, destino, entrada), esperado, `${origem}->${destino} ${entrada}`);
  }
});

test('grafia enarmônica: não produz grafia absurda (Cb/Fb são válidos, ## e bb nunca)', () => {
  // A estratégia ingênua (pitch class + tabela fixa) produzia C/Fb ao levar
  // Ao Único de C para Ab. Aqui o baixo sai Eb/G, certo.
  assert.equal(tp('C', 'Ab', 'G/B'), 'Eb/G');
  // Cb e Fb NÃO são banidos: a escala de Gb maior contém Cb de verdade
  // (Gb Ab Bb Cb Db Eb F), então F7M em C vira Cb7M em Gb e está correto.
  assert.equal(tp('C', 'Gb', 'F7M'), 'Cb7M');

  const LETRAS = ['C', 'D', 'E', 'F', 'G', 'A', 'B'] as const;
  const tons = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];
  const acordes = ['C', 'Dm7', 'Em7', 'F7M', 'Am7', 'Bm7(5-)'];
  for (const tom of tons) {
    const { deltaLetra } = deltaEntreTons(parseTom('C'), parseTom(tom));
    for (const acorde of acordes) {
      const r = tp('C', tom, acorde);
      assert.ok(!r.includes('##') && !r.includes('bb'), `${tom} ${acorde} -> ${r}`);
      const esperada = LETRAS[(LETRAS.indexOf(acorde[0] as (typeof LETRAS)[number]) + deltaLetra) % 7];
      assert.equal(r[0], esperada, `${tom} ${acorde} -> ${r}`);
    }
  }
});

// --------------------------------------------------------- notação brasileira
test('notação brasileira: sufixo preservado (7+, 7M, 4, 9, (5-), (11), sus4)', () => {
  const casos: [string, string][] = [
    ['F7+', 'G7+'], // 7+ é maj7
    ['F7M', 'G7M'], // 7M é o mesmo maj7, outra escrita — ambos no acervo
    ['Eb4', 'F4'], // 4 é sus4
    ['Bb9', 'C9'], // 9 é add9
    ['F#m7(5-)', 'G#m7(5-)'], // meia-diminuta
    ['Gm7(11)', 'Am7(11)'],
    ['Csus4', 'Dsus4'],
  ];
  for (const [entrada, esperado] of casos) {
    assert.equal(tp('C', 'D', entrada), esperado, entrada);
  }
});

test('baixo invertido transpõe os dois lados', () => {
  assert.equal(tp('B', 'G', 'F#/A#'), 'D/F#');
  assert.equal(tp('B', 'G', 'B/D#'), 'G/B');
  assert.equal(tp('B', 'G', 'C#m7/B'), 'Am7/G');
});

test('literais de estrutura passam intactos (|, |:, :|, %, /)', () => {
  for (const tok of ['|', '|:', ':|', '%', '/']) {
    assert.equal(tp('C', 'Ab', tok), tok, tok);
  }
});

// --------------------------------------------------------------- linhas
test('linha de compasso preserva espaçamento (bug do culto de 30/08: espaço dobrado)', () => {
  // Aplicar o algoritmo posicional numa linha de compasso gerava "| F9  |"
  // com espaço dobrado, porque F9 é mais estreito que Bb9. Linha de
  // compasso substitui no lugar / preserva o gap original.
  assert.equal(tpCompasso('Bb', 'F', '| Bb9 | C |'), '| F9 | G |');
  assert.equal(tpCompasso('Bb', 'F', '|: Dm7 F9 | Gm7 :|'), '|: Am7 C9 | Dm7 :|');
});

test('linha posicional preserva a coluna de cada acorde', () => {
  // O acorde tem que continuar sobre a mesma sílaba mesmo mudando de largura.
  const out = tpPosicional('C', 'D', '     Em7          C');
  assert.equal(out.indexOf('F#m7'), 5);
  assert.equal(out.indexOf('D', 6), 18);
});

test('linha posicional não sobrepõe acordes vizinhos (mínimo 1 espaço na colisão)', () => {
  const out = tpPosicional('C', 'B', 'C  G');
  assert.equal(out, 'B  F#');
  assert.ok(out.includes(' '));
});

test('linha posicional vazia (só o marcador "~", nada depois) não quebra', () => {
  const out = tpPosicional('C', 'C', '');
  assert.equal(out, '');
});

// A colisão exata foi o ÚNICO ponto onde os dois transpositores divergiram, e
// apareceu FORA dos 88 casos de test_transpor.py — testando o port do emissor
// contra música real (VITORIOSO ÉS). Nenhum caso sintético e nenhuma das 5
// fixtures hand-checked da Fase 0 tinha um acorde emendando exatamente no fim
// do anterior. O núcleo deixava colado (só separava na sobreposição de
// verdade); o gerador sempre separava. Resolvido a favor do gerador, dentro de
// `colunaAbsoluta`, que hoje é a implementação única dos dois lados — a
// divergência não existe mais porque não existem mais dois algoritmos.
// Ver docs/reconciliacao-transpositores.md.
test('colisão exata: núcleo e gerador dão a MESMA saída (a divergência foi fechada, com o espaço separador)', async () => {
  const { transporLinha } = await import('../gerador-ts/transpor.ts');
  const { deltaLetra, deltaSemitom } = deltaEntreTons(parseTom('E'), parseTom('Db'));

  // "| A | F#m |", E->Db: o "|" do meio começa exatamente onde "A"->"Gb"
  // termina — é a colisão EXATA (gap === 0, com folga na origem).
  const linha = '| A | F#m |';
  const doNucleo = tpPosicional('E', 'Db', linha);
  const doGerador = transporLinha(linha, deltaLetra, deltaSemitom);

  assert.equal(doNucleo, '| Gb | Ebm |');
  assert.equal(doGerador, '| Gb | Ebm |');
  assert.equal(doNucleo, doGerador);

  // Controle: numa linha SEM colisão (gap > 0 em todo item), continuam batendo.
  const semColisao = '  A    F#m';
  assert.equal(tpPosicional('E', 'Db', semColisao), transporLinha(semColisao, deltaLetra, deltaSemitom));
});

test('colisão entre dois ACORDES: o separador impede uma leitura ambígua, não só uma feia', async () => {
  const { transporLinha } = await import('../gerador-ts/transpor.ts');
  const { deltaLetra, deltaSemitom } = deltaEntreTons(parseTom('F'), parseTom('Gb'));

  // NÃO HÁ UM NOME IGUAL, F -> Gb. Sem o separador sairia "Gb/BbCb", que se lê
  // como um acorde diferente — este é o motivo que sustenta a decisão.
  const linha = 'F/A  Bb';
  assert.equal(transporLinha(linha, deltaLetra, deltaSemitom), 'Gb/Bb Cb');
  assert.equal(tpPosicional('F', 'Gb', linha), 'Gb/Bb Cb');
});

test('adjacência da origem não é colisão: o marcador "~" nunca ganha espaço depois dele', () => {
  // O "~" entra no relayout como item na coluna 0, colado no primeiro acorde.
  // Se a regra do gerador fosse portada crua, todo acorde de toda linha
  // posicional do acervo andaria uma coluna.
  // tpPosicional devolve a linha já sem o "~"; a linha crua vem logo abaixo,
  // porque o ponto do teste é justamente o que acontece na emenda do marcador.
  assert.equal(tpPosicional('C', 'C#', 'Am        G'), 'A#m       G#');
  const texto = 'titulo: T\ntom: C\n---\n~Am        G\n';
  assert.equal(transporMusicaTexto(texto, 'C#').split('\n')[3], '~A#m       G#');
});

// --------------------------------------------------------------- identidade
test('mesmo tom não muda nada', () => {
  const { deltaLetra, deltaSemitom } = deltaEntreTons(parseTom('F'), parseTom('F'));
  assert.equal(deltaLetra, 0);
  assert.equal(deltaSemitom, 0);

  const linha = '| Bb9 / Gm7 | F/A |';
  assert.equal(tpCompasso('F', 'F', linha), linha);
});

test('ida e volta devolve a grafia original', () => {
  for (const destino of ['D', 'Eb', 'G', 'Ab', 'B']) {
    const ida = tp('C', destino, 'Am7');
    const volta = tp(destino, 'C', ida);
    assert.equal(volta, 'Am7', destino);
  }
});

// --------------------------------------------------------------- melisma
// Achado da reconciliação: `limpar_letra` do gerador só é chamada em
// rtf.py/html.py na hora de EMITIR uma linha 'let' — nunca de
// transpor_compasso/transpor_linha. Não é transposição em nenhum dos dois
// lados. O núcleo hoje preserva o sublinhado de melisma tal como veio (é só
// um caractere comum de coluna, decisão documentada em
// docs/achados-importacao.md item "Melisma"). Ver docs/reconciliacao-transpositores.md
// para o veredito completo — este teste documenta o comportamento atual do
// núcleo, não porta `limpar_letra` (não há ponto de transposição para portar).
test('melisma: núcleo preserva o sublinhado em linha de letra — não é responsabilidade da transposição', () => {
  const texto = 'titulo: T\ntom: C\n---\ncora_ção\n';
  const musica = transporMusicaTexto(texto, 'C');
  assert.ok(musica.includes('cora_ção'));
});

// --------------------------------------------------------------- erro
test('tom inválido lança erro', () => {
  assert.throws(() => parseTom('H'));
});
