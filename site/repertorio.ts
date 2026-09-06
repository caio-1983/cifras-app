/**
 * Carrega o acervo: `musicas/*.cifra` — a fonte da verdade — mais
 * `dados/repertorio.json`, a ponte que ainda existe.
 *
 * As duas fontes convivem porque nenhuma cobre a outra. O JSON tem os
 * cultos já tocados e duas músicas que o acervo ainda não tem
 * (`pai-de-multidoes`, tocada num culto, e `ah-jesus`); o acervo tem as
 * outras ~330. **Na colisão de slug, o JSON ganha**: ele é modelado à mão e
 * é o que os emissores reproduzem byte a byte nas 139 fixtures — trocá-lo
 * por uma importação automática mudaria documento já validado em produção.
 *
 * O resto do site fala com `MusicaDados`, o mesmo tipo que o emissor
 * consome, então a conversão fica contida aqui e em `cifraParaDados.ts`.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { MusicaDados } from '../gerador-ts/dados-repertorio.ts';
import { montarCultos, type Culto } from './cultos.ts';
import { parseMusica } from '../src/index.ts';
import { obterCampo } from '../src/cabecalho.ts';
import { lerTemas } from '../src/temas.ts';
import { cifraParaDados } from './cifraParaDados.ts';

export type { Culto, EntradaCulto } from './cultos.ts';

export interface MusicaIndexada extends MusicaDados {
  slug: string;
  /**
   * Hinário de origem (`HCC`) e o número do hino nele. Vivem aqui, e não em
   * `MusicaDados`, por dois motivos: `gerador-ts/dados-repertorio.ts` é
   * GERADO pelo Python e não se edita à mão, e o número não é dado que o
   * emissor precise — é identidade de biblioteca. Num hinário o número é
   * como o hino é chamado ("hino 25"), então a busca tem que achá-lo por ele.
   */
  numero?: string;
  fonte?: string;
  /**
   * Os temas do cabeçalho `temas:`, já canônicos (`src/temas.ts`). Vivem aqui
   * pelo mesmo motivo que `numero`: são identidade de biblioteca, não dado que
   * o emissor precise para desenhar a cifra.
   */
  temas?: string[];
}

/** Os campos de hinário que `MusicaDados` não carrega. Ver `MusicaIndexada`. */
type DadosComFonte = MusicaDados & { numero?: string; fonte?: string; temas?: string[] };

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

/**
 * Ordena hino por NÚMERO, não por título — é a ordem do livro, e é a única
 * coisa que a tela do hinário faz que a biblioteca não faz. Numérico, não
 * textual: em ordem de texto o 422 vem antes do 52.
 *
 * Empate acontece de verdade: o acervo tem duas transcrições do hino 25, em
 * tons diferentes. Desempata por título, para a ordem ser estável.
 */
function porNumero(a: MusicaIndexada, b: MusicaIndexada): number {
  const d = Number(a.numero) - Number(b.numero);
  return d !== 0 ? d : porTitulo(a, b);
}

export interface Repertorio {
  /** Todas as músicas, em ordem de título. */
  todas: MusicaIndexada[];
  /**
   * Só as que vêm de hinário (`fonte`), na ordem do livro. Subconjunto de
   * `todas`, não um acervo à parte: hino é música, e continua aparecendo na
   * biblioteca e entrando no culto pelo mesmo caminho de sempre.
   */
  hinos: MusicaIndexada[];
  /** Uma música pelo slug, ou `undefined`. */
  porSlug(slug: string): MusicaIndexada | undefined;
  /** Os cultos já tocados, do mais recente para o mais antigo. */
  cultos: Culto[];
  /** Um culto pelo nome (`06SET`), ou `undefined`. */
  cultoPorNome(nome: string): Culto | undefined;
}

/**
 * Lê `musicas/*.cifra`. Um arquivo que não parseia é PULADO, com aviso no
 * log: 340 músicas na tela valem mais que um servidor que não sobe por
 * causa de uma. O que não pode acontecer é o arquivo sumir em silêncio.
 */
function carregarAcervo(diretorio: string): Record<string, DadosComFonte> {
  let nomes: string[];
  try {
    nomes = readdirSync(diretorio).filter((n) => n.endsWith('.cifra'));
  } catch {
    // Sem diretório de acervo o site ainda funciona com o JSON — é o que
    // acontece em qualquer instalação que não tenha (ainda) as músicas.
    return {};
  }

  const acervo: Record<string, DadosComFonte> = {};
  for (const nome of nomes.sort()) {
    const slug = nome.replace(/\.cifra$/, '');
    try {
      const musica = parseMusica(readFileSync(join(diretorio, nome), 'utf8'), nome);
      const numero = obterCampo(musica.cabecalho, 'numero');
      const fonte = obterCampo(musica.cabecalho, 'fonte');
      // `lerTemas` devolve o canônico do vocabulário fechado (`src/temas.ts`) e
      // separa o que não reconhece. Aqui ficam só os conhecidos: é deles que a
      // biblioteca monta o filtro, e um tema fora do vocabulário viraria opção
      // que ninguém escolhe. O desconhecido não some — `lerTemas` o devolve, e
      // quem valida o acervo é que tem de olhar.
      const { temas } = lerTemas(obterCampo(musica.cabecalho, 'temas') ?? '');
      acervo[slug] = {
        ...(cifraParaDados(musica) as MusicaDados),
        ...(numero ? { numero } : {}),
        ...(fonte ? { fonte } : {}),
        ...(temas.length ? { temas } : {}),
      };
    } catch (erro) {
      console.warn(`[repertorio] ${nome} não entrou: ${(erro as Error).message}`);
    }
  }
  return acervo;
}

export function carregarRepertorio(caminho: string, diretorioAcervo?: string): Repertorio {
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

  // O acervo entra primeiro e o JSON escreve por cima: na colisão de slug,
  // quem vale é o modelo curado à mão que as fixtures reproduzem.
  const juntas: Record<string, DadosComFonte> = {
    ...(diretorioAcervo ? carregarAcervo(diretorioAcervo) : {}),
    ...bruto.musicas,
  };

  const todas = Object.entries(juntas)
    .map(([slug, m]) => ({ ...m, slug }))
    .sort(porTitulo);

  if (todas.length === 0) {
    throw new Error(`repertório vazio em "${caminho}"`);
  }

  const indice = new Map(todas.map((m) => [m.slug, m]));
  const porSlug = (slug: string) => indice.get(slug);
  const hinos = todas.filter((m) => m.fonte && m.numero).sort(porNumero);

  // `cultos` é opcional no arquivo: repertório gerado por uma versão anterior
  // do exportador não tem a chave, e o painel tem que abrir mesmo assim (vazio
  // e dizendo que está vazio) em vez de derrubar o servidor na subida.
  const cultos = montarCultos(bruto.cultos ?? {}, porSlug);

  const porNome = new Map(cultos.map((c) => [c.nome, c]));
  return { todas, hinos, porSlug, cultos, cultoPorNome: (nome) => porNome.get(nome) };
}
