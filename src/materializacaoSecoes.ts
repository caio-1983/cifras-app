import { esperaCorpoAbaixo } from './sinonimosSubtitulo.ts';

interface Marcador {
  indice: number;
  rotulo: string;
  /** true quando a linha do marcador traz conteúdo próprio depois do `]` (cifra de lembrete). */
  temCifraPropria: boolean;
}

function encontrarMarcadores(linhas: string[]): Marcador[] {
  const marcadores: Marcador[] = [];
  for (let indice = 0; indice < linhas.length; indice++) {
    const trimada = linhas[indice]!.trim();
    if (!trimada.startsWith('[')) continue;
    const fechamento = trimada.indexOf(']');
    if (fechamento === -1) continue;
    marcadores.push({
      indice,
      rotulo: trimada.slice(0, fechamento + 1),
      temCifraPropria: trimada.slice(fechamento + 1).trim() !== '',
    });
  }
  return marcadores;
}

// Contagem de repetição no fim do rótulo: "2x", "4X", "(2x)". Note o "x"
// obrigatório — é ele que separa QUANTAS VEZES se toca de QUAL seção é.
// "[Verso 2]" não bate aqui, e é justamente o que impede a letra do Verso 1
// de ser copiada para o Verso 2, o que trocaria a letra da música.
const RE_CONTAGEM_REPETICAO = /\s*\(?\d+[xX]\)?\s*$/;

function rotuloBase(rotuloComColchetes: string): string {
  const m = /^\[([^\]]*)\]/.exec(rotuloComColchetes.trim());
  if (!m) return rotuloComColchetes.trim();
  return m[1]!.replace(RE_CONTAGEM_REPETICAO, '').trim().toLowerCase();
}

/**
 * true quando os dois rótulos são a mesma seção. `[Refrão 2x]` e `[Refrão]`
 * são — a contagem diz quantas vezes se repete, não qual seção é (achado
 * real: `{refrão}` no corpo e `{refrão_2x}` mais adiante, em REINA e
 * DOCE NOME).
 */
function mesmaSecao(a: string, b: string): boolean {
  return rotuloBase(a) === rotuloBase(b);
}

/**
 * Decide e aplica a materialização de seções que só remetem a uma anterior
 * (decisão do usuário: sempre repetir o conteúdo, nunca guardar referência
 * — "no palco indireção é modo de falha"). Espera linhas de corpo já com
 * subtítulo em forma canônica `[Rótulo]` (ex.: já passadas por
 * `normalizarSubtitulo`), sem `---`/cabeçalho.
 *
 * Uma seção é "vazia" (candidata a materializar) quando:
 * - o rótulo é de um tipo que normalmente tem corpo abaixo dele
 *   (`esperaCorpoAbaixo` — exclui `[Intro]`/`[Final]`/etc, que são
 *   inline por definição e não têm "corpo faltando" nenhum)
 * - todas as linhas até o próximo marcador (ou fim do arquivo) são vazias
 *
 * Materializa copiando o corpo da ocorrência anterior **não vazia** de
 * mesmo rótulo — nunca do marcador em si (que pode ter cifra própria,
 * como `[Verso 2] | A | % | ... |` na segunda vez que aparece: falta só a
 * letra, o acorde já estava lá, redundante mas presente). Insere um
 * separador em branco depois do conteúdo copiado só quando ainda não
 * existe um ali.
 *
 * Lança erro se uma seção vazia não tiver nenhuma ocorrência anterior com
 * conteúdo pra copiar — silenciosamente deixar vazio produziria uma cifra
 * incompleta sem aviso nenhum.
 */
