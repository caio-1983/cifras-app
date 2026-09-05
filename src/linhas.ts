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

  // Letra é marcada com ">", como cifra é com "|" e posicional com "~".
  //
  // Dois motivos, nesta ordem. (1) SEPARAR ARRANJO DE LETRA: com a marca, o
  // arranjo é o arquivo sem estas linhas e a letra é só elas — extrair vira
  // um filtro, sem remontar nada e sem perder a intercalação nem a coluna
  // (ver `arranjoLetra.ts` e `docs/rumo.md`). (2) O ">" fica na coluna 0
  // como o "~", então o acorde passa a aparecer exatamente sobre a sílaba
  // também na tela de quem confere à mão — antes o "~" deslocava a leitura
  // em um caractere.
  //
  // O prefixo é sintaxe, não conteúdo: `texto` guarda a letra limpa, e o
  // serializador repõe o ">".
  if (primeiroChar === '>') {
    return { tipo: 'letra', texto: linha.slice(primeiraNaoEspaco + 1) };
  }

  // Sem marcador nenhum é erro. Antes, letra era o "qualquer outra coisa"
  // da classificação, e por isso um rótulo de seção não convertido ou uma
  // nota solta do transcritor viravam letra da música em silêncio — mesma
  // família de falha que a guarda de linha só-com-chaves acima pega.
  throw new Error(
    `linha sem marcador${localizacao(contexto)}: "${trimmed}" — letra começa com ">", cifra com "|", posicional com "~", subtítulo com "[".`,
  );
}
