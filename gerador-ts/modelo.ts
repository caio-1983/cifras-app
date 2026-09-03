/**
 * Port de `gerador/modelo.py` — só o que `rtf.ts`/`html.ts` precisam:
 * o formato de dado (`MusicaDados`, já em `dados-repertorio.ts`, gerado a
 * partir do Python) e `validar`, chamada por `escrever()` nos dois
 * emissores antes de qualquer coisa.
 */
import type { MusicaDados, TuplaLinha } from './dados-repertorio.ts';

const TIPOS_VALIDOS = new Set(['lab', 'labc', 'cif', 'pos', 'let', 'anot', 'b']);
const RE_TOM = /^[A-G](#{1,2}|b{1,2})?/;

/**
 * Confere o modelo antes de emitir. Lança na primeira falha — mesmo
 * comportamento de `modelo.py::validar` (a variável `vistos`, que o
 * Python monta e nunca usa, foi deixada de fora: não afeta nenhum
 * resultado observável, portar dead code não teria sentido).
 */
export function validar(m: MusicaDados): MusicaDados {
  for (const campo of ['titulo', 'artista', 'tom'] as const) {
    if (!m[campo]) {
      throw new Error(`música sem ${campo}: ${JSON.stringify(m.titulo ?? '?')}`);
    }
  }
  if (!m.corpo || m.corpo.length === 0) {
    throw new Error(`música sem corpo: ${JSON.stringify(m.titulo ?? '?')}`);
  }
  if (!RE_TOM.test(m.tom)) {
    throw new Error(`tom inválido: ${JSON.stringify(m.tom)}`);
  }

  m.corpo.forEach((item: TuplaLinha, i: number) => {
    if (!Array.isArray(item) || item.length !== 2) {
      throw new Error(`${m.titulo}: linha ${i} não é [tipo, conteúdo]`);
    }
    const [tipo, txt] = item;
    if (!TIPOS_VALIDOS.has(tipo)) {
      throw new Error(`${m.titulo}: tipo desconhecido ${JSON.stringify(tipo)} na linha ${i}`);
    }
    if (tipo === 'labc' && (!Array.isArray(txt) || txt.length !== 2)) {
      throw new Error(`${m.titulo}: labc na linha ${i} precisa de [rótulo, cifra]`);
    }
  });

  for (let i = 0; i < m.corpo.length - 1; i++) {
    const [tipo, rotulo] = m.corpo[i]!;
    if (tipo === 'lab') {
      const proximoTipo = m.corpo[i + 1]![0];
      if (proximoTipo === 'lab' || proximoTipo === 'b') {
        throw new Error(
          `${m.titulo}: seção ${JSON.stringify(rotulo)} está só com rótulo, sem conteúdo. ` +
            'O padrão manda replicar o bloco.',
        );
      }
    }
  }
  return m;
}
