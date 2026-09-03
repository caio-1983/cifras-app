/**
 * Os tons oferecidos no seletor.
 *
 * Não são "os 12 do ciclo cromático". Transpor por intervalo preserva a letra
 * da nota justamente para que a grafia do destino seja uma ESCOLHA — e um
 * seletor só com bemóis esconde metade das respostas certas:
 *
 *     E -> Gb   =>   | Gb | Cb | Ebm |
 *     E -> F#   =>   | F# | B  | D#m |
 *
 * As duas estão corretas; qual serve depende de quem lê. Por isso, onde as
 * duas grafias são usadas na prática, as duas aparecem: Db/C#, Gb/F#, Ab/G#,
 * Bb/A#. `Eb` vai sozinho porque `D#` não é usado como tom na prática da
 * banda (mesma razão pela qual `Fb` e `B#` não aparecem).
 *
 * Conferido: as 13 músicas do repertório emitem sem erro em todos estes tons
 * (`tests/site.test.ts`), inclusive os enarmônicos — nenhum par produz
 * acidente duplo.
 */

import { parseTom } from '../src/tom.ts';
import { semitom } from '../src/nota.ts';

export interface OpcaoTom {
  /** O tom que vai na URL e no cabeçalho ("Tom: X"). */
  tom: string;
  /** A outra grafia do mesmo som, quando existe — mostrada junto no seletor. */
  enarmonico?: string;
}

/** Ordem cromática subindo de C; enarmônicos lado a lado. */
export const TONS: OpcaoTom[] = [
  { tom: 'C' },
  { tom: 'Db', enarmonico: 'C#' },
  { tom: 'C#', enarmonico: 'Db' },
  { tom: 'D' },
  { tom: 'Eb' },
  { tom: 'E' },
  { tom: 'F' },
  { tom: 'Gb', enarmonico: 'F#' },
  { tom: 'F#', enarmonico: 'Gb' },
  { tom: 'G' },
  { tom: 'Ab', enarmonico: 'G#' },
  { tom: 'G#', enarmonico: 'Ab' },
  { tom: 'A' },
  { tom: 'Bb', enarmonico: 'A#' },
  { tom: 'A#', enarmonico: 'Bb' },
  { tom: 'B' },
];

/**
 * O ciclo de doze do passo `−1`/`+1`.
 *
 * O seletor de 16 existe porque a grafia do destino é uma **escolha**
 * (`E → Gb` e `E → F#` são respostas diferentes e as duas estão certas). Só
 * que um stepper de semitom precisa de uma resposta por vez, e "duas grafias
 * do mesmo som" não é uma sequência. Então o passo anda por estas doze — a
 * grafia com bemol, que é como a banda escreve — e quem quer a outra grafia
 * usa o seletor. O passo é atalho; a escolha continua explícita.
 *
 * Índice = classe de altura: `CICLO[semitom(tom)]` é o tom daquele som.
 */
export const CICLO: readonly string[] = [
  'C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B',
];

/** O tom um semitom acima (`delta` 1) ou abaixo (`-1`), na grafia do ciclo. */
export function passoDeTom(tom: string, delta: number): string {
  let pc: number;
  try {
    pc = semitom(parseTom(tom));
  } catch {
    return tom; // tom que o núcleo não entende: não inventa passo
  }
  return CICLO[(((pc + delta) % 12) + 12) % 12]!;
}

/**
 * Classe de altura de cada tom oferecido, para o passo do lado do cliente.
 * Derivado do núcleo (`parseTom`/`semitom`), não digitado à mão — tabela de
 * nota escrita à mão é onde entra o erro de enarmonia.
 */
export const CLASSE_DE_ALTURA: Record<string, number> = Object.fromEntries(
  TONS.map((o) => [o.tom, semitom(parseTom(o.tom))]),
);

const VALIDOS = new Set(TONS.map((o) => o.tom));

/** O tom pedido, ou `null` se não for um dos oferecidos. Não confie no `?tom=`. */
export function tomValido(pedido: string | undefined): string | null {
  if (!pedido) return null;
  return VALIDOS.has(pedido) ? pedido : null;
}
