/**
 * Carrega `dados/repertorio.json` — a ponte temporária entre o repertório
 * Python e o site (ver `gerador/scripts/exportar_repertorio_json.py`).
 *
 * Quando o formato `.cifra` estabilizar, este módulo passa a ler
 * `musicas/*.cifra` pelo parser do núcleo e o JSON some. O resto do site fala
 * com `MusicaDados`, que é o mesmo tipo que o emissor consome — então a troca
 * fica contida aqui.
 */
import { readFileSync } from 'node:fs';
import type { MusicaDados } from '../gerador-ts/dados-repertorio.ts';
import { montarCultos, type Culto } from './cultos.ts';

export type { Culto, EntradaCulto } from './cultos.ts';

export interface MusicaIndexada extends MusicaDados {
  slug: string;
}

interface ArquivoRepertorio {
  meta: { musicas: number; cultos?: number };
  musicas: Record<string, MusicaDados>;
  /** Cada culto: `[slug, tom tocado]`, na ordem em que foi tocado. */
  cultos?: Record<string, [string, string][]>;
}

/** Ordena por título, que é como a lista aparece na tela. `pt-BR` para o acento não jogar "ÚNICO" para o fim. */
function porTitulo(a: MusicaIndexada, b: MusicaIndexada): number {
  return a.titulo.localeCompare(b.titulo, 'pt-BR');
}

export interface Repertorio {
  /** Todas as músicas, em ordem de título. */
  todas: MusicaIndexada[];
  /** Uma música pelo slug, ou `undefined`. */
  porSlug(slug: string): MusicaIndexada | undefined;
  /** Os cultos já tocados, do mais recente para o mais antigo. */
  cultos: Culto[];
  /** Um culto pelo nome (`06SET`), ou `undefined`. */
  cultoPorNome(nome: string): Culto | undefined;
}

export function carregarRepertorio(caminho: string): Repertorio {
  let bruto: ArquivoRepertorio;
  try {
    bruto = JSON.parse(readFileSync(caminho, 'utf8')) as ArquivoRepertorio;
  } catch (erro) {
    // Sem repertório não há site. Falhar aqui, na subida, é melhor que servir
    // uma lista vazia e o usuário achar que o acervo sumiu.
    throw new Error(
      `não consegui ler o repertório em "${caminho}": ${(erro as Error).message}\n` +
        'Gere com: python gerador/scripts/exportar_repertorio_json.py',
    );
  }

  const todas = Object.entries(bruto.musicas)
    .map(([slug, m]) => ({ ...m, slug }))
    .sort(porTitulo);

  if (todas.length === 0) {
    throw new Error(`repertório vazio em "${caminho}"`);
  }

  const indice = new Map(todas.map((m) => [m.slug, m]));
  const porSlug = (slug: string) => indice.get(slug);

  // `cultos` é opcional no arquivo: repertório gerado por uma versão anterior
  // do exportador não tem a chave, e o painel tem que abrir mesmo assim (vazio
  // e dizendo que está vazio) em vez de derrubar o servidor na subida.
  const cultos = montarCultos(bruto.cultos ?? {}, porSlug);

  const porNome = new Map(cultos.map((c) => [c.nome, c]));
  return { todas, porSlug, cultos, cultoPorNome: (nome) => porNome.get(nome) };
}
