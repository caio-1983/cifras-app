/**
 * Port de `gerador/transpor.py` — as quatro funções que `rtf.py`/`html.py`
 * consomem: `passos_e_semitons`, `transpor_compasso`, `transpor_linha`,
 * `limpar_letra`.
 *
 * Reaproveita as primitivas de nota/acorde do núcleo (`parseTom`,
 * `deltaEntreTons`, `parseAcorde`, `transporNota`, `formatarAcorde`) já
 * provadas equivalentes ao Python em `tests/cruzadoGerador.test.ts` — ver
 * `docs/reconciliacao-transpositores.md`.
 *
 * `transporLinha` também reaproveita — desde a reconciliação da colisão, ela
 * é uma casca fina sobre `colunaAbsoluta` do núcleo. Durante o port ela foi
 * um porte direto e autocontido do algoritmo Python, porque os dois divergiam
 * na colisão exata (gap zero): `transpor_linha` sempre separava com 1 espaço,
 * `colunaAbsoluta` só separava na sobreposição de verdade. A divergência foi
 * resolvida no núcleo, a favor do comportamento do gerador — ver
 * `src/relayout.ts::colunaAbsoluta` e `docs/reconciliacao-transpositores.md`.
 */
import { parseTom } from '../src/tom.ts';
import { deltaEntreTons, transporNota } from '../src/nota.ts';
import { parseAcorde, formatarAcorde, ehTokenAcorde } from '../src/acorde.ts';
import { colunaAbsoluta } from '../src/relayout.ts';

/** Literais de estrutura que atravessam a transposição intactos. */
const ESTRUTURA = new Set(['|', '|:', ':|', '%', '/']);

export function passosESemitons(origem: string, destino: string): { deltaLetra: number; deltaSemitom: number } {
  return deltaEntreTons(parseTom(origem), parseTom(destino));
}

function transporToken(tok: string, deltaLetra: number, deltaSemitom: number): string {
  if (ESTRUTURA.has(tok) || !ehTokenAcorde(tok)) return tok;
  const acorde = parseAcorde(tok);
  return formatarAcorde({
    raiz: transporNota(acorde.raiz, deltaLetra, deltaSemitom),
    sufixo: acorde.sufixo,
    ...(acorde.baixo ? { baixo: transporNota(acorde.baixo, deltaLetra, deltaSemitom) } : {}),
  });
}

/**
 * Linha de compasso (`| C | Am |`): troca cada token no lugar — o
 * espaçamento original da linha é preservado porque `replace` só troca o
 * texto casado, nunca mexe no que está em volta (inclusive quando o nome do
 * acorde muda de largura). Não usar em linha posicional.
 */
export function transporCompasso(linha: string, deltaLetra: number, deltaSemitom: number): string {
  return linha.replace(/\S+/g, (tok) => transporToken(tok, deltaLetra, deltaSemitom));
}

/**
 * Linha posicional (acorde sobre a sílaba): preserva a COLUNA de cada token,
 * separando com 1 espaço quando o acorde transposto alarga e comeria a folga
 * até o próximo. O relayout em si é `colunaAbsoluta` do núcleo — aqui só
 * ficam a tokenização (`\S+` sobre texto cru, como no Python) e a
 * transposição de cada token.
 *
 * Como o gerador tokeniza texto cru, dois itens nunca chegam adjacentes na
 * origem (seriam um token só) — o ramo de "adjacência preservada" de
 * `colunaAbsoluta` fica inerte aqui, e a regra colapsa no `if/elif` de
 * `gerador/transpor.py::transpor_linha`.
 *
 * Linha sem nenhum token (vazia ou só espaço) volta IDÊNTICA à entrada
 * (`gerador/tests/test_transpor.py::test_posicional_linha_vazia`:
 * `transpor_linha('     ', 0, 0) == '     '`, não `''`).
 */
export function transporLinha(linha: string, deltaLetra: number, deltaSemitom: number): string {
  const itens = [];
  const re = /\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(linha))) {
    itens.push({
      coluna: m.index,
      textoOriginal: m[0],
      textoNovo: transporToken(m[0], deltaLetra, deltaSemitom),
    });
  }
  if (itens.length === 0) return linha;
  return colunaAbsoluta(itens);
}

/**
 * Tira o sublinhado de melisma: 'cora_ção' -> 'coração', 'San__to' -> 'Santo'.
 * Só roda em linha de letra, na emissão — nunca na transposição (ver
 * `docs/reconciliacao-transpositores.md`, seção "melisma").
 */
export function limparLetra(t: string): string {
  return t.replaceAll('_', '');
}
