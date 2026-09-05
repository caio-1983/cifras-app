import { normalizarCabecalhoBruto } from './normalizacaoCabecalho.ts';
import { expandirTabs, normalizarEspacamentoCompasso } from './normalizacao.ts';
import { normalizarSubtitulo } from './sinonimosSubtitulo.ts';
import { marcarLinhasPosicionaisCruas } from './deteccaoPosicionalCrua.ts';
import { materializarSecoesReferenciadas } from './materializacaoSecoes.ts';
import { marcarAnotacoesDeExecucao } from './anotacaoExecucao.ts';
import { parseMusica } from './index.ts';
import { parseTom } from './tom.ts';
import type { Musica } from './tipos.ts';

// Uma linha crua é candidata a rótulo de subtítulo quando começa com "["
// ou "{" (forma já delimitada, sinal inequívoco), ou tem a forma solta
// "rótulo: resto" (sem chave/colchete antes dos dois pontos). O segundo
// caso é ambíguo — uma linha de letra comum pode ter dois pontos ("Ele
// disse: eu vou") — por isso só vira subtítulo se o rótulo bater com um
// sinônimo conhecido (ver `normalizarLinhaDeSubtituloSeForCandidata`).
const RE_ROTULO_SOLTO_COM_DOIS_PONTOS = /^[^:{}[\]]+:.*$/;

// Terceira forma solta: rótulo sem dois pontos, separado da cifra só por
// espaço ("INTRODUÇÃO   |: F | C :|"). Tão ambígua quanto a dos dois pontos
// — "C9   | G |" tem a mesma forma — e protegida do mesmo jeito: só
// converte se o rótulo bater com um sinônimo conhecido.
const RE_ROTULO_SOLTO_ANTES_DE_COMPASSO = /^[^|:{}[\]]+?\s+\|.*$/;

function pareceCandidatoDeSubtitulo(linha: string): boolean {
  const trimada = linha.trim();
  if (trimada.startsWith('[') || trimada.startsWith('{')) return true;
  return RE_ROTULO_SOLTO_COM_DOIS_PONTOS.test(trimada) || RE_ROTULO_SOLTO_ANTES_DE_COMPASSO.test(trimada);
}

function normalizarLinhaDeSubtituloSeForCandidata(linha: string): string {
  if (!pareceCandidatoDeSubtitulo(linha)) return linha;
  const trimada = linha.trim();
  const jaDelimitada = trimada.startsWith('[') || trimada.startsWith('{');
  const resultado = normalizarSubtitulo(linha);
  // Forma já delimitada ([...]/{...}) sempre vira subtítulo, mesmo sem
  // sinônimo reconhecido (rótulo livre preservado). Forma solta
  // "rótulo: resto" só vira subtítulo quando reconhecida — evita
  // transformar uma linha de letra comum com dois pontos em subtítulo
  // falso.
  return jaDelimitada || resultado.reconhecido ? resultado.texto : linha;
}

/**
 * Espaço/tab sobrando no FINAL de uma linha nunca carrega significado
 * neste formato (diferente de espaço no início/meio, que pode ser
 * alinhamento posicional de verdade) — seguro remover sempre. Achado
 * real: exportação de Google Doc convertido (ver `converter-cifras.gs.js`)
 * deixa espaço sobrando no fim de linha de cifra (`|: E | % :| ` com
 * espaço antes da quebra).
 */
function semEspacoNoFinal(linha: string): string {
  return linha.replace(/[ \t]+$/, '');
}

/**
 * Colapsa duas ou mais linhas em branco seguidas em uma só. Achado real:
 * exportação de Google Doc convertido usa espaçamento de parágrafo do
 * Word, que vira duas linhas em branco entre blocos (em vez de uma) —
 * artefato do meio de origem, sem informação nenhuma além de "aqui separa
 * uma seção da outra", que uma linha em branco já comunica. Os arquivos
 * `.cifra` curados hoje usam sempre uma linha só como separador.
 */
function colapsarLinhasEmBrancoConsecutivas(linhas: string[]): string[] {
  const saida: string[] = [];
  for (const linha of linhas) {
    const ehVazia = linha.trim() === '';
    if (ehVazia && saida.length > 0 && saida[saida.length - 1]!.trim() === '') continue;
    saida.push(linha);
  }
  return saida;
}

