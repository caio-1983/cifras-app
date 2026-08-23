import { normalizarCabecalhoBruto } from './normalizacaoCabecalho.ts';
import { expandirTabs } from './normalizacao.ts';
import { normalizarSubtitulo } from './sinonimosSubtitulo.ts';
import { marcarLinhasPosicionaisCruas } from './deteccaoPosicionalCrua.ts';
import { materializarSecoesReferenciadas } from './materializacaoSecoes.ts';
import { parseMusica } from './index.ts';

// Uma linha crua é candidata a rótulo de subtítulo quando começa com "["
// ou "{" (forma já delimitada, sinal inequívoco), ou tem a forma solta
// "rótulo: resto" (sem chave/colchete antes dos dois pontos). O segundo
// caso é ambíguo — uma linha de letra comum pode ter dois pontos ("Ele
// disse: eu vou") — por isso só vira subtítulo se o rótulo bater com um
// sinônimo conhecido (ver `normalizarLinhaDeSubtituloSeForCandidata`).
const RE_ROTULO_SOLTO_COM_DOIS_PONTOS = /^[^:{}[\]]+:.*$/;

function pareceCandidatoDeSubtitulo(linha: string): boolean {
  const trimada = linha.trim();
  if (trimada.startsWith('[') || trimada.startsWith('{')) return true;
  return RE_ROTULO_SOLTO_COM_DOIS_PONTOS.test(trimada);
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
 * 7. colapsa duas ou mais linhas em branco seguidas em uma só
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
export function importarCifraCrua(textoCru: string, nomeArquivo?: string): string {
  // BOM (comum em exportação de Google Doc convertido) e quebra de linha
  // \r\n (Windows/Docs): sem isso, o \r sobra como caractere de verdade em
  // cada linha e desalinha a coluna de qualquer linha posicional, e o BOM
  // gruda um caractere invisível no título — achado real, não hipotético
  // (arquivo convertido do Drive).
  const textoLimpo = textoCru.replace(/^﻿/u, '').replace(/\r\n?/g, '\n');
  const linhasCruas = textoLimpo.split('\n');
  if (linhasCruas[linhasCruas.length - 1] === '') linhasCruas.pop();

  const { cabecalho, resto } = normalizarCabecalhoBruto(linhasCruas);

  const semTrailing = resto.map(semEspacoNoFinal);
  const semTabs = semTrailing.map((linha) => expandirTabs(linha));
  const comSubtitulos = semTabs.map(normalizarLinhaDeSubtituloSeForCandidata);
  const materializado = materializarSecoesReferenciadas(comSubtitulos);
  const marcado = marcarLinhasPosicionaisCruas(materializado);
  const corpoFinal = colapsarLinhasEmBrancoConsecutivas(marcado);

  const texto = [...cabecalho, '---', ...corpoFinal].join('\n') + '\n';
  parseMusica(texto, nomeArquivo);
  return texto;
}
