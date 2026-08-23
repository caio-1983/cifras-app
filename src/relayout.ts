export interface ItemRelayout {
  coluna: number;
  textoOriginal: string;
  textoNovo: string;
}

/**
 * Cada item volta exatamente à coluna original que ocupava. Usada nas linhas
 * posicionais (`~`), onde a coluna marca a sílaba correspondente na letra.
 * Se um item alargar o suficiente para colidir com a coluna do próximo,
 * aplica um mínimo de 1 espaço e os itens seguintes deslizam a partir daí.
 */
export function colunaAbsoluta(itens: ItemRelayout[]): string {
  let saida = '';
  let posicaoAtual = 0;
  for (const item of itens) {
    const gapDesejado = item.coluna - posicaoAtual;
    const gap = gapDesejado < 0 ? 1 : gapDesejado;
    saida += ' '.repeat(gap) + item.textoNovo;
    posicaoAtual += gap + item.textoNovo.length;
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
