interface EntradaSinonimo {
  canonico: string;
  variantes: string[];
}

// Núcleo documentado em formato-cifra.md, mais os rótulos que o achado
// encontrou repetidos no acervo real (Intro/Solo com várias grafias).
// "Verso N" e "Ponte N" têm número dinâmico — tratados à parte, por regex,
// não entram nesta tabela.
const TABELA: EntradaSinonimo[] = [
  { canonico: 'Intro', variantes: ['intro', 'introdução', 'introducao'] },
  { canonico: 'Interlúdio', variantes: ['interlúdio', 'interludio'] },
  { canonico: 'Modulação', variantes: ['modulação', 'modulacao'] },
  { canonico: 'Pré-refrão', variantes: ['pré-refrão', 'pre-refrao', 'prerrefrao'] },
  { canonico: 'Refrão', variantes: ['refrão', 'refrao'] },
  { canonico: 'Ponte', variantes: ['ponte'] },
  { canonico: 'Rampa', variantes: ['rampa'] },
  { canonico: 'Tag', variantes: ['tag'] },
  // "só piano" NÃO é sinônimo de Solo: diz QUAL instrumento toca, e essa
  // informação é do arranjo. Evidência: musicas/ruja-o-leao.cifra, curado
  // à mão pelo usuário, preserva "[Só piano]". Vira rótulo livre.
  { canonico: 'Solo', variantes: ['solo'] },
  { canonico: 'Instrumental', variantes: ['instrumental'] },
  { canonico: 'Versos', variantes: ['versos'] },
  { canonico: 'Pontes', variantes: ['pontes'] },
  { canonico: 'Transição', variantes: ['transição', 'transicao'] },
  { canonico: 'Final', variantes: ['final', 'fim'] },
];

// Separador entre a palavra-base e o número aceita espaço, "_" ou "-" —
// "estrofe_1" (achado real) usa "_", "verso 1" usa espaço.
const RE_VERSO_OU_PONTE_NUMERADO = /^(verso|estrofe|ponte)[\s_-]*(\d+)$/i;

const RE_DIACRITICOS = new RegExp('[\\u0300-\\u036f]', 'g');

function semAcento(texto: string): string {
  return texto.normalize('NFD').replace(RE_DIACRITICOS, '');
}

function casarSinonimo(conteudo: string): { rotulo: string; reconhecido: boolean } {
  const trimado = conteudo.trim();

  const numerado = RE_VERSO_OU_PONTE_NUMERADO.exec(trimado);
  if (numerado) {
    const base = numerado[1]!.toLowerCase();
    const canonico = base === 'ponte' ? 'Ponte' : 'Verso'; // "verso" e "estrofe" são o mesmo conceito
    return { rotulo: `${canonico} ${numerado[2]}`, reconhecido: true };
  }

  const normalizadoBusca = semAcento(trimado).toLowerCase();
  for (const entrada of TABELA) {
    for (const variante of entrada.variantes) {
      const varianteBusca = semAcento(variante).toLowerCase();
      if (normalizadoBusca === varianteBusca) {
        return { rotulo: entrada.canonico, reconhecido: true };
      }
      // O separador entre o rótulo e o qualificador pode ser espaço, "_" ou
      // "-": `refrão_2x` e `refrão-2x` são achados reais (REINA, DOCE NOME),
      // e sem isso o rótulo ficava `[refrão_2x]` — minúsculo, irreconhecível,
      // e sem casar com o `[Refrão]` anterior na materialização.
      //
      // A tabela é varrida em ordem, e `Pré-refrão` vem antes de `Refrão`:
      // o hífen do nome dele é casado como parte da variante, não como
      // separador.
      const separador = normalizadoBusca.charAt(varianteBusca.length);
      if (normalizadoBusca.startsWith(varianteBusca) && [' ', '_', '-'].includes(separador)) {
        const resto = trimado.slice(variante.length + 1).trim();
        return { rotulo: `${entrada.canonico} ${resto}`, reconhecido: true };
      }
    }
  }

  return { rotulo: trimado, reconhecido: false };
}

// Rótulos "instrumentais" do formato-cifra.md, mais Final — achado real
// (ESTAMOS DE PÉ) mostrou que ele se comporta igual: cifra vem na própria
// linha do marcador, nunca tem letra abaixo. Diferente de Verso/Refrão/
// Ponte/etc, que esperam corpo abaixo e cujo marcador sozinho, sem nada
// depois, é sinal de seção só-referência (ver materializacaoSecoes.ts).
const ROTULOS_SEM_CORPO_ABAIXO = new Set(['Intro', 'Interlúdio', 'Modulação', 'Final']);

/**
 * true quando o rótulo canônico (`[Verso 2]`, `[Refrão]`...) é de um tipo
 * que normalmente tem letra/cifra abaixo dele — usado para distinguir
 * "seção vazia porque é referência a outra" de "seção instrumental que
 * nunca teve corpo, por definição" (`[Intro]`, `[Final]`...).
 */
