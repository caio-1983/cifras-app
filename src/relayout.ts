export interface ItemRelayout {
  coluna: number;
  textoOriginal: string;
  textoNovo: string;
}

/**
 * Cada item volta exatamente à coluna original que ocupava. Usada nas linhas
 * posicionais (`~`), onde a coluna marca a sílaba correspondente na letra, e
 * pelo emissor do gerador (`gerador-ts/transpor.ts::transporLinha`) — é uma
 * função só, não duas implementações do mesmo algoritmo.
 *
 * Quando um item alarga ao transpor (`Am` -> `F#m7`) e come a folga que o
 * separava do próximo, entra **1 espaço de separação** em vez de deixar os
 * dois colados. Isso não é preferência estética: dois acordes colados formam
 * um token que se lê como OUTRO acorde. Em `NÃO HÁ UM NOME IGUAL` (F -> Gb),
 * `Gb/Bb` seguido de `Cb` sai `Gb/BbCb` sem o separador — não um acorde feio,
 * um acorde diferente. Ver `docs/reconciliacao-transpositores.md`.
 *
 * A colisão é distinguida da **adjacência da origem**. Os dois casos chegam
 * aqui como `gap <= 0`, mas só um é colisão:
 *
 * - `gapOriginal > 0` — o fonte tinha folga e o alargamento a comeu:
 *   **colisão**, separa com 1 espaço.
 * - `gapOriginal === 0` — o fonte já tinha os dois itens colados (`~Am`, ou
 *   `{dois ataques}Am`, que o tokenizador separa em dois itens sem espaço
 *   entre eles): **grafia original**, preserva colado.
 *
 * Sem essa distinção, a regra do gerador portada crua inseriria um espaço
 * depois de todo `~` e deslocaria uma coluna cada acorde de cada linha
 * posicional do acervo (48 ocorrências medidas em `musicas/*.cifra` × 12
 * tons, todas adjacência legítima, nenhuma colisão).
 *
 * No domínio do gerador `gapOriginal` é sempre >= 1 (ele tokeniza texto cru
 * com `\S+`, onde dois itens adjacentes seriam um token só), então a regra
 * colapsa exatamente no `if len(out) < col / elif out` de
 * `gerador/transpor.py::transpor_linha` — equivalência preservada.
 *
 * TODO: colisão por alargamento — a condição exata `gapOriginal > 0 && gap <= 0`
 * — significa que a linha de origem não tinha folga suficiente para o tom de
 * destino. Hoje o relayout escolhe em silêncio (desloca uma coluna). O sistema
 * deveria sinalizar essas linhas para quem edita, em vez de decidir sozinho.
 */
export function colunaAbsoluta(itens: ItemRelayout[]): string {
  let saida = '';
  let posicaoAtual = 0;
  let fimOriginalAnterior = 0;
  for (const [i, item] of itens.entries()) {
    const gapDesejado = item.coluna - posicaoAtual;
    const gapOriginal = item.coluna - fimOriginalAnterior;
    // O primeiro item nunca colide com nada: seu "gap" é a indentação da linha.
    const colisao = i > 0 && gapOriginal > 0 && gapDesejado <= 0;
    // Adjacência da origem é preservada mesmo quando o alargamento a comprime
    // (gapOriginal === 0 e gapDesejado < 0): não existe inserir -2 espaços.
    const gap = colisao ? 1 : Math.max(0, gapDesejado);
    saida += ' '.repeat(gap) + item.textoNovo;
    posicaoAtual += gap + item.textoNovo.length;
    fimOriginalAnterior = item.coluna + item.textoOriginal.length;
  }
  return saida;
}

/**
 * O espaço original entre cada par de itens adjacentes é preservado
 * literalmente; se um item alargar, tudo depois dele desliza. Usada nas
 * linhas de compasso (`|`), onde não há coluna de sílaba para preservar e o
 * espaçamento em si pode ser alinhamento visual intencional do autor.
 */
export function larguraPreservada(itens: ItemRelayout[]): string {
  let saida = '';
  let colunaAnterior = 0;
  let larguraAnterior = 0;
  for (const item of itens) {
    const gap = item.coluna - (colunaAnterior + larguraAnterior);
    saida += ' '.repeat(Math.max(gap, 0)) + item.textoNovo;
    colunaAnterior = item.coluna;
    larguraAnterior = item.textoOriginal.length;
  }
  return saida;
}
