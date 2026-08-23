import type { Letra, Tom } from './tipos.ts';

const LETRAS_VALIDAS = new Set(['A', 'B', 'C', 'D', 'E', 'F', 'G']);

export function parseTom(texto: string): Tom {
  const m = /^([A-G])(#|b)?(m)?$/.exec(texto);
  if (!m || !LETRAS_VALIDAS.has(m[1]!)) {
    throw new Error(`tom inválido: "${texto}"`);
  }
  const letra = m[1] as Letra;
  const acidente = m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0;
  const menor = m[3] === 'm';
  return { letra, acidente, menor };
}

export function formatarTom(tom: Tom): string {
  const acidenteTexto = tom.acidente > 0 ? '#'.repeat(tom.acidente) : tom.acidente < 0 ? 'b'.repeat(-tom.acidente) : '';
  return `${tom.letra}${acidenteTexto}${tom.menor ? 'm' : ''}`;
}
