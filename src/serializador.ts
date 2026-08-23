import type { ItemPosicionado, LinhaCorpo, Musica } from './tipos.ts';
import { formatarAcorde } from './acorde.ts';
import { formatarCabecalho } from './cabecalho.ts';
import { colunaAbsoluta, larguraPreservada, type ItemRelayout } from './relayout.ts';

function paraItemRelayout(ip: ItemPosicionado): ItemRelayout {
  if (ip.item.tipo === 'literal') {
    return { coluna: ip.coluna, textoOriginal: ip.item.texto, textoNovo: ip.item.texto };
  }
  return { coluna: ip.coluna, textoOriginal: ip.item.textoOriginal, textoNovo: formatarAcorde(ip.item.acorde) };
}

function serializarLinhaCorpo(linha: LinhaCorpo): string {
  switch (linha.tipo) {
    case 'separador':
      return '';
    case 'letra':
      return linha.texto;
    case 'subtitulo':
      return linha.texto;
    case 'cifra':
      return larguraPreservada(linha.itens.map(paraItemRelayout));
    case 'posicional':
      return colunaAbsoluta(linha.itens.map(paraItemRelayout));
  }
}

export function serializarMusica(musica: Musica): string {
  const linhas = [...formatarCabecalho(musica.cabecalho), '---', ...musica.corpo.map(serializarLinhaCorpo)];
  return linhas.join('\n');
}
