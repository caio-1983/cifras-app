import { parseTom } from './tom.ts';

/** `C`, `Ab`, `F#m` sim; `sol`, `tenor`, `` não. */
function ehTom(texto: string): boolean {
  try {
    parseTom(texto);
    return true;
  } catch {
    return false;
  }
}

const RE_CHAVE_VALOR = /^([A-Za-zÀ-ÿ][A-Za-zÀ-ÿ ]*)\s*:\s*(.*)$/;
const RE_QUALIFICADOR_FINAL = /\s*\(([^()]*)\)\s*$/;
// Só separa título de artista quando o traço tem espaço dos dois lados —
// evita cortar um título com hífen sem espaço (ex. "MEIA-NOITE"). Cobre
// travessão (–) e hífen comum (-), os dois aparecem no acervo com o mesmo
// papel aqui (ver achado item 7: mesmo separador, dois significados — mas
// medley virou arquivo separado por decisão do usuário, então num cabeçalho
// de arquivo único o traço só pode significar título–artista).
const RE_TITULO_ARTISTA = /^(.+?)\s+[–-]\s+(.+)$/;
// Campos do formato (`formato-cifra.md`). Usados só para decidir se uma linha
// em branco no meio do cabeçalho pode ser atravessada — antes da primeira
// branca, campo desconhecido continua aceito como sempre foi.
const CAMPOS_CONHECIDOS = new Set(['titulo', 'artista', 'tom', 'momento', 'tessitura', 'temas', 'numero', 'fonte']);

export interface CabecalhoBrutoNormalizado {
  /** Linhas já em "chave: valor", sem título envolvido em nada — prontas para receber o "---" na frente do corpo. */
  cabecalho: string[];
  /** Linhas que sobraram depois do cabeçalho — o corpo cru, ainda sem passar pelo resto da normalização. */
  resto: string[];
}

/**
 * Reconhece um cabeçalho cru do acervo (sem `titulo:`, sem `---`) e devolve
 * o equivalente canônico. Cobre o caso visto em `RENOVA-ME`:
 *
 * ```
 * RENOVA-ME
 * Tom: Eb (masculino)
 * ```
 *
 * → `titulo: RENOVA-ME` / `tom: Eb` / `tessitura: masculino`.
 *
 * Regras:
 * - a primeira linha não-vazia que não tem cara de "chave: valor" vira
 *   `titulo` (preservada exatamente como veio — sem mudar caixa); se tiver
 *   um traço com espaço dos dois lados (`TÍTULO – ARTISTA`), separa em
 *   `titulo` e `artista`
 * - toda linha seguinte em "chave: valor" vira campo do cabeçalho, com a
 *   chave normalizada para minúsculo (resolve de graça o `TOM:` vs `Tom:`
 *   do achado item 10)
 * - `tom: X (qualificador)` separa em dois campos: `tom: X` e
 *   `tessitura: qualificador`, nunca embutido dentro do valor de `tom`
 * - cabeçalho termina na primeira linha em branco (consome todas as
 *   consecutivas, não só uma) ou na primeira linha que não bate com
 *   "chave: valor" — o resto é corpo
 */
export function normalizarCabecalhoBruto(linhasCruas: string[]): CabecalhoBrutoNormalizado {
  let i = 0;
  while (i < linhasCruas.length && linhasCruas[i]!.trim() === '') i++;

  let titulo: string | undefined;
  const campos: { chave: string; valor: string }[] = [];
  if (i < linhasCruas.length && !RE_CHAVE_VALOR.test(linhasCruas[i]!.trim())) {
    const linhaTitulo = linhasCruas[i]!.trim();
    const tituloArtista = RE_TITULO_ARTISTA.exec(linhaTitulo);
    if (tituloArtista) {
      titulo = tituloArtista[1]!.trim();
      campos.push({ chave: 'artista', valor: tituloArtista[2]!.trim() });
    } else {
      titulo = linhaTitulo;
    }
    i++;

    // Artista em linha própria, sem travessão (achado real: "OUSADO AMOR" /
    // "ISAIAS SAAD" / "Tom: F" — três linhas soltas, nenhum separador entre
    // título e artista). Só reconhece quando a linha não é "chave: valor"
    // (senão já seria capturada pelo loop abaixo, ex. teria pulado direto
    // pra "Tom: F") nem já parece início de corpo (`[`, `{`, `~`, `|`) — sem
    // esses dois filtros, uma música cujo corpo abre com letra solta, sem
    // marcador nenhum, teria a primeira linha de letra virando "artista"
    // por engano.
    if (
      !tituloArtista &&
      i < linhasCruas.length &&
      linhasCruas[i]!.trim() !== '' &&
      !RE_CHAVE_VALOR.test(linhasCruas[i]!.trim()) &&
      !/^[[{~|]/.test(linhasCruas[i]!.trim())
    ) {
      campos.push({ chave: 'artista', valor: linhasCruas[i]!.trim() });
      i++;
    }
  }

  while (i < linhasCruas.length) {
    const linha = linhasCruas[i]!.trim();
    if (linha === '') {
      let j = i;
      while (j < linhasCruas.length && linhasCruas[j]!.trim() === '') j++;
      // Linha em branco DENTRO do cabeçalho (achado real, CANÇÃO DO CÉU:
      // título, duas brancas, "Tom: E") — sem tolerar isso, o tom se perde
      // inteiro. Mas a branca é justamente o que hoje protege contra engolir
      // letra que tem dois-pontos ("Senhor: eu te amo"), então depois dela só
      // um campo CONHECIDO continua o cabeçalho; qualquer outra coisa é corpo.
      const proxima = j < linhasCruas.length ? linhasCruas[j]!.trim() : '';
      const campo = RE_CHAVE_VALOR.exec(proxima);
      if (!campo || !CAMPOS_CONHECIDOS.has(campo[1]!.trim().toLowerCase())) {
        i = j;
        break;
      }
      i = j;
      continue;
    }
    const m = RE_CHAVE_VALOR.exec(linha);
    if (!m) break;

    const chave = m[1]!.trim().toLowerCase();
    let valor = m[2]!.trim();

    if (chave === 'tom') {
      const qualificador = RE_QUALIFICADOR_FINAL.exec(valor);
      if (qualificador) {
        valor = valor.slice(0, qualificador.index).trim();
        campos.push({ chave: 'tom', valor });
        campos.push({ chave: 'tessitura', valor: qualificador[1]!.trim() });
        i++;
        continue;
      }
      // Sem parênteses também acontece: `Atos 2` traz "Tom: C tenor". Quem
      // autoriza o corte é o parser de tom, não uma lista de palavras — só
      // separa se o que vem antes do espaço for um tom de verdade. Assim
      // "sol maior" fica inteiro e a validação reclama dele, em vez de
      // virar `tom: sol` silenciosamente.
      const solto = /^(\S+)\s+(.+)$/.exec(valor);
      if (solto && ehTom(solto[1]!)) {
        campos.push({ chave: 'tom', valor: solto[1]! });
        campos.push({ chave: 'tessitura', valor: solto[2]!.trim() });
        i++;
        continue;
      }
    }
    campos.push({ chave, valor });
    i++;
  }

  const cabecalho = [
    ...(titulo !== undefined ? [`titulo: ${titulo}`] : []),
    ...campos.map((c) => `${c.chave}: ${c.valor}`),
  ];

  return { cabecalho, resto: linhasCruas.slice(i) };
}