export function materializarSecoesReferenciadas(linhas: string[]): string[] {
  const marcadores = encontrarMarcadores(linhas);

  const fimDoBloco = (m: number): number => (m + 1 < marcadores.length ? marcadores[m + 1]!.indice : linhas.length);
  const corpoDoBloco = (m: number): string[] => linhas.slice(marcadores[m]!.indice + 1, fimDoBloco(m));
  const semCorpoAbaixo = (m: number): boolean => corpoDoBloco(m).every((l) => l.trim() === '');
  /**
   * Candidato a materializar: nada abaixo até o próximo marcador, e o
   * rótulo ou espera corpo (`[Verso 2] | A | % |` tem o acorde e falta a
   * letra) ou está NU — sem nem cifra na própria linha.
   *
   * O `|| !temCifraPropria` é o que faltava: sem ele, `[Intro]` nu
   * repetindo um `[Intro]` que já apareceu com cifra não era materializado,
   * a seção chegava vazia ao emissor e ele recusava a música inteira (7
   * arquivos do acervo). A exceção dos rótulos instrumentais existe para
   * NÃO FALHAR quando não há ocorrência anterior para copiar — e é lá
   * embaixo que ela age agora, não aqui.
   */
  const ehVazio = (m: number): boolean =>
    semCorpoAbaixo(m) && (esperaCorpoAbaixo(marcadores[m]!.rotulo) || !marcadores[m]!.temCifraPropria);

  /**
   * Roteiro de execução: dois ou mais marcadores seguidos, cada um com a
   * própria cifra de lembrete e nada abaixo. É a ordem em que as seções são
   * tocadas, não repetição de seção — 10 dos 73 arquivos do primeiro lote
   * terminam assim. Decisão do usuário: preservar como está.
   */
  const ehRoteiro = (m: number): boolean => {
    const parteDeRoteiro = (k: number): boolean =>
      k >= 0 && k < marcadores.length && marcadores[k]!.temCifraPropria && semCorpoAbaixo(k);
    return parteDeRoteiro(m) && (parteDeRoteiro(m - 1) || parteDeRoteiro(m + 1));
  };

  /** O que vem depois do `]` na linha do marcador — a cifra de lembrete. */
  const conteudoInline = (m: number): string =>
    linhas[marcadores[m]!.indice]!.trim().slice(marcadores[m]!.rotulo.length).trim();

  /** O marcador anterior da mesma seção que traz a cifra na própria linha. */
  const marcadorInlineAnterior = (m: number): number => {
    for (let anterior = m - 1; anterior >= 0; anterior--) {
      const cand = marcadores[anterior]!;
      if (mesmaSecao(cand.rotulo, marcadores[m]!.rotulo) && cand.temCifraPropria) return anterior;
    }
    return -1;
  };

  const insercoes: { apos: number; conteudo: string[] }[] = [];
  const substituicoes: { linha: number; texto: string }[] = [];

  for (let m = 0; m < marcadores.length; m++) {
    if (!ehVazio(m)) continue;
    if (ehRoteiro(m)) continue;

    let origem = -1;
    for (let anterior = m - 1; anterior >= 0; anterior--) {
      if (mesmaSecao(marcadores[anterior]!.rotulo, marcadores[m]!.rotulo) && !semCorpoAbaixo(anterior)) {
        origem = anterior;
        break;
      }
    }

    if (origem === -1) {
      // Um marcador que traz a própria cifra já é uma seção completa
      // (`[Rampa] | F/A Bb | C |`, `[Solo] |: Bb | C :|`) — sem ocorrência
      // anterior para copiar, ele não é referência nenhuma: fica como veio.
      // Só o marcador NU, que não traz nada, é referência de verdade — e aí
      // falhar alto é o comportamento certo (precedente: TU ÉS BOM).
      if (marcadores[m]!.temCifraPropria) continue;

      // Seção cujo conteúdo mora na LINHA DO MARCADOR, não abaixo dele —
      // é a forma dos instrumentais (`[Intro] | A | E |`). Quando ela
      // reaparece nua, repetir significa reproduzir aquela linha; inserir
      // um corpo abaixo não serviria, porque corpo nunca houve.
      const origemInline = marcadorInlineAnterior(m);
      if (origemInline !== -1) {
        substituicoes.push({
          linha: marcadores[m]!.indice,
          texto: `${marcadores[m]!.rotulo} ${conteudoInline(origemInline)}`,
        });
        continue;
      }

      // Rótulo instrumental sem ocorrência anterior nenhuma não é
      // referência quebrada: seção instrumental sem corpo é forma legítima
      // do acervo (precedente: `musicas/ruja-o-leao.cifra`, curado à mão).
      // Só o rótulo que espera corpo abaixo falha alto (precedente: TU ÉS BOM).
      if (!esperaCorpoAbaixo(marcadores[m]!.rotulo)) continue;
      throw new Error(
        `seção "${marcadores[m]!.rotulo}" (linha ${marcadores[m]!.indice + 1}) está vazia e não há ocorrência anterior com conteúdo para repetir`,
      );
    }

    let conteudo = corpoDoBloco(origem);
    while (conteudo.length > 0 && conteudo[conteudo.length - 1]!.trim() === '') conteudo = conteudo.slice(0, -1);

    insercoes.push({ apos: marcadores[m]!.indice, conteudo });
  }

  const saida = [...linhas];
  // Substituição antes da inserção: ela troca uma linha no lugar, sem mexer
  // em índice nenhum, então os índices das inserções continuam válidos.
  for (const { linha, texto } of substituicoes) saida[linha] = texto;
  insercoes.sort((a, b) => b.apos - a.apos);
  for (const { apos, conteudo } of insercoes) {
    const linhaSeguinte = saida[apos + 1];
    const precisaSeparador = linhaSeguinte !== undefined && linhaSeguinte.trim() !== '';
    saida.splice(apos + 1, 0, ...conteudo, ...(precisaSeparador ? [''] : []));
  }

  return saida;
}
