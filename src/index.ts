import type { Musica } from './tipos.ts';
import { parseCabecalho } from './cabecalho.ts';
import { classificarLinha } from './linhas.ts';
import { transporMusica as transporMusicaAst } from './transpositor.ts';
import { serializarMusica } from './serializador.ts';

export function parseMusica(texto: string, nomeArquivo?: string): Musica {
  const linhasArquivo = texto.split('\n');
  if (linhasArquivo[linhasArquivo.length - 1] === '') {
    linhasArquivo.pop();
  }
  const idxSeparador = linhasArquivo.indexOf('---');
  if (idxSeparador === -1) {
    throw new Error('cabeçalho sem separador "---"');
  }
  const cabecalho = parseCabecalho(linhasArquivo.slice(0, idxSeparador));
  const corpo = linhasArquivo
    .slice(idxSeparador + 1)
    .map((linha, i) => classificarLinha(linha, { numeroLinha: idxSeparador + 2 + i, nomeArquivo }));
  return { cabecalho, corpo };
}

export function transporMusicaTexto(texto: string, tomDestino: string, nomeArquivo?: string): string {
  const musica = parseMusica(texto, nomeArquivo);
  const transposta = transporMusicaAst(musica, tomDestino);
  return serializarMusica(transposta) + '\n';
}

export { serializarMusica } from './serializador.ts';
export { transporMusica } from './transpositor.ts';
