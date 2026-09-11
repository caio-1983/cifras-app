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
  /**
   * As músicas que a linha alcança, quando o motivo é `ambigua`. É o que a
   * tela precisa para **perguntar** em vez de só reclamar.
   *
   * O acervo tem 58 títulos que se repetem — "VITORIOSO ÉS" tem seis
   * transcrições, em tons diferentes. Para esses, "escreva o título inteiro"
   * é conselho impossível: os títulos são idênticos, e o que separa uma da
   * outra é o tom e os acordes. Por isso a ambiguidade não é erro de quem
   * digitou; é uma pergunta que só o acervo pode fazer e só o usuário pode
   * responder.
   */
  candidatas?: MusicaIndexada[];
  /** O tom escrito na linha, quando havia. Sobrevive à escolha. */
  tom?: string | null;
}

export interface SetlistLida {
  entradas: EntradaCulto[];
  problemas: ProblemaSetlist[];
}

/** Quantas candidatas a tela mostra por linha ambígua. */
const MAX_CANDIDATAS = 12;

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
export function acharMusica(
  titulo: string,
  rep: Repertorio,
): { musica?: MusicaIndexada; candidatas?: MusicaIndexada[] } {
  const alvo = normalizar(titulo);
  if (!alvo) return {};

  const exata = rep.todas.filter((m) => normalizar(m.titulo) === alvo || m.slug === titulo.trim());
  if (exata.length === 1) return { musica: exata[0] };
  // Empate no título exato é o caso comum do acervo (as seis "VITORIOSO ÉS"),
  // e é aqui que a escolha tem de ser oferecida: são todas a música pedida.
  if (exata.length > 1) return { candidatas: exata.slice(0, MAX_CANDIDATAS) };

  for (const casa of [
    (m: MusicaIndexada) => normalizar(m.titulo).startsWith(alvo),
    (m: MusicaIndexada) => normalizar(m.titulo).includes(alvo),
    (m: MusicaIndexada) => normalizar(`${m.titulo} ${m.artista}`).includes(alvo),
  ]) {
    const achadas = rep.todas.filter(casa);
    if (achadas.length === 1) return { musica: achadas[0] };
    if (achadas.length > 1) return { candidatas: achadas.slice(0, MAX_CANDIDATAS) };
  }
  return {};
}

/**
 * Lê a setlist digitada. Linha vazia é separador, não erro — quem escreve
 * agrupa por bloco de louvor.
 */
export function lerSetlistTexto(
  texto: string | undefined,
  rep: Repertorio,
  /**
   * O que o usuário já escolheu para as linhas ambíguas, por texto de linha.
   *
   * A chave é a linha, não a posição: quem volta da tela de escolha pode ter
   * corrigido uma linha vizinha, e uma escolha presa ao índice iria parar na
   * música errada — que é exatamente o erro que a tela existe para evitar.
   */
  escolhas: Readonly<Record<string, string>> = {},
): SetlistLida {
  const entradas: EntradaCulto[] = [];
  const problemas: ProblemaSetlist[] = [];
  const jaTem = new Set<string>();

  for (const bruta of (texto ?? '').split(/\r?\n/).slice(0, MAX_LINHAS)) {
    // Numeração ("1. ", "3) ") é como se escreve setlist à mão.
    const linha = bruta.replace(/^\s*\d{1,2}\s*[.)-]\s*/, '').trim();
    if (!linha) continue;

    const { titulo, tom } = separarTom(linha);
    let { musica, candidatas } = acharMusica(titulo, rep);

    // A escolha só vale se for uma das candidatas daquela linha: um `escolha=`
    // editado à mão não pode injetar música que a linha nunca alcançou.
    if (!musica && candidatas) {
      const pedida = escolhas[bruta.trim()];
      const achada = pedida ? candidatas.find((m) => m.slug === pedida) : undefined;
      if (achada) {
        musica = achada;
        candidatas = undefined;
      }
    }

    if (!musica) {
      problemas.push(
        candidatas
          ? { linha: bruta.trim(), motivo: 'ambigua', candidatas, tom }
          : { linha: bruta.trim(), motivo: 'nao-encontrada' },
      );
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
      ? `tem ${p.candidatas?.length ?? 2} versões no acervo — escolha abaixo`
      : p.motivo === 'repetida'
        ? 'já está nesta setlist'
        : 'não está no repertório';
  return `“${p.linha}” ${motivo}`;
}
