import type { Letra, Nota, Tom } from './tipos.ts';

const ORDEM: readonly Letra[] = ['C', 'D', 'E', 'F', 'G', 'A', 'B'];

const SEMITOM_NATURAL: Record<Letra, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

function mod(n: number, m: number): number {
  return ((n % m) + m) % m;
}

function indice(letra: Letra): number {
  return ORDEM.indexOf(letra);
}

export function parseNota(texto: string): { nota: Nota; resto: string } {
  const m = /^([A-G])([#b]*)/.exec(texto);
  if (!m) {
    throw new Error(`nota inválida: "${texto}"`);
  }
  const letra = m[1] as Letra;
  const simbolos = m[2] ?? '';
  const acidente = simbolos.startsWith('#') ? simbolos.length : simbolos.startsWith('b') ? -simbolos.length : 0;
  return { nota: { letra, acidente }, resto: texto.slice(m[0].length) };
}

export function formatarNota(nota: Nota): string {
  if (nota.acidente === 0) return nota.letra;
  if (nota.acidente > 0) return nota.letra + '#'.repeat(nota.acidente);
  return nota.letra + 'b'.repeat(-nota.acidente);
}

export function semitom(nota: Nota): number {
  return mod(SEMITOM_NATURAL[nota.letra] + nota.acidente, 12);
}

export function deltaEntreTons(origem: Tom, destino: Tom): { deltaLetra: number; deltaSemitom: number } {
  const deltaLetra = mod(indice(destino.letra) - indice(origem.letra), 7);
  const deltaSemitom = mod(
    mod(SEMITOM_NATURAL[destino.letra] + destino.acidente, 12) - mod(SEMITOM_NATURAL[origem.letra] + origem.acidente, 12),
    12,
  );
  return { deltaLetra, deltaSemitom };
}

export function transporNota(nota: Nota, deltaLetra: number, deltaSemitom: number): Nota {
  const novaLetra = ORDEM[mod(indice(nota.letra) + deltaLetra, 7)]!;
  const semitomDestino = mod(semitom(nota) + deltaSemitom, 12);
  const diferenca = semitomDestino - SEMITOM_NATURAL[novaLetra];
  const novoAcidente = mod(diferenca + 6, 12) - 6;
  return { letra: novaLetra, acidente: novoAcidente };
}
