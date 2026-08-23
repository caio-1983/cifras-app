import type { Acorde, ItemPosicionado, LinhaCorpo, Musica } from './tipos.ts';
import { deltaEntreTons, transporNota } from './nota.ts';
import { parseTom, formatarTom } from './tom.ts';
import { obterCampo, comCampoAtualizado } from './cabecalho.ts';

function transporAcorde(acorde: Acorde, deltaLetra: number, deltaSemitom: number): Acorde {
  return {
    raiz: transporNota(acorde.raiz, deltaLetra, deltaSemitom),
    sufixo: acorde.sufixo,
    ...(acorde.baixo ? { baixo: transporNota(acorde.baixo, deltaLetra, deltaSemitom) } : {}),
  };
}

function transporItens(itens: ItemPosicionado[], deltaLetra: number, deltaSemitom: number): ItemPosicionado[] {
  return itens.map((ip) => {
    if (ip.item.tipo !== 'acorde') return ip;
    return {
      coluna: ip.coluna,
      item: {
        tipo: 'acorde',
        acorde: transporAcorde(ip.item.acorde, deltaLetra, deltaSemitom),
        textoOriginal: ip.item.textoOriginal,
      },
    };
  });
}

export function transporCorpo(corpo: LinhaCorpo[], deltaLetra: number, deltaSemitom: number): LinhaCorpo[] {
  return corpo.map((linha) => {
    if (linha.tipo === 'cifra' || linha.tipo === 'posicional') {
      return { tipo: linha.tipo, itens: transporItens(linha.itens, deltaLetra, deltaSemitom) };
    }
    return linha;
  });
}

export function transporMusica(musica: Musica, tomDestinoTexto: string): Musica {
  const tomOrigemTexto = obterCampo(musica.cabecalho, 'tom');
  if (tomOrigemTexto === undefined) {
    throw new Error('música sem campo "tom" no cabeçalho');
  }
  const tomOrigem = parseTom(tomOrigemTexto);
  const tomDestino = parseTom(tomDestinoTexto);
  const { deltaLetra, deltaSemitom } = deltaEntreTons(tomOrigem, tomDestino);
  return {
    cabecalho: comCampoAtualizado(musica.cabecalho, 'tom', formatarTom(tomDestino)),
    corpo: transporCorpo(musica.corpo, deltaLetra, deltaSemitom),
  };
}
