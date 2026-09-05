/**
 * A setlist digitada de uma vez, em texto: uma música por linha, o tom
 * opcional no fim.
 *
 *     VITORIOSO ÉS - G
 *     QUEBRANTADO (C)
 *     TEU TOQUE
 *
 * É como o diretor musical já escreve a ordem do culto no papel e no Google
 * Docs — e é o caminho mais curto entre "sei o culto de cabeça" e "a setlist
 * está montada". Sem isto, montar um culto de cinco músicas são cinco buscas
 * e cinco cliques.
 *
 * Duas decisões, as duas para não montar culto errado em silêncio:
 *
 * - **O tom só é separado do título se for tom de verdade.** `DEUS É DEUS -
 *   PARTE 2` não vira "DEUS É DEUS" no tom "PARTE 2": a linha inteira é
 *   título, e se não houver música com esse nome o usuário é avisado.
 * - **Linha que não casa não é descartada.** Ela volta como problema, com o
 *   texto original, para a tela dizer o que não entendeu. Setlist com uma
 *   música a menos, montada sem avisar, é o pior desfecho possível: só se
 *   descobre no culto.
 */
import type { EntradaCulto } from './cultos.ts';
import type { MusicaIndexada, Repertorio } from './repertorio.ts';
import { tomValido } from './tons.ts';

/** Teto de linhas lidas — o mesmo do `?ordem=` (`site/setlist.ts`). */
const MAX_LINHAS = 60;

export interface ProblemaSetlist {
  /** A linha como o usuário escreveu — é o que a tela mostra de volta. */
  linha: string;
  motivo: 'nao-encontrada' | 'ambigua' | 'repetida';
}

export interface SetlistLida {
  entradas: EntradaCulto[];
  problemas: ProblemaSetlist[];
}

/** Sem acento, sem pontuação, minúscula: "Coração!" e "coracao" se encontram. */
function normalizar(s: string): string {
  return s
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

/** `(G)` ou ` - G` no fim da linha, **só** quando o que vem depois é um tom. */
function separarTom(linha: string): { titulo: string; tom: string | null } {
  const paren = /^(.*?)\s*\(([^()]+)\)\s*$/.exec(linha);
  if (paren) {
    const tom = tomValido(paren[2]!.trim());
    if (tom) return { titulo: paren[1]!.trim(), tom };
  }
  const sep = /^(.*[^\s\-–—|:])\s*[-–—|:]+\s*([^\s\-–—|:]+)\s*$/.exec(linha);
  if (sep) {
    const tom = tomValido(sep[2]!.trim());
    if (tom) return { titulo: sep[1]!.trim(), tom };
  }
  return { titulo: linha.trim(), tom: null };
}

/**
 * A música que a linha nomeia. Casa por título exato primeiro; só depois por
 * prefixo e por trecho — e **prefixo ambíguo não escolhe**: com "EU VOU" para
 * duas músicas, adivinhar seria pior que perguntar.
 */
function acharMusica(
  titulo: string,
  rep: Repertorio,
): { musica?: MusicaIndexada; ambigua?: boolean } {
  const alvo = normalizar(titulo);
  if (!alvo) return {};

  const exata = rep.todas.filter((m) => normalizar(m.titulo) === alvo || m.slug === titulo.trim());
  if (exata.length === 1) return { musica: exata[0] };
  if (exata.length > 1) return { ambigua: true };

  for (const casa of [
    (m: MusicaIndexada) => normalizar(m.titulo).startsWith(alvo),
    (m: MusicaIndexada) => normalizar(m.titulo).includes(alvo),
    (m: MusicaIndexada) => normalizar(`${m.titulo} ${m.artista}`).includes(alvo),
  ]) {
    const achadas = rep.todas.filter(casa);
    if (achadas.length === 1) return { musica: achadas[0] };
    if (achadas.length > 1) return { ambigua: true };
  }
  return {};
}

/**
 * Lê a setlist digitada. Linha vazia é separador, não erro — quem escreve
 * agrupa por bloco de louvor.
 */
export function lerSetlistTexto(texto: string | undefined, rep: Repertorio): SetlistLida {
  const entradas: EntradaCulto[] = [];
  const problemas: ProblemaSetlist[] = [];
  const jaTem = new Set<string>();

  for (const bruta of (texto ?? '').split(/\r?\n/).slice(0, MAX_LINHAS)) {
    // Numeração ("1. ", "3) ") é como se escreve setlist à mão.
    const linha = bruta.replace(/^\s*\d{1,2}\s*[.)-]\s*/, '').trim();
    if (!linha) continue;

    const { titulo, tom } = separarTom(linha);
    const { musica, ambigua } = acharMusica(titulo, rep);
    if (!musica) {
      problemas.push({ linha: bruta.trim(), motivo: ambigua ? 'ambigua' : 'nao-encontrada' });
      continue;
    }
    if (jaTem.has(musica.slug)) {
      problemas.push({ linha: bruta.trim(), motivo: 'repetida' });
      continue;
    }
    jaTem.add(musica.slug);
    entradas.push({ slug: musica.slug, tom: tom ?? musica.tom, musica });
  }

  return { entradas, problemas };
}

/** O aviso que a tela mostra. Fala da linha, não do código. */
export function explicarProblema(p: ProblemaSetlist): string {
  const motivo =
    p.motivo === 'ambigua'
      ? 'combina com mais de uma música — escreva o título inteiro'
      : p.motivo === 'repetida'
        ? 'já está nesta setlist'
        : 'não está no repertório';
  return `“${p.linha}” ${motivo}`;
}
