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
}

const MESES = ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'];
const NOME_MES = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

/** O sufixo como se escreve: o nome de arquivo é ASCII, a tela não é. */
const PERIODOS: Record<string, string> = { Manha: 'Manhã', Noite: 'Noite', Sexta: 'Sexta' };

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
    cultos.push({ nome, entradas, ...lerNomeDeCulto(nome) });
  }

  // Do mais recente para o mais antigo: o painel abre no último culto, que é
  // o que a banda está preparando ou acabou de tocar.
  return cultos.sort((a, b) => b.ordinal - a.ordinal || a.nome.localeCompare(b.nome, 'pt-BR'));
}
