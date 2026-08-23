import type { Item, ItemPosicionado, LinhaCorpo } from './tipos.ts';
import { parseAcorde } from './acorde.ts';

const TOKENS_ESTRUTURAIS = new Set(['|', '|:', ':|', '%', '/']);
const RE_ANOTACAO_COMPLETA = /^\{[^{}]*\}$/;

export interface ContextoLinha {
  numeroLinha?: number;
  nomeArquivo?: string;
}

function localizacao(contexto?: ContextoLinha): string {
  const { nomeArquivo, numeroLinha } = contexto ?? {};
  if (nomeArquivo && numeroLinha !== undefined) return ` (${nomeArquivo}:${numeroLinha})`;
  if (numeroLinha !== undefined) return ` (linha ${numeroLinha})`;
  if (nomeArquivo) return ` (${nomeArquivo})`;
  return '';
}

function tokenizarTrecho(texto: string, offsetColuna: number): ItemPosicionado[] {
  const itens: ItemPosicionado[] = [];
  const re = /\{[^{}]*\}|\S+/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(texto))) {
    const tokenTexto = m[0];
    const coluna = offsetColuna + m.index;
    const item: Item =
      RE_ANOTACAO_COMPLETA.test(tokenTexto) || TOKENS_ESTRUTURAIS.has(tokenTexto)
        ? { tipo: 'literal', texto: tokenTexto }
        : { tipo: 'acorde', acorde: parseAcorde(tokenTexto), textoOriginal: tokenTexto };
    itens.push({ coluna, item });
  }
  return itens;
}

export function classificarLinha(linha: string, contexto?: ContextoLinha): LinhaCorpo {
  if (linha.trim() === '') {
    return { tipo: 'separador' };
  }

  const trimmed = linha.trim();
  if (RE_ANOTACAO_COMPLETA.test(trimmed)) {
    throw new Error(
      `linha é só um rótulo entre chaves "${trimmed}"${localizacao(contexto)} — provavelmente um rótulo de seção não convertido para "[...]". Anotação de execução nunca aparece sozinha numa linha, sempre junto de um acorde.`,
    );
  }

  const primeiraNaoEspaco = linha.search(/\S/);
  const primeiroChar = linha[primeiraNaoEspaco];

  if (primeiroChar === '[') {
    const idxFechamento = linha.indexOf(']', primeiraNaoEspaco);
    if (idxFechamento === -1) {
      throw new Error(`subtítulo sem "]" de fechamento: "${linha}"`);
    }
    const subtituloTexto = linha.slice(primeiraNaoEspaco, idxFechamento + 1);
    const restante = linha.slice(idxFechamento + 1);
    const restanteTrim = restante.trim();
    const temCifra = restanteTrim !== '' && (restanteTrim.includes('|') || /^[A-G]/.test(restanteTrim));
    if (!temCifra) {
      return { tipo: 'subtitulo', texto: linha };
    }
    const itens: ItemPosicionado[] = [
      { coluna: primeiraNaoEspaco, item: { tipo: 'literal', texto: subtituloTexto } },
      ...tokenizarTrecho(restante, idxFechamento + 1),
    ];
    return { tipo: 'cifra', itens };
  }

  if (primeiroChar === '~') {
    const itens: ItemPosicionado[] = [
      { coluna: primeiraNaoEspaco, item: { tipo: 'literal', texto: '~' } },
      ...tokenizarTrecho(linha.slice(primeiraNaoEspaco + 1), primeiraNaoEspaco + 1),
    ];
    return { tipo: 'posicional', itens };
  }

  if (primeiroChar === '|') {
    return { tipo: 'cifra', itens: tokenizarTrecho(linha, 0) };
  }

  return { tipo: 'letra', texto: linha };
}
