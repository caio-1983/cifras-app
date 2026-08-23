import type { Acorde } from './tipos.ts';
import { parseNota, formatarNota } from './nota.ts';

export function ehTokenAcorde(texto: string): boolean {
  return /^[A-G]/.test(texto);
}

export function parseAcorde(texto: string): Acorde {
  const { nota: raiz, resto } = parseNota(texto);
  const indiceBarra = resto.indexOf('/');
  if (indiceBarra === -1) {
    return { raiz, sufixo: resto };
  }
  const sufixo = resto.slice(0, indiceBarra);
  const baixoTexto = resto.slice(indiceBarra + 1);
  const { nota: baixo, resto: restoBaixo } = parseNota(baixoTexto);
  if (restoBaixo !== '') {
    throw new Error(`baixo inválido em acorde "${texto}": sobrou "${restoBaixo}"`);
  }
  return { raiz, sufixo, baixo };
}

export function formatarAcorde(acorde: Acorde): string {
  const base = formatarNota(acorde.raiz) + acorde.sufixo;
  return acorde.baixo ? `${base}/${formatarNota(acorde.baixo)}` : base;
}
