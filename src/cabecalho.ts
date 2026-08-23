import type { Cabecalho } from './tipos.ts';

const CAMPOS_OBRIGATORIOS = ['titulo', 'tom'];

export function parseCabecalho(linhas: string[]): Cabecalho {
  const campos = linhas
    .filter((linha) => linha.trim() !== '')
    .map((linha) => {
      const idx = linha.indexOf(':');
      if (idx === -1) {
        throw new Error(`linha de cabeçalho sem ":": "${linha}"`);
      }
      return { chave: linha.slice(0, idx).trim(), valor: linha.slice(idx + 1).trim() };
    });

  for (const obrigatorio of CAMPOS_OBRIGATORIOS) {
    if (!campos.some((c) => c.chave === obrigatorio)) {
      throw new Error(`cabeçalho sem campo obrigatório "${obrigatorio}"`);
    }
  }

  return { campos };
}

export function obterCampo(cabecalho: Cabecalho, chave: string): string | undefined {
  return cabecalho.campos.find((c) => c.chave === chave)?.valor;
}

export function comCampoAtualizado(cabecalho: Cabecalho, chave: string, novoValor: string): Cabecalho {
  return {
    campos: cabecalho.campos.map((c) => (c.chave === chave ? { chave, valor: novoValor } : c)),
  };
}

export function formatarCabecalho(cabecalho: Cabecalho): string[] {
  return cabecalho.campos.map((c) => `${c.chave}: ${c.valor}`);
}
