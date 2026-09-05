/**
 * Port de `gerador/rtf.py` — a saída que funciona no Google Docs.
 *
 * Fidelidade byte a byte contra `gerador/rtf.py` é o contrato (ver
 * `tests/fixtures-emissor/`, geradas pelo Python). Não "melhora" nada — uma
 * mudança estética aqui quebra a única prova de que o port está certo.
 *
 * Ver `gerador/rtf.py` pro porquê de cada regra (quebra de página, `\~`,
 * `\uN` com par substituto fora do BMP) — não repetido aqui.
 */
import { passosESemitons, transporCompasso, transporLinha, limparLetra } from './transpor.ts';
import { validar } from './modelo.ts';
import type { MusicaDados } from './dados-repertorio.ts';

const ESCURO = 1;
const AZUL = 2;
const LARANJA = 3;
const ROXO = 4;

export const CABECALHO =
  '{\\rtf1\\ansi\\ansicpg1252\\deff0' +
  '{\\fonttbl{\\f0\\fswiss\\fcharset0 Arial;}}' +
  '{\\colortbl;' +
  '\\red27\\green27\\blue27;' +
  '\\red0\\green0\\blue255;' +
  '\\red255\\green102\\blue0;' +
  '\\red153\\green0\\blue255;}' +
  '\\paperw11906\\paperh16838' +
  '\\margl1440\\margr1440\\margt1440\\margb1440' +
  '\n';

const PAR = '\\pard\\sl276\\slmult1\\f0';

/**
 * Escapa texto para RTF. `duro=true` troca espaço por `\~` (espaço
 * inquebrável) — obrigatório nas linhas de cifra. Caractere fora do BMP usa
 * o par substituto UTF-16 (dois `\uN`) — `\uN` é inteiro de 16 bits com
 * sinal, um escape só estoura a faixa (achado real, ver
 * `docs/achados-google-docs.md`).
 */
export function esc(t: string, duro = false): string {
  const out: string[] = [];
  for (const c of t) {
    if (c === '\\' || c === '{' || c === '}') {
      out.push('\\' + c);
    } else if (c === ' ') {
      out.push(duro ? '\\~' : ' ');
    } else {
      const n = c.codePointAt(0)!;
      if (n < 128) {
        out.push(c);
      } else if (n > 0xffff) {
        const v = n - 0x10000;
        for (const x of [0xd800 + (v >> 10), 0xdc00 + (v & 0x3ff)]) {
          out.push(`\\u${x - 65536}?`);
        }
      } else {
        out.push(`\\u${n < 32768 ? n : n - 65536}?`);
      }
    }
  }
  return out.join('');
}

function par(texto: string, cor = ESCURO, tam = 12, negrito = false, quebra = false): string {
  const ini = PAR + (quebra ? '\\page' : '');
  const [b0, b1] = negrito ? ['\\b ', '\\b0'] : ['', ''];
  // O espaço depois de \cfN é delimitador do control word e é consumido
  // pelo parser RTF; por isso o texto começa imediatamente depois dele.
  return `${ini}\\fs${tam * 2}\\cf${cor} ${b0}${texto}${b1}\\par\n`;
}

/** Emite uma música transposta para `tomDestino`. */
export function escrever(m: MusicaDados, tomDestino: string, quebraAntes = false): string {
  validar(m);
  const { deltaLetra, deltaSemitom } = passosESemitons(m.tom, tomDestino);
  const out: string[] = [];
  let quebra = quebraAntes;

  if (m.momento) {
    out.push(par(esc(m.momento), ESCURO, 12, true, quebra));
    quebra = false;
  }
  out.push(par(esc(m.titulo), ESCURO, 15, true, quebra));
  if (m.artista) out.push(par(esc(m.artista), ESCURO, 15, true));
  out.push(par(esc(`Tom: ${tomDestino}`), ESCURO, 12, true));
  out.push(par(''));

  for (const [tipo, txt] of m.corpo) {
    if (tipo === 'b') {
      out.push(par(''));
    } else if (tipo === 'lab') {
      out.push(par(esc(txt as string), AZUL, 12, true));
    } else if (tipo === 'labc') {
      const [rot, chOrig] = txt as [string, string];
      const ch = transporCompasso(chOrig, deltaLetra, deltaSemitom);
      out.push(PAR + `\\fs24\\cf${AZUL} \\b ${esc(rot)}\\~\\cf${LARANJA} ${esc(ch, true)}\\b0\\par` + '\n');
    } else if (tipo === 'cif' || tipo === 'pos') {
      const fn = tipo === 'pos' ? transporLinha : transporCompasso;
      out.push(par(esc(fn(txt as string, deltaLetra, deltaSemitom), true), LARANJA, 12, true));
    } else if (tipo === 'anot') {
      out.push(par(esc(txt as string), ROXO, 12, true));
    } else if (tipo === 'let') {
      out.push(par(esc(limparLetra(txt as string))));
    }
  }
  return out.join('');
}

/**
 * Monta o RTF de um culto. `ordem`: lista de (musica, tom_destino), na
 * ordem de execução. Cada música depois da primeira começa em página nova.
 */
export function documento(ordem: [MusicaDados, string][]): string {
  const corpo = ordem.map(([m, t], i) => escrever(m, t, i > 0)).join('');
  return CABECALHO + corpo + '}\n';
}
