/**
 * Port de `gerador/html.py` — a saída para tela e impressão pelo navegador.
 *
 * NÃO use este emissor para Google Docs — o importador do Docs descarta
 * quebra de página e ignora `@page`. Para Docs, `rtf.ts`. Ver
 * `docs/achados-google-docs.md`.
 */
import { passosESemitons, transporCompasso, transporLinha, limparLetra } from './transpor.ts';
import { validar } from './modelo.ts';
import type { MusicaDados } from './dados-repertorio.ts';

export const CSS =
  '@page{size:A4;margin:72pt}body{max-width:451.4pt}' +
  'p{margin:0;font-family:Arial,sans-serif;font-size:12pt;' +
  'line-height:1.15;color:#1b1b1b}' +
  '.h{font-size:15pt}.l{color:#0000ff}.c{color:#ff6600}.a{color:#9900ff}' +
  '.pb{page-break-before:always}';

/** Só `&`/`<`/`>` — nessa ordem (`&` primeiro, senão escapa os escapes que acabou de inserir). */
export function esc(t: string): string {
  return t.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
}

/**
 * Preserva espaço múltiplo e inicial — HTML colapsa espaço em branco por
 * padrão, e o alinhamento por coluna depende disso. Espaço inicial vira
 * `&nbsp;` mesmo quando é um só; espaço múltiplo em qualquer outro ponto da
 * linha só vira `&nbsp;` a partir de dois seguidos (espaço simples entre
 * palavras continua espaço comum).
 */
export function duro(t: string): string {
  let s = esc(t);
  if (s.startsWith(' ')) {
    const semEspacoInicial = s.replace(/^ +/, '');
    const n = s.length - semEspacoInicial.length;
    s = '&nbsp;'.repeat(n) + s.slice(n);
  }
  return s.replace(/ {2,}/g, (m) => '&nbsp;'.repeat(m.length));
}

/**
 * `momento` (Ofertório, Apelo / Ceia) é propriedade do PAPEL da música num
 * culto, não da música. Fora de um documento de culto ele não tem contexto:
 * uma página de `QUEBRANTADO` sozinha não deve anunciar "Ofertório".
 *
 * Por isso o padrão é emitir (é o comportamento do `gerador/html.py`, e as
 * fixtures dependem dele), e quem emite música solta desliga.
 *
 * TODO (modelagem): `momento` deveria sair da música e ir para a entrada do
 * culto — `CULTOS` hoje guarda `[musica, tom]` e deveria guardar
 * `[musica, tom, momento]`. Enquanto ele mora na música, este parâmetro é o
 * remendo. Ver `docs/site.md`.
 */
export interface OpcoesEmissao {
  /** Emitir a linha de `momento`? Padrão `true` (comportamento do Python). */
  momento?: boolean;
}

export function escrever(
  m: MusicaDados,
  tomDestino: string,
  quebraAntes = false,
  opcoes: OpcoesEmissao = {},
): string {
  validar(m);
  const { deltaLetra, deltaSemitom } = passosESemitons(m.tom, tomDestino);
  const p: string[] = [];
  let cls = quebraAntes ? ' class=pb' : '';

  if (m.momento && opcoes.momento !== false) {
    p.push(`<p${cls}><b>${esc(m.momento)}</b></p>`);
    cls = '';
  }
  p.push(`<p${cls}><b><span class=h>${esc(m.titulo)}</span></b></p>`);
  if (m.artista) p.push(`<p><b><span class=h>${esc(m.artista)}</span></b></p>`);
  p.push(`<p><b>Tom: ${tomDestino}</b></p>`);
  p.push('<p>&nbsp;</p>');

  for (const [tipo, txt] of m.corpo) {
    if (tipo === 'b') {
      p.push('<p>&nbsp;</p>');
    } else if (tipo === 'lab') {
      p.push(`<p><b><span class=l>${esc(txt as string)}</span></b></p>`);
    } else if (tipo === 'labc') {
      const [rot, chOrig] = txt as [string, string];
      const ch = transporCompasso(chOrig, deltaLetra, deltaSemitom);
      p.push(`<p><b><span class=l>${esc(rot)} </span></b><b><span class=c>${duro(ch)}</span></b></p>`);
    } else if (tipo === 'cif' || tipo === 'pos') {
      const fn = tipo === 'pos' ? transporLinha : transporCompasso;
      p.push(`<p><b><span class=c>${duro(fn(txt as string, deltaLetra, deltaSemitom))}</span></b></p>`);
    } else if (tipo === 'anot') {
      p.push(`<p><b><span class=a>${duro(txt as string)}</span></b></p>`);
    } else if (tipo === 'let') {
      p.push(`<p>${esc(limparLetra(txt as string))}</p>`);
    }
  }
  return p.join('');
}

/** Página completa. `ordem`: lista de (musica, tom_destino). */
export function documento(
  ordem: [MusicaDados, string][],
  titulo = 'Cifras',
  opcoes: OpcoesEmissao = {},
): string {
  const blocos = ordem.map(([m, t], i) => escrever(m, t, i > 0, opcoes)).join('');
  return (
    '<!doctype html><html lang="pt-BR"><head><meta charset="UTF-8">' +
    `<title>${esc(titulo)}</title><style>${CSS}</style></head>` +
    `<body>${blocos}</body></html>`
  );
}

/** Nome de arquivo/URL a partir de um título. */
export function slug(t: string): string {
  let semAcento = '';
  for (const c of t.normalize('NFKD')) {
    if (c.codePointAt(0)! < 128) semAcento += c;
  }
  return semAcento
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
