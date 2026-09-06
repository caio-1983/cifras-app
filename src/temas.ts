/**
 * TEMAS DA MÚSICA — o assunto da letra, campo `temas:` do cabeçalho.
 *
 * Tema é propriedade **da música**: `AO ÚNICO` fala de adoração em qualquer
 * culto em que entre. Não confundir com dois vizinhos que já existem no
 * projeto e significam outra coisa:
 *
 * - **`momento:`** (`Ofertório`, `Apelo / Ceia`) é o papel da música **num
 *   culto específico** — hoje mora no cabeçalho da música por remendo, e
 *   `docs/site.md` registra a pendência de mover para a entrada do culto.
 *   Quatro arquivos do acervo usavam `momento:` para guardar *tema*
 *   (`adoracao`, `celebracao`); esses migram para cá, e o `momento` fica só
 *   com o sentido de papel-no-culto.
 * - **`?tema=`** (singular) na URL do painel é o tema **do culto** — a
 *   mensagem da noite, escrita pelo diretor ao abrir o culto. Por isso o
 *   campo da música é `temas`, plural: são coisas diferentes e não podem
 *   colidir no vocabulário.
 *
 * A ordem é significativa
 * -----------------------
 * `temas: Amor de Deus, Graça, Misericórdia` diz que a música é *sobre* amor
 * de Deus, e que graça e misericórdia aparecem — nessa ordem de relevância. A
 * classificação produz três; o formato aceita de um a três, porque o acervo
 * tem arquivo antigo com um só e reescrever isso seria inventar os outros dois.
 *
 * Vocabulário fechado, grafia aberta
 * ----------------------------------
 * Ao contrário dos subtítulos, aqui a lista canônica é **fechada**: tema serve
 * para filtrar a biblioteca, e vocabulário livre transforma o filtro em ruído
 * (`Adoração`, `adoração` e `ADORAÇÃO` viram três chips). O que é aberto é a
 * *grafia* de entrada — acento, caixa e sinônimo casam com o canônico.
 *
 * Tema desconhecido não vira tema: `normalizarTema` devolve `undefined`, e
 * quem chama decide se avisa ou descarta. Nunca se inventa um rótulo para
 * caber — é a mesma regra que faz a busca não chutar tema a partir da letra
 * (`docs/site.md`).
 */

interface EntradaTema {
  canonico: string;
  /** Grafias que casam com o canônico. O próprio canônico não precisa entrar. */
  variantes: string[];
}

/**
 * A lista canônica. Enxugada de ~80 termos levantados para 51, unificando
 * sinônimo e sobreposição — lista longa demais não classifica melhor, só
 * espalha a mesma música por rótulos concorrentes e quebra a busca.
 *
 * Os agrupamentos abaixo são de leitura, não existem no dado: o campo guarda
 * o rótulo, e nada mais.
 */
