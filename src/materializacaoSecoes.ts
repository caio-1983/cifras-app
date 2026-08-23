import { esperaCorpoAbaixo } from './sinonimosSubtitulo.ts';

interface Marcador {
  indice: number;
  rotulo: string;
}

function encontrarMarcadores(linhas: string[]): Marcador[] {
  const marcadores: Marcador[] = [];
  for (let indice = 0; indice < linhas.length; indice++) {
    const trimada = linhas[indice]!.trim();
    if (!trimada.startsWith('[')) continue;
    const fechamento = trimada.indexOf(']');
    if (fechamento === -1) continue;
    marcadores.push({ indice, rotulo: trimada.slice(0, fechamento + 1) });
  }
  return marcadores;
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
  const ehVazio = (m: number): boolean =>
    esperaCorpoAbaixo(marcadores[m]!.rotulo) && corpoDoBloco(m).every((l) => l.trim() === '');

  const insercoes: { apos: number; conteudo: string[] }[] = [];

  for (let m = 0; m < marcadores.length; m++) {
    if (!ehVazio(m)) continue;

    let origem = -1;
    for (let anterior = m - 1; anterior >= 0; anterior--) {
      if (marcadores[anterior]!.rotulo === marcadores[m]!.rotulo && !ehVazio(anterior)) {
        origem = anterior;
        break;
      }
    }

    if (origem === -1) {
      throw new Error(
        `seção "${marcadores[m]!.rotulo}" (linha ${marcadores[m]!.indice + 1}) está vazia e não há ocorrência anterior com conteúdo para repetir`,
      );
    }

    let conteudo = corpoDoBloco(origem);
    while (conteudo.length > 0 && conteudo[conteudo.length - 1]!.trim() === '') conteudo = conteudo.slice(0, -1);

    insercoes.push({ apos: marcadores[m]!.indice, conteudo });
  }

  const saida = [...linhas];
  insercoes.sort((a, b) => b.apos - a.apos);
  for (const { apos, conteudo } of insercoes) {
    const linhaSeguinte = saida[apos + 1];
    const precisaSeparador = linhaSeguinte !== undefined && linhaSeguinte.trim() !== '';
    saida.splice(apos + 1, 0, ...conteudo, ...(precisaSeparador ? [''] : []));
  }

  return saida;
}