/**
 * Aplica a normalização de espaçamento do achado item 9 (`|Am|G|` →
 * `| Am | G |`) só onde ela é segura.
 *
 * **Nunca em linha posicional.** Numa linha `~` a coluna de cada item É o
 * conteúdo — o acorde fica sobre a sílaba de baixo. Inserir um espaço ali
 * move o acorde de sílaba, que é justamente o erro que o formato existe
 * para evitar. Por isso roda depois de `marcarLinhasPosicionaisCruas`: só
 * assim dá para saber quais linhas já são posicionais.
 *
 * Em linha de compasso o relayout preserva largura, não coluna, então
 * reespaçar não tem efeito colateral. Vale também para a cifra que vem na
 * mesma linha de um subtítulo (`[Ponte] | G7M | A | Bm7 |D/F# |`, caso real
 * de EU VOU CONSTRUIR), preservando o rótulo intacto.
 */
function normalizarEspacamentoSeForCifra(linha: string): string {
  return sobreORegiaoDeCifra(linha, normalizarEspacamentoCompasso);
}

/**
 * Marca `2x`/`pausa` como anotação `{...}` (ver `anotacaoExecucao.ts`), com
 * a mesma restrição do reespaçamento: **nunca em linha posicional**. As
 * chaves acrescentam dois caracteres, e numa linha `~` isso empurraria todos
 * os itens seguintes para fora da sílaba.
 */
function marcarAnotacoesSeForCifra(linha: string): string {
  return sobreORegiaoDeCifra(linha, marcarAnotacoesDeExecucao);
}

/**
 * Aplica `transformar` só na parte da linha que é cifra, preservando o
 * rótulo de subtítulo quando houver — e devolve a linha intacta quando ela
 * não for cifra (letra, separador) ou for posicional.
 *
 * **Nunca em linha posicional.** Numa linha `~` a coluna de cada item É o
 * conteúdo — o acorde fica sobre a sílaba de baixo, e qualquer mudança de
 * largura move o acorde de sílaba. Por isso as duas transformações rodam
 * depois de `marcarLinhasPosicionaisCruas`: é o único momento em que se
 * sabe quem é posicional.
 *
 * Em linha de compasso o relayout preserva largura, não coluna, então
 * mexer no espaçamento não tem efeito colateral.
 */
function sobreORegiaoDeCifra(linha: string, transformar: (trecho: string) => string): string {
  const trimada = linha.trim();
  if (trimada.startsWith('~')) return linha;
  if (trimada.startsWith('|')) return transformar(linha);

  const subtituloComCifra = /^(\s*\[[^\]]*\]\s*)(.*)$/.exec(linha);
  if (subtituloComCifra && subtituloComCifra[2]!.includes('|')) {
    return subtituloComCifra[1]! + transformar(subtituloComCifra[2]!);
  }
  return linha;
}

/**
 * Marca com ">" toda linha de letra — o que sobra depois de reconhecer
 * separador, subtítulo (`[`), posicional (`~`) e compasso (`|`).
 *
 * Roda por ÚLTIMO, depois de a estrutura estar decidida: antes de
 * `marcarLinhasPosicionaisCruas` uma linha de acorde crua ainda não tem `~`
 * e seria marcada como letra, o que a transformaria em texto cantado e
 * destruiria a cifra em silêncio.
 */