const TABELA: EntradaTema[] = [
  // ---- Deus e seus atributos
  { canonico: 'Adoração', variantes: [] },
  { canonico: 'Louvor', variantes: [] },
  { canonico: 'Gratidão', variantes: ['agradecimento'] },
  { canonico: 'Amor de Deus', variantes: ['amor'] },
  { canonico: 'Presença de Deus', variantes: ['presença'] },
  // Majestade e glória descrevem o mesmo gesto da letra — engrandecer quem
  // Deus é. Separados, dividiam as mesmas músicas em dois chips.
  { canonico: 'Glória de Deus', variantes: ['glória', 'majestade de deus', 'majestade'] },
  { canonico: 'Santidade', variantes: [] },
  { canonico: 'Fidelidade de Deus', variantes: ['fidelidade'] },
  { canonico: 'Bondade de Deus', variantes: ['bondade'] },

  // ---- Cristo e a salvação
  { canonico: 'Jesus Cristo', variantes: ['jesus', 'cristo'] },
  { canonico: 'Trindade', variantes: [] },
  { canonico: 'Cruz', variantes: ['calvário', 'sacrifício'] },
  { canonico: 'Ressurreição', variantes: [] },
  // Redenção é o mesmo evento pelo lado do preço pago; como filtro, é um só.
  { canonico: 'Salvação', variantes: ['redenção', 'vida nova'] },
  { canonico: 'Graça', variantes: [] },
  { canonico: 'Misericórdia', variantes: ['compaixão'] },
  { canonico: 'Perdão', variantes: [] },
  { canonico: 'Espírito Santo', variantes: ['avivamento'] },

  // ---- Vida cristã
  { canonico: 'Fé', variantes: [] },
  { canonico: 'Esperança', variantes: [] },
  { canonico: 'Confiança em Deus', variantes: ['confiança', 'coragem'] },
  { canonico: 'Obediência', variantes: [] },
  // A unificação pedida pelo usuário: entrega, entrega a Deus e consagração
  // são o mesmo ato, e três rótulos só dificultariam achar a música.
  { canonico: 'Entrega', variantes: ['entrega a deus', 'consagração', 'rendição'] },
  { canonico: 'Arrependimento', variantes: ['quebrantamento'] },
  { canonico: 'Santificação', variantes: ['pureza'] },
  { canonico: 'Humildade', variantes: [] },
  { canonico: 'Perseverança', variantes: [] },
  { canonico: 'Transformação', variantes: ['renovação'] },
  { canonico: 'Identidade em Cristo', variantes: ['identidade', 'filiação'] },
  { canonico: 'Propósito', variantes: ['chamado', 'vocação'] },

  // ---- Relacionamento com Deus
  { canonico: 'Oração', variantes: [] },
  { canonico: 'Busca por Deus', variantes: ['busca', 'desejo por deus', 'sede de deus'] },
  // "Comunhão com Deus" é intimidade; "Comunhão" sozinha, mais abaixo, é
  // entre irmãos. Duas coisas, e o sufixo é o que as separa.
  { canonico: 'Intimidade com Deus', variantes: ['intimidade', 'comunhão com deus', 'relacionamento com deus'] },
  { canonico: 'Clamor', variantes: [] },
  { canonico: 'Dependência de Deus', variantes: ['dependência'] },

  // ---- Luta e cuidado
  { canonico: 'Provação', variantes: ['tribulação', 'luta', 'deserto'] },
  { canonico: 'Medo', variantes: ['ansiedade'] },
  { canonico: 'Dor', variantes: ['sofrimento', 'solidão'] },
  { canonico: 'Consolo', variantes: ['conforto'] },
  { canonico: 'Proteção de Deus', variantes: ['proteção', 'refúgio', 'cuidado de deus'] },
  { canonico: 'Libertação', variantes: ['liberdade'] },
  { canonico: 'Restauração', variantes: ['cura'] },
  { canonico: 'Vitória', variantes: ['superação', 'triunfo'] },
  { canonico: 'Batalha espiritual', variantes: ['guerra espiritual'] },

  // ---- Igreja e missão
  { canonico: 'Igreja', variantes: ['corpo de cristo'] },
  { canonico: 'Comunhão', variantes: ['unidade'] },
  { canonico: 'Missão', variantes: ['evangelização', 'serviço', 'discipulado'] },
  { canonico: 'Evangelho', variantes: ['boas novas'] },
  { canonico: 'Reino de Deus', variantes: ['reino'] },

  // ---- Últimas coisas e Palavra
  { canonico: 'Volta de Cristo', variantes: ['segunda vinda', 'arrebatamento'] },
  { canonico: 'Vida eterna', variantes: ['eternidade', 'céu'] },
  { canonico: 'Palavra de Deus', variantes: ['palavra', 'verdade'] },
  { canonico: 'Promessas de Deus', variantes: ['promessa', 'aliança'] },
];

/** Quantos temas uma música carrega. A classificação produz `MAX`. */
export const MAX_TEMAS = 3;

/** A lista canônica, na ordem de `TABELA` — é o vocabulário do classificador. */
export const TEMAS_CANONICOS: readonly string[] = TABELA.map((e) => e.canonico);

const RE_DIACRITICOS = new RegExp('[\\u0300-\\u036f]', 'g');

function chave(texto: string): string {
  return texto.normalize('NFD').replace(RE_DIACRITICOS, '').toLowerCase().trim();
}

/** Grafia normalizada → canônico. Montado uma vez; a busca é O(1). */
const INDICE = new Map<string, string>();
for (const entrada of TABELA) {
  INDICE.set(chave(entrada.canonico), entrada.canonico);
  for (const variante of entrada.variantes) {
    INDICE.set(chave(variante), entrada.canonico);
  }
}

/**
 * `adoracao`, `ADORAÇÃO` e `Adoração` → `Adoração`. Fora do vocabulário →
 * `undefined`, nunca um palpite.
 */
export function normalizarTema(bruto: string): string | undefined {
  return INDICE.get(chave(bruto));
}

export interface TemasLidos {
  /** Os temas reconhecidos, na ordem em que vieram, sem repetição. */
  temas: string[];
  /** O que não casou com o vocabulário — para o chamador avisar, não descartar em silêncio. */
  desconhecidos: string[];
}

/**
 * Lê o valor cru do campo `temas:` — `"Amor de Deus, Graça, Misericórdia"`.
 *
 * Item vazio é ignorado (vírgula sobrando não é erro de conteúdo). Repetido
 * entra uma vez só: a ordem é relevância, e um tema não pode ser mais e menos
 * relevante que ele mesmo.
 */
export function lerTemas(valor: string): TemasLidos {
  const temas: string[] = [];
  const desconhecidos: string[] = [];

  for (const parte of valor.split(',')) {
    const bruto = parte.trim();
    if (bruto === '') continue;
    const canonico = normalizarTema(bruto);
    if (canonico === undefined) {
      desconhecidos.push(bruto);
    } else if (!temas.includes(canonico)) {
      temas.push(canonico);
    }
  }

  return { temas, desconhecidos };
}

/** O inverso de `lerTemas`, para escrever de volta no cabeçalho. */
export function formatarTemas(temas: readonly string[]): string {
  return temas.join(', ');
}
