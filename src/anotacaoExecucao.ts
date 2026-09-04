/**
 * Marca, com a sintaxe `{...}` do formato, os tokens que aparecem dentro de
 * uma linha de cifra do acervo mas não são acorde nenhum.
 *
 * Achado do acervo completo (421 arquivos): 61 arquivos falhavam por
 * "nota inválida", e a maioria esmagadora é uma destas duas famílias:
 *
 * - **contagem de repetição** — `2x`, `2X`, `4x`, `(2X)`. Aparece no fim da
 *   linha (`{interlúdio} | A | A | D | D | 2x`) ou entre o subtítulo e a
 *   cifra (`[Refrão] 2x  | A9 | E | F#m | D9 |`).
 * - **pausa** — usada como um compasso inteiro: `| pausa |`,
 *   `| pausa | pausa | Em | % |`, `| Ab Db | PAUSA | PAUSA |`.
 *
 * Nenhuma das duas é ambígua: `2x` e `pausa` nunca são nome de acorde. O
 * vocabulário é fechado de propósito — qualquer outra coisa que não parseie
 * continua derrubando o arquivo, para não virar um pote onde todo lixo cabe.
 *
 * Por que `{...}` e não mover a contagem para fora do colchete: o parser
 * recusa `[Refrão] 2x | G7M |` (o `2x` vira nota inválida) mas aceita
 * `[Refrão] {2x} | G7M |`, porque um trecho entre chaves é item literal —
 * atravessa transposição e relayout sem ser tocado. O texto original é
 * preservado, inclusive a caixa (`2X` continua `2X`).
 */

const RE_REPETICAO = /^\(?\d+[xX]\)?$/;
// "pausa??" é achado real: o "?" é dúvida do transcritor, e vai preservado
// dentro das chaves em vez de ser limpo — a grafia do documento é o produto.
const RE_PAUSA = /^pausa\?*$/i;

function ehAnotacao(token: string): boolean {
  return RE_REPETICAO.test(token) || RE_PAUSA.test(token);
}

/**
 * Envolve em `{}` os tokens de anotação de um trecho de cifra. Preserva o
 * espaçamento original entre tokens — o trecho pode ser a cauda de uma
 * linha de subtítulo, e mexer no espaçamento aqui não traria ganho nenhum.
 */
export function marcarAnotacoesDeExecucao(trecho: string): string {
  return trecho
    .split(/(\s+)/)
    .map((pedaco) => (ehAnotacao(pedaco) ? `{${pedaco}}` : pedaco))
    .join('');
}
