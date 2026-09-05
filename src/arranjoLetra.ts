import type { Musica } from './tipos.ts';
import { serializarMusica } from './serializador.ts';

/**
 * Separa arranjo de letra — a decisão de arquitetura 3 de `docs/rumo.md`.
 *
 * O `.cifra` continua sendo um arquivo por música, com as duas coisas
 * intercaladas: é o que preserva o alinhamento do acorde sobre a sílaba e a
 * ordem em que as partes aparecem. A separação é possível porque cada linha
 * cantada é marcada com `>` (ver `linhas.ts`), então extrair é FILTRAR, não
 * remontar.
 *
 * Por que isso importa: se um dia houver compartilhamento de repertório
 * entre igrejas, ele pode ser só do arranjo — que é fato musical — sem
 * redistribuir a obra de terceiro. E se a questão jurídica for resolvida de
 * outro jeito, nada se perde. A alternativa (dois blocos, ou dois arquivos)
 * quebraria a intercalação: uma seção com 3 linhas de cifra e 5 de letra não
 * se remonta por contagem.
 */

/**
 * A música sem nenhuma linha cantada: cabeçalho, rótulos de seção, cifra,
 * posicional e separadores. É o que pode ser compartilhado sem carregar
 * letra de terceiro junto.
 *
 * Os separadores em branco são preservados como estão — tirar a letra de
 * uma seção não junta a seção seguinte à anterior.
 */
export function extrairArranjo(musica: Musica): Musica {
  return { cabecalho: musica.cabecalho, corpo: musica.corpo.filter((linha) => linha.tipo !== 'letra') };
}

/** O mesmo, já em texto `.cifra` — pronto para gravar ou enviar. */
export function extrairArranjoTexto(musica: Musica): string {
  return serializarMusica(extrairArranjo(musica)) + '\n';
}

/**
 * Só o texto cantado, sem o `>` e sem cifra nenhuma. Linha vazia separa os
 * blocos que estavam separados no arquivo, para a letra continuar legível
 * como letra.
 */
export function extrairLetra(musica: Musica): string[] {
  const saida: string[] = [];
  for (const linha of musica.corpo) {
    if (linha.tipo === 'letra') {
      saida.push(linha.texto);
      continue;
    }
    // Um separador só vira linha em branco se já houver letra antes dele e
    // a última não for em branco — senão a letra sairia cheia de buraco nos
    // lugares onde havia só cifra.
    if (saida.length > 0 && saida[saida.length - 1] !== '') saida.push('');
  }
  while (saida.length > 0 && saida[saida.length - 1] === '') saida.pop();
  return saida;
}
