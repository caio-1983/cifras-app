/**
 * Converte um `.cifra` já parseado no `MusicaDados` que os emissores
 * consomem — a ponte entre o acervo (`musicas/*.cifra`, a fonte da verdade)
 * e `gerador-ts/html.ts`, que não é reimplementado aqui por decisão do
 * projeto: cada regra dele custou um erro real.
 *
 * A conversão é 1:1 por linha, e é por isso que ela reusa o serializador do
 * núcleo em vez de reescrever a formatação: `serializarMusica` já sabe
 * recolocar o `~`, preservar a largura da linha de compasso e a coluna da
 * posicional. Aqui só se decide o TIPO de cada linha.
 */
import type { Musica } from '../src/tipos.ts';
import { serializarMusica } from '../src/serializador.ts';
import { obterCampo } from '../src/cabecalho.ts';
import type { MusicaDados, TuplaLinha } from '../gerador-ts/dados-repertorio.ts';

/** O rótulo `[...]` no começo da linha, quando ela também traz cifra. */
const RE_ROTULO_NO_COMECO = /^(\s*\[[^\]]*\])(.*)$/;

export function cifraParaDados(musica: Musica): MusicaDados {
  // As linhas serializadas batem 1:1 com `corpo` — é o mesmo laço de
  // `serializarMusica`. Reusar a saída dele evita ter uma segunda regra de
  // formatação que pode divergir da primeira sem ninguém notar.
  const linhasTexto = serializarMusica(musica).split('\n');
  const corpoTexto = linhasTexto.slice(linhasTexto.indexOf('---') + 1);

  const corpo: TuplaLinha[] = musica.corpo.map((linha, i) => {
    const texto = corpoTexto[i] ?? '';
    switch (linha.tipo) {
      case 'separador':
        return ['b', null];
      case 'letra':
        return ['let', linha.texto];
      case 'subtitulo':
        return ['lab', texto.trim()];
      case 'posicional':
        // O `~` é marcador de linha, não conteúdo: o emissor espera a
        // linha posicional já sem ele, com o acorde na coluna em que ele
        // soa. Tirar só o primeiro `~` preserva o resto das colunas.
        return ['pos', texto.replace('~', '')];
      case 'cifra': {
        const comRotulo = RE_ROTULO_NO_COMECO.exec(texto);
        if (comRotulo) {
          return ['labc', [comRotulo[1]!.trim(), comRotulo[2]!.trim()]];
        }
        return ['cif', texto];
      }
    }
  });

  // Sem artista no arquivo, o campo fica vazio — não ausente. É o que
  // deixa o tipo honesto para o site inteiro, que já trata `artista` como
  // texto; e os emissores, desde 2026-09-05, omitem a linha quando ela é
  // vazia, em vez de imprimir um branco no lugar do autor.
  const artista = obterCampo(musica.cabecalho, 'artista') ?? '';
  const corpoJunto = colarRotuloAoCorpo(corpo);
  const momento = obterCampo(musica.cabecalho, 'momento');

  return {
    titulo: obterCampo(musica.cabecalho, 'titulo') ?? '',
    tom: obterCampo(musica.cabecalho, 'tom') ?? '',
    artista,
    ...(momento ? { momento } : {}),
    corpo: corpoJunto,
  };
}

/**
 * Tira a linha em branco que separa um rótulo de seção do corpo dela.
 *
 * É herança do documento de origem: 53 seções em 28 arquivos do acervo têm
 * uma branca entre `[Refrão]` e a primeira linha do refrão. Para o emissor
 * isso é "seção só com rótulo, sem conteúdo" e derruba a música inteira —
 * e a branca não diz nada a quem lê: o rótulo pertence ao bloco abaixo.
 *
 * A branca só some quando há conteúdo depois dela. Rótulo seguido de branca
 * e de OUTRO rótulo é seção vazia de verdade, pendência de curadoria, e
 * continua chegando ao emissor como está — maquiar aqui esconderia o
 * problema em vez de resolvê-lo. E a branca entre o fim de uma seção e o
 * rótulo da próxima nunca é tocada: ela é o respiro entre os blocos.
 */
function colarRotuloAoCorpo(corpo: TuplaLinha[]): TuplaLinha[] {
  return corpo.filter((linha, i) => {
    if (linha[0] !== 'b') return true;
    const anterior = corpo[i - 1]?.[0];
    const seguinte = corpo[i + 1]?.[0];
    const ehBrancaOrfa = anterior === 'lab' && seguinte !== undefined && seguinte !== 'lab' && seguinte !== 'b';
    return !ehBrancaOrfa;
  });
}
