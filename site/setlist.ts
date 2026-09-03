/**
 * A setlist que está sendo executada, na URL.
 *
 * O conceito do produto é **preparar no computador e executar no celular**, e
 * isso exige que a ordem preparada atravesse de um aparelho para o outro. Este
 * projeto não tem banco (regra do `CLAUDE.md`) e o servidor é só leitura —
 * então a ordem viaja no `?ordem=`, e o link é o que atravessa:
 *
 *     /executar/06SET?ordem=vitorioso-es:G,quebrantado:C&i=1
 *
 * Consequências, todas deliberadas:
 *
 * - **O servidor continua sem estado.** Reiniciar não perde nada, que é o que
 *   `docs/site.md` promete.
 * - **O rascunho local é conveniência, não fonte.** A tela de preparação
 *   guarda as alterações em `localStorage` e as reescreve nos links; quem
 *   abre o link recebe a ordem que estava lá no momento em que o link foi
 *   copiado.
 * - **Sem `ordem=`, vale a ordem canônica do culto** — a que foi tocada.
 *
 * Nada aqui confia no parâmetro: slug desconhecido é descartado e tom inválido
 * cai no tom de origem da música, mesma política do `?tom=` (o músico quer a
 * cifra, não um 400).
 */
import type { EntradaCulto } from './cultos.ts';
import type { MusicaIndexada } from './repertorio.ts';
import { tomValido } from './tons.ts';

/** Quantas músicas um culto pode ter no `?ordem=`. Teto contra URL abusiva. */
const MAX_ENTRADAS = 60;

export function codificarOrdem(entradas: readonly { slug: string; tom: string }[]): string {
  return entradas.map((e) => `${e.slug}:${e.tom}`).join(',');
}

/**
 * Lê o `?ordem=`. Devolve `null` quando não sobra nada de aproveitável — aí
 * quem chama usa a ordem canônica do culto.
 */
export function decodificarOrdem(
  param: string | undefined,
  porSlug: (slug: string) => MusicaIndexada | undefined,
): EntradaCulto[] | null {
  if (!param) return null;

  const entradas: EntradaCulto[] = [];
  for (const pedaco of param.split(',').slice(0, MAX_ENTRADAS)) {
    const [slug, tom] = pedaco.split(':');
    if (!slug) continue;
    const musica = porSlug(slug.trim());
    if (!musica) continue; // slug desconhecido: descarta a entrada, não o culto
    entradas.push({ slug: musica.slug, tom: tomValido(tom?.trim()) ?? musica.tom, musica });
  }
  return entradas.length > 0 ? entradas : null;
}

/**
 * O índice da música atual, sempre dentro da setlist. `?i=` fora da faixa
 * (link antigo, música removida do rascunho) cai na primeira em vez de dar
 * erro no meio do culto.
 */
export function indiceValido(pedido: string | undefined, total: number): number {
  const n = Number(pedido);
  if (!Number.isInteger(n) || n < 0 || n >= total) return 0;
  return n;
}
