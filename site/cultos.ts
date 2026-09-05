/**
 * O culto como o painel de operação precisa vê-lo: nome, data legível e a
 * setlist resolvida (música + tom tocado, na ordem).
 *
 * **Nada aqui é inventado.** A fonte é `CULTOS` em
 * `gerador/repertorio/__init__.py` — cultos que já foram tocados —, que chega
 * ao site por `dados/repertorio.json` como `[slug, tom]`. Este módulo só
 * resolve o slug para a música e deriva o rótulo a partir do nome do arquivo
 * de culto, que segue a convenção do padrão visual: `DDMMM` com sufixo de
 * período opcional (`Culto_23AGO_Manha` — ver `docs/padrao-visual.md`).
 *
 * O que a convenção NÃO carrega, este módulo não mostra:
 *
 * - **Ano** — o nome do arquivo não tem ano. O rótulo é "06 de setembro",
 *   sem completar com um ano que ninguém escreveu.
 * - **Horário e dia da semana** — não existem no dado. A tela não anuncia
 *   "Domingo, 19:00" para parecer mais cheia.
 * - **Duração de música** — idem. Aparece quando o dado existir.
 */
import type { MusicaIndexada } from './repertorio.ts';

/** Uma música dentro de um culto: qual, em que tom, nesta posição. */
export interface EntradaCulto {
  slug: string;
  /** O tom em que foi tocada — pode diferir do tom de origem da música. */
  tom: string;
  musica: MusicaIndexada;
}

export interface Culto {
  /** A chave em `CULTOS`, que também é o segmento da URL: `06SET`. */
  nome: string;
  /** Data legível derivada do nome, ou `null` se o nome não seguir a convenção. */
  data: string | null;
  /** `Manhã`, `Noite`, `Sexta`… quando o nome traz o sufixo. */
  periodo: string | null;
  /** O que vai no topo da tela: "Culto de 06 de setembro" ou o nome cru. */
  rotulo: string;
  entradas: EntradaCulto[];
  /** `MMDD`, só para ordenar. Sem ano no dado, a ordem é dentro do ano. */
  ordinal: number;
  /**
   * `true` quando o culto foi criado na tela, não veio do repertório. O
   * servidor não guarda culto novo — ele existe no nome que está na URL e no
   * rascunho do aparelho —, por isso vive sob `/culto/novo/:nome`.
   */
  novo: boolean;
  /**
   * O que o usuário escreveu ao abrir o culto. **Só o culto criado na tela
   * tem** — o do repertório é rotulado pela convenção do nome.
   *
   * Estes três viajam na URL, junto com o `?ordem=`, pelo mesmo motivo que a
   * setlist viaja: o servidor não guarda nada, e o que atravessa do
   * computador para o celular é o link.
   */
  titulo?: string | null;
  /** Tema do culto (`Gratidão`, `Ceia`…). Texto livre de quem preparou. */
  tema?: string | null;
  /** A data completa, `AAAA-MM-DD`. A convenção do nome não tem ano; isto tem. */
  dataISO?: string | null;
}

const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const NOME_MES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

/**
 * O sufixo como se escreve: o nome de arquivo é ASCII, a tela não é.
 *
 * `Sexta` continua aqui porque **existe no acervo** (`28AGO_Sexta`) e o rótulo
 * dele tem que sair certo. Não é oferecido ao abrir culto — ver
 * `PERIODOS_OFERECIDOS`.
 */
export const PERIODOS: Record<string, string> = {
  Manha: 'Manhã',
  Tarde: 'Tarde',
  Noite: 'Noite',
  Sexta: 'Sexta',
};

/** O que o formulário oferece, na ordem do dia. */
export const PERIODOS_OFERECIDOS = ['Manha', 'Tarde', 'Noite'] as const;

const RE_NOME = /^(\d{2})([A-Z]{3})(?:_(.+))?$/;

/** Decompõe `28AGO_Sexta`. Nome fora da convenção volta como está, sem data. */
export function lerNomeDeCulto(nome: string): Pick<Culto, 'data' | 'periodo' | 'rotulo' | 'ordinal'> {
  const m = RE_NOME.exec(nome);
  if (!m) return { data: null, periodo: null, rotulo: nome, ordinal: 0 };

  const dia = Number(m[1]);
  const mes = MESES.indexOf(m[2]!);
  const bruto = m[3];
  const periodo = bruto ? (PERIODOS[bruto] ?? bruto.replace(/_/g, ' ')) : null;
  if (mes < 0 || dia < 1 || dia > 31) return { data: null, periodo, rotulo: nome, ordinal: 0 };

  const data = `${m[1]} de ${NOME_MES[mes]}`;
  return { data, periodo, rotulo: `Culto de ${data}`, ordinal: (mes + 1) * 100 + dia };
}

/**
 * O segmento de URL do culto. Culto do repertório é `/culto/06SET`; culto
 * criado na tela é `/culto/novo/14SET_Noite` — o prefixo é o que diz ao
 * servidor que não adianta procurar esse nome no repertório.
 */