export function esperaCorpoAbaixo(rotuloComColchetes: string): boolean {
  const m = /^\[([^\]]*)\]/.exec(rotuloComColchetes.trim());
  if (!m) return true;
  const base = m[1]!.replace(/\s+\d+$/, '').trim();
  if (ROTULOS_SEM_CORPO_ABAIXO.has(base)) return false;

  // Qualificador depois do rótulo instrumental: `[Intro teclado]`,
  // `[Intro todos FORTE]`, `[Intro 2X]`, `[Final da música]`. Comparar o
  // rótulo inteiro fazia o importador RECUSAR um arquivo que já estava
  // certo — `musicas/ruja-o-leao.cifra`, curado à mão, tem exatamente
  // `[Intro teclado]` sozinho seguido de `[Intro todos FORTE] | Am |...`.
  //
  // Só vale para os instrumentais: em `TU ÉS BOM` um `[Refrão]` vazio
  // seguido de outro marcador também existe, e ali falhar alto é o
  // comportamento certo — foi resolvido com curadoria humana. Por isso a
  // regra olha a classe do rótulo, não a vizinhança da linha.
  const primeiraPalavra = base.split(/\s+/)[0] ?? '';
  return !ROTULOS_SEM_CORPO_ABAIXO.has(primeiraPalavra);
}

export interface ResultadoNormalizacaoSubtitulo {
  /** Texto final, já entre colchetes — pronto para virar uma linha de subtítulo do `.cifra`. */
  texto: string;
  /** false quando o rótulo não bateu com nenhum sinônimo conhecido e foi preservado como veio. */
  reconhecido: boolean;
}

// O rótulo antes dos dois pontos nunca contém barra. Sem excluir "|", a
// repetição `|:` era lida como o separador do rótulo e "INTRODUÇÃO   |: F |"
// virava `[Intro |] F | ...` — a barra de abertura sumia do compasso.
const RE_DOIS_PONTOS = /^([^:{}[\]|]+):(.*)$/;

// Rótulo sem delimitador nenhum, separado da cifra só por espaço:
// "INTRODUÇÃO                |: F | C :|". A barra de compasso é o
// delimitador de fato. Quem impede isto de comer uma linha de cifra comum
// ("C9        | G |") não é a forma, é o vocabulário: sem sinônimo
// reconhecido o importador descarta a conversão (ver `importador.ts`).
const RE_ROTULO_ANTES_DE_COMPASSO = /^([^|:{}[\]]+?)\s+(\|.*)$/;

/**
 * Normaliza um rótulo de seção cru do acervo (`INTRO`, `Introdução:`,
 * `{intro}`, `[Intro teclado]`, `Todos`, `Introdução: | A | % | ... |`...)
 * para a forma canônica `[Rótulo]` usada no `.cifra`. Sinônimo bate inteiro
 * ou como prefixo de palavra — nesse caso o restante (`teclado`,
 * `todos FORTE`) é preservado como qualificador depois do rótulo canônico.
 * Sem sinônimo conhecido, o texto original é preservado entre colchetes,
 * sem inventar rótulo.
 *
 * O delimitador pode ser `[...]`, `{...}` ou `rótulo:` — os três aceitam
 * conteúdo depois (cifra na mesma linha, como `Introdução: | A | % | ... |`
 * ou `[Intro] | C | ... |`), preservado depois do rótulo canônico com um
 * espaço só, não o espaçamento original.
 *
 * Não resolve frase de referência ("Volta na INTRO" continua livre — isso é
 * trabalho da materialização de seção referenciada, não de normalização de
 * rótulo) nem decide se uma repetição da mesma seção deveria ganhar número
 * (`[Refrão 2]`) — isso depende do conteúdo, é curadoria humana.
 */
export function normalizarSubtitulo(bruto: string): ResultadoNormalizacaoSubtitulo {
  const trimado = bruto.trim();

  const matchColchetes = /^\[([^\]]*)\](.*)$/.exec(trimado);
  const matchChaves = /^\{([^{}]*)\}(.*)$/.exec(trimado);
  const matchDoisPontos = RE_DOIS_PONTOS.exec(trimado);
  const matchAntesDeCompasso = RE_ROTULO_ANTES_DE_COMPASSO.exec(trimado);

  let conteudo: string;
  let sufixoBruto = '';
  if (matchColchetes) {
    conteudo = matchColchetes[1]!;
    sufixoBruto = matchColchetes[2] ?? '';
  } else if (matchChaves) {
    conteudo = matchChaves[1]!;
    sufixoBruto = matchChaves[2] ?? '';
  } else if (matchDoisPontos) {
    conteudo = matchDoisPontos[1]!;
    sufixoBruto = matchDoisPontos[2] ?? '';
  } else if (matchAntesDeCompasso) {
    conteudo = matchAntesDeCompasso[1]!;
    sufixoBruto = matchAntesDeCompasso[2] ?? '';
  } else {
    conteudo = trimado;
  }

  const sufixoTrimado = sufixoBruto.trim();
  const sufixo = sufixoTrimado === '' ? '' : ` ${sufixoTrimado}`;

  const { rotulo, reconhecido } = casarSinonimo(conteudo);
  return { texto: `[${rotulo}]${sufixo}`, reconhecido };
}
