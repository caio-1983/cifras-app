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

const VALIDOS = new Set(TONS.map((o) => o.tom));

/** O tom pedido, ou `null` se não for um dos oferecidos. Não confie no `?tom=`. */
export function tomValido(pedido: string | undefined): string | null {
  if (!pedido) return null;
  return VALIDOS.has(pedido) ? pedido : null;
}