export function segmentoCulto(culto: Pick<Culto, 'nome' | 'novo'>): string {
  return (culto.novo ? 'novo/' : '') + encodeURIComponent(culto.nome);
}

/**
 * O nome de um culto novo, na convenção do padrão visual: `14SET`, com
 * sufixo de período opcional (`14SET_Noite`).
 *
 * A data entra como o `<input type=date>` a produz (`2026-09-14`) e **o ano
 * é descartado de propósito**: a convenção não carrega ano, e inventar um
 * aqui faria o nome do culto novo divergir do nome dos que já foram tocados.
 * Período fora do vocabulário conhecido é ignorado, não vira sufixo livre —
 * o nome vai para a URL e para a chave do rascunho.
 */
export function nomeDeCultoNovo(data: string, periodo?: string): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((data ?? '').trim());
  if (!m) return null;

  const mes = Number(m[2]);
  const dia = Number(m[3]);
  if (mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;

  const sufixo = periodo && PERIODOS[periodo] ? `_${periodo}` : '';
  return `${m[3]}${MESES[mes - 1]}${sufixo}`;
}

/** A data como o `<input type=date>` a escreve, ou `null`. */
export function dataISOValida(bruto: string | undefined): string | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec((bruto ?? '').trim());
  if (!m) return null;
  const ano = Number(m[1]);
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  if (ano < 2000 || ano > 2100 || mes < 1 || mes > 12 || dia < 1 || dia > 31) return null;
  return `${m[1]}-${m[2]}-${m[3]}`;
}

/**
 * Texto que o usuário escreveu e que vai para a URL: sem caractere de
 * controle e com teto de tamanho. Vazio vira `null` — campo em branco é
 * ausência, não string vazia na query.
 */
export function textoDeCulto(bruto: string | undefined, max = 60): string | null {
  const limpo = (bruto ?? '')
    .replace(/[\u0000-\u001f\u007f]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);
  return limpo || null;
}

/**
 * O culto criado na tela, montado a partir do nome (que é a identidade) e do
 * que o usuário escreveu ao abri-lo. Nome fora da convenção volta `null` (vira
 * 404): o site não sabe rotular um culto que não sabe ler, e um rótulo cru na
 * tela principal seria pior que o erro.
 */
export function cultoNovo(
  nome: string,
  entradas: EntradaCulto[],
  extras: { titulo?: string; tema?: string; data?: string } = {},
): Culto | null {
  const lido = lerNomeDeCulto(nome);
  if (lido.data === null) return null;

  // A data completa só é aceita se concordar com o nome — o nome é a
  // identidade do culto, e um `?d=` de outro dia (link editado, link velho)
  // faria a tela mostrar uma data que não é a do culto que está aberto.
  const iso = dataISOValida(extras.data);
  const combina = iso !== null && nomeDeCultoNovo(iso, nome.split('_')[1]) === nome;
  const ano = combina ? iso!.slice(0, 4) : null;
  return {
    nome,
    entradas,
    novo: true,
    ...lido,
    // Com ano informado o rótulo pode dizer o ano; sem ele, continua sem —
    // a convenção do nome não carrega ano e a tela não inventa.
    rotulo: ano ? `${lido.rotulo} de ${ano}` : lido.rotulo,
    titulo: textoDeCulto(extras.titulo),
    tema: textoDeCulto(extras.tema, 40),
    dataISO: combina ? iso : null,
  };
}

/**
 * O que precisa acompanhar o culto novo em **todo** link do painel, junto com
 * o `?ordem=`: sem isso, o primeiro clique na setlist perderia o nome, o tema
 * e a data que o usuário acabou de escrever.
 */
export function identidadeDoCulto(culto: Culto): Record<string, string> {
  const params: Record<string, string> = {};
  if (culto.titulo) params.titulo = culto.titulo;
  if (culto.tema) params.tema = culto.tema;
  if (culto.dataISO) params.d = culto.dataISO;
  return params;
}

/**
 * Resolve os cultos do arquivo. Entrada cujo slug não existe no repertório é
 * descartada com o culto inteiro: setlist com música faltando não pode ser
 * executada, e meio culto na tela é pior que culto nenhum.
 */
export function montarCultos(
  bruto: Record<string, [string, string][]>,
  porSlug: (slug: string) => MusicaIndexada | undefined,
): Culto[] {
  const cultos: Culto[] = [];

  for (const [nome, ordem] of Object.entries(bruto)) {
    const entradas: EntradaCulto[] = [];
    let completo = ordem.length > 0;
    for (const [slug, tom] of ordem) {
      const musica = porSlug(slug);
      if (!musica) {
        completo = false;
        break;
      }
      entradas.push({ slug, tom, musica });
    }
    if (!completo) continue;
    cultos.push({ nome, entradas, novo: false, ...lerNomeDeCulto(nome) });
  }

  // Do mais recente para o mais antigo: o painel abre no último culto, que é
  // o que a banda está preparando ou acabou de tocar.
  return cultos.sort((a, b) => b.ordinal - a.ordinal || a.nome.localeCompare(b.nome, 'pt-BR'));
}