function marcarLinhasDeLetra(linhas: string[]): string[] {
  return linhas.map((linha) => {
    const trimada = linha.trim();
    if (trimada === '') return linha;
    if (/^[[~|>]/.test(trimada)) return linha;
    // Barra de compasso em qualquer posição também é cifra, não só no
    // começo da linha — mesma regra de `classificarLinha`, e pelo mesmo
    // motivo: a linha que abre com o acorde de entrada e só depois marca
    // o compasso virava letra cantada. O recuo original é preservado,
    // porque nessas linhas a coluna posiciona o acorde.
    if (/(?:^|\s)\|(?:$|\s)/.test(linha)) return linha;
    return `>${trimada}`;
  });
}

/**
 * Recusa acorde grudado em outro (`C#Bm7` = `C#`+`Bm7`, `EGF#` =
 * `E`+`G`+`F#`) — achado real em `EU E MINHA CASA`, onde o documento traz
 * `| A | B |C#Bm7 | EGF# |`.
 *
 * O parser de acorde é opaco quanto a sufixo, de propósito: é o que o torna
 * imune a notação que a amostra ainda não mostrou. O efeito colateral é que
 * ele aceita `Bm7` como sufixo de `C#` sem reclamar — e depois que o
 * espaçamento ao redor da barra é normalizado, um acorde grudado importaria
 * limpo como um acorde que não existe. Falha silenciosa, o pior modo.
 *
 * A regra: **nenhum sufixo começa com maiúscula A-G.** Conferido contra o
 * acervo validado (673 acordes, 10 sufixos distintos: vazio, `m`, `m7`,
 * `7`, `9`, `4`, `7+`, `7M`...). Separar automaticamente seria adivinhar
 * (`C#Bm7` também poderia ser uma notação desconhecida), então o certo é
 * recusar e mandar para curadoria humana.
 *
 * Fica no importador, não no núcleo: a opacidade do `parseAcorde` é
 * propriedade documentada e validada em produção, e o portão é a importação.
 */
function recusarAcordesGrudados(musica: Musica, nomeArquivo?: string): void {
  const onde = nomeArquivo === undefined ? '' : ` (${nomeArquivo})`;
  for (const linha of musica.corpo) {
    if (linha.tipo !== 'cifra' && linha.tipo !== 'posicional') continue;
    for (const { item } of linha.itens) {
      if (item.tipo !== 'acorde') continue;
      if (!/^[A-G]/.test(item.acorde.sufixo)) continue;
      throw new Error(
        `acorde "${item.textoOriginal}" parece dois acordes grudados sem espaço${onde} — ` +
          'nenhum sufixo de acorde começa com maiúscula A-G. Separe à mão antes de importar: ' +
          'adivinhar onde termina um acorde e começa o outro produziria cifra errada.',
      );
    }
  }
}

/**
 * Importa uma cifra crua (texto colado do acervo, sem curadoria) e devolve
 * o texto final no formato `.cifra` canônico, pronto para salvar em
 * `musicas/*.cifra`. Encadeia, na ordem certa, as peças já testadas
 * isoladamente:
 *
 * 1. separa cabeçalho cru do corpo (`normalizarCabecalhoBruto`), depois de
 *    tirar BOM e normalizar quebra de linha `\r\n`
 * 2. remove espaço/tab sobrando no final de cada linha (`semEspacoNoFinal`)
 *    — nunca carrega significado, diferente do espaço no início/meio
 * 3. expande tabs em cada linha do corpo, antes de qualquer decisão de
 *    coluna (`expandirTabs`) — seguro rodar em toda linha: linha sem tab
 *    volta idêntica
 * 4. normaliza rótulo de subtítulo cru pra forma canônica `[Rótulo]`
 *    (`normalizarSubtitulo`), só nas linhas candidatas
 * 5. materializa seção que só remete a uma anterior
 *    (`materializarSecoesReferenciadas`) — precisa dos rótulos já
 *    canônicos do passo 4 pra casar repetição do mesmo rótulo
 * 6. marca linha de cifra crua sem `~` (`marcarLinhasPosicionaisCruas`) —
 *    depois da materialização, de propósito: a decisão "a próxima linha
 *    não é vazia" precisa olhar a estrutura final, já com as seções
 *    materializadas (uma seção duplicada por materialização também
 *    precisa ganhar `~` nas suas próprias linhas de cifra crua)
 * 7. normaliza espaçamento ao redor de `|` (`normalizarEspacamentoCompasso`,
 *    achado item 9) só em linha de compasso e na cifra que acompanha um
 *    subtítulo — nunca em linha posicional, onde a coluna é o conteúdo; por
 *    isso depois do passo 6, o único momento em que se sabe quem é posicional
 * 8. marca `2x`/`pausa` como anotação `{...}` (`marcarAnotacoesDeExecucao`),
 *    com a mesma restrição do passo 7 — nunca em linha posicional, porque as
 *    chaves mudam a largura e moveriam o acorde de sílaba
 * 9. colapsa duas ou mais linhas em branco seguidas em uma só
 *    (`colapsarLinhasEmBrancoConsecutivas`) — por último, depois que
 *    materialização já inseriu os separadores que precisava
 *
 * Ao final, valida o resultado com `parseMusica` — se a cifra normalizada
 * não parsear, o erro sobe daqui (citando arquivo e linha, quando
 * `nomeArquivo` é passado); nunca devolve um `.cifra` quebrado
 * silenciosamente.
 *
 * Fora do escopo, de propósito (sem evidência real ainda no acervo):
 * linha que começa com anotação de execução solta antes de acorde
 * (`{pausa} A E`) é tratada como candidata a subtítulo, podendo virar um
 * subtítulo de rótulo livre em vez de anotação — ambiguidade real, não
 * resolvida aqui por falta de caso real que a justifique (mesmo raciocínio
 * de não fechar vocabulário/heurística com amostra pequena, ver
 * `docs/plano-camada-formato.md`).
 */
/**
 * Garante que o cabeçalho sai com um `tom:` que o transpositor consegue
 * ler. Um `tom:` presente mas ilegível (`Tom:` vazio, achado real em
 * `TU ÉS FIEL`) não conta como declarado: antes ele bloqueava o tom vindo
 * do título e o arquivo importava limpo para quebrar depois, na primeira
 * transposição — que é o único lugar onde o campo é usado.
 *
 * Sem tom nenhum utilizável, falha aqui. O acervo tem 400 arquivos: o que
 * não pode acontecer é um deles entrar quebrado sem ninguém ver.
 */
function comTomUtilizavel(cabecalho: string[], tomDeFora: string | undefined, nomeArquivo?: string): string[] {
  const indice = cabecalho.findIndex((linha) => linha.startsWith('tom:'));
  const declarado = indice === -1 ? undefined : cabecalho[indice]!.slice('tom:'.length).trim();

  if (declarado !== undefined && declarado !== '') {
    try {
      parseTom(declarado);
      return cabecalho;
    } catch {
      // cai para o tom de fora, e se não houver, falha logo abaixo
    }
  }

  if (tomDeFora !== undefined && tomDeFora.trim() !== '') {
    const linha = `tom: ${tomDeFora.trim()}`;
    return indice === -1
      ? [...cabecalho, linha]
      : [...cabecalho.slice(0, indice), linha, ...cabecalho.slice(indice + 1)];
  }

  const onde = nomeArquivo ? ` (${nomeArquivo})` : '';
  throw new Error(
    declarado === undefined
      ? `cabeçalho sem campo obrigatório "tom"${onde}`
      : `tom ilegível no cabeçalho${onde}: "${declarado}" — e o título não traz alternativa.`,
  );
}

export interface OpcoesImportacao {
  /**
   * Tom a usar QUANDO o documento não traz `Tom:` nenhum — 18 dos 421
   * arquivos do acervo são assim, com o tom vivendo só no nome do arquivo.
   * Nunca sobrepõe um tom que o documento declare: o documento manda.
   *
   * O importador não descobre isso sozinho de propósito. Quem chama é que
   * sabe de onde o tom veio (`tomDoTituloDrive`, curadoria), e assim a
   * inferência fica visível no lote em vez de escondida aqui.
   */
  tom?: string;
}

export function importarCifraCrua(
  textoCru: string,
  nomeArquivo?: string,
  opcoes: OpcoesImportacao = {},
): string {
  // BOM (comum em exportação de Google Doc convertido) e quebra de linha
  // \r\n (Windows/Docs): sem isso, o \r sobra como caractere de verdade em
  // cada linha e desalinha a coluna de qualquer linha posicional, e o BOM
  // gruda um caractere invisível no título — achado real, não hipotético
  // (arquivo convertido do Drive).
  const textoLimpo = textoCru.replace(/^﻿/u, '').replace(/\r\n?/g, '\n');
  const linhasCruas = textoLimpo.split('\n');
  if (linhasCruas[linhasCruas.length - 1] === '') linhasCruas.pop();

  const { cabecalho: cabecalhoCru, resto } = normalizarCabecalhoBruto(linhasCruas);
  const cabecalho = comTomUtilizavel(cabecalhoCru, opcoes.tom, nomeArquivo);

  const semTrailing = resto.map(semEspacoNoFinal);
  const semTabs = semTrailing.map((linha) => expandirTabs(linha));
  const comSubtitulos = semTabs.map(normalizarLinhaDeSubtituloSeForCandidata);
  const materializado = materializarSecoesReferenciadas(comSubtitulos);
  const marcado = marcarLinhasPosicionaisCruas(materializado);
  const espacado = marcado.map(normalizarEspacamentoSeForCifra);
  const anotado = espacado.map(marcarAnotacoesSeForCifra);
  const comLetraMarcada = marcarLinhasDeLetra(anotado);
  const corpoFinal = colapsarLinhasEmBrancoConsecutivas(comLetraMarcada);

  const texto = [...cabecalho, '---', ...corpoFinal].join('\n') + '\n';
  recusarAcordesGrudados(parseMusica(texto, nomeArquivo), nomeArquivo);
  return texto;
}
