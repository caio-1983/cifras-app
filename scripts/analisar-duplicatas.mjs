/**
 * Agrupa os .txt crus por música e diz quais variantes são a MESMA cifra,
 * SEM GRAVAR NADA. Diagnóstico para decidir, na importação, qual arquivo
 * vira o `.cifra` quando a mesma música veio do Drive em vários tons.
 *
 * Como a igualdade é decidida: a assinatura harmônica é o intervalo de
 * cada acorde em relação ao tom da própria música — não a grafia. Assim
 * "Digno de Tudo em C" e "em D" comparam iguais sem passar pelo
 * transpositor, e nenhuma diferença enarmônica vira falso negativo.
 *
 * Critério de preferência (do usuário): compasso `| |` ganha de posicional
 * `~`. Empate desempata por mais letra, depois por mais seções.
 *
 *   node scripts/analisar-duplicatas.mjs [diretório]   (padrão: bruto/txt)
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { importarCifraCrua } from '../src/importador.ts';
import { tomDoTituloDrive } from '../src/tomDoTitulo.ts';
import { parseMusica } from '../src/index.ts';
import { parseTom } from '../src/tom.ts';
import { semitom } from '../src/nota.ts';

const diretorio = process.argv[2] ?? 'bruto/txt';
const arquivos = readdirSync(diretorio).filter((n) => n.endsWith('.txt')).sort();

const tomPorArquivo = new Map();
const tituloPorArquivo = new Map();
const inventario = join(diretorio, '_inventario-completo.tsv');
if (existsSync(inventario)) {
  for (const linha of readFileSync(inventario, 'utf8').split('\n').slice(1)) {
    const [tituloDrive, , slug] = linha.split('\t');
    if (!slug) continue;
    const nome = slug.trim();
    tituloPorArquivo.set(nome, tituloDrive ?? '');
    const tom = tomDoTituloDrive(tituloDrive ?? '');
    if (tom !== undefined) tomPorArquivo.set(nome, tom);
  }
}

/**
 * Chave da música: o slug sem o que só diz TOM ou VOZ. Tira do fim, em
 * laço, porque os títulos do Drive empilham ("..._TOM_C" + sufixo de
 * colisão numérico). O que sobra é o título.
 */
const RE_SUFIXO_DESCARTAVEL =
  /-(?:\d+|tom-[a-g](?:b|s|sus)?m?|[a-g](?:b|#)?m?|fem|feminino|masc|masculino|contralto|tenor|soprano)$/;
function chaveMusica(slug) {
  let s = slug.replace(/\.txt$/, '');
  for (;;) {
    const novo = s.replace(RE_SUFIXO_DESCARTAVEL, '');
    if (novo === s || novo === '') return s;
    s = novo;
  }
}

function mod12(n) {
  return ((n % 12) + 12) % 12;
}

/**
 * Mesma sequência transposta = mesma cifra. Ancora tudo no PRIMEIRO acorde,
 * e não na tônica declarada, porque o `tom:` de vários arquivos do Drive vem
 * do título e discorda do que está escrito na cifra. Ancorar no cabeçalho
 * fazia duas cópias da mesma cifra parecerem diferentes por um campo errado.
 */
function ancorar(acordes) {
  if (acordes.length === 0) return '';
  const base = acordes[0].raiz;
  return acordes.map((a) => {
    const raiz = mod12(a.raiz - base);
    const baixo = a.baixo === undefined ? '' : `/${mod12(a.baixo - base)}`;
    return `${raiz}${a.sufixo}${baixo}`;
  });
}

/**
 * Quantos acordes divergem entre duas variantes. Só compara sequências do
 * mesmo tamanho: com tamanhos diferentes, "quantos mudaram" não tem
 * resposta honesta sem alinhar, e alinhar mal inventaria semelhança.
 */
function distancia(a, b) {
  if (a.length !== b.length) return undefined;
  let n = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++;
  return n;
}

function normalizarTexto(texto) {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const fichas = [];
const naoLidos = [];

for (const nome of arquivos) {
  const cru = readFileSync(join(diretorio, nome), 'utf8');
  let musica;
  try {
    const cifra = importarCifraCrua(cru, nome, { tom: tomPorArquivo.get(nome) });
    musica = parseMusica(cifra, nome);
  } catch (erro) {
    naoLidos.push({ nome, chave: chaveMusica(nome), mensagem: erro.message });
    continue;
  }

  const tomTexto = musica.cabecalho.campos.find((c) => c.chave === 'tom')?.valor ?? '';
  let raizDoTom;
  try {
    raizDoTom = semitom(parseTom(tomTexto.trim()));
  } catch {
    /* sem tom legível no cabeçalho: só o primeiro acorde ancora */
  }

  const acordes = [];
  const letra = [];
  let compasso = 0;
  let posicional = 0;
  let secoes = 0;
  for (const linha of musica.corpo) {
    if (linha.tipo === 'letra') {
      const t = normalizarTexto(linha.texto);
      if (t) letra.push(t);
      continue;
    }
    if (linha.tipo === 'subtitulo') {
      secoes++;
      continue;
    }
    if (linha.tipo !== 'cifra' && linha.tipo !== 'posicional') continue;
    if (linha.tipo === 'posicional') posicional++;
    else if (linha.itens.some((i) => i.item.tipo === 'literal' && i.item.texto.startsWith('|'))) compasso++;
    for (const { item } of linha.itens) {
      if (item.tipo !== 'acorde') continue;
      acordes.push({
        raiz: semitom(item.acorde.raiz),
        sufixo: item.acorde.sufixo,
        baixo: item.acorde.baixo ? semitom(item.acorde.baixo) : undefined,
      });
    }
  }

  fichas.push({
    nome,
    chave: chaveMusica(nome),
    tom: tomTexto,
    compasso,
    posicional,
    secoes,
    nLetra: letra.length,
    nAcordes: acordes.length,
    // O primeiro acorde diz em que tom a cifra REALMENTE está escrita;
    // quando isso discorda de `tom:`, o cabeçalho é que está errado.
    primeiroAcorde: acordes[0]?.raiz,
    tomDeclarado: raizDoTom,
    graus: ancorar(acordes),
    letra,
  });
}

/** Compasso ganha de posicional; depois mais letra, mais seções, mais acordes. */
function pontos(f) {
  return [
    f.compasso > 0 && f.posicional === 0 ? 2 : f.compasso > 0 ? 1 : 0,
    f.nLetra,
    f.secoes,
    f.graus.length,
  ];
}
function melhor(a, b) {
  const pa = pontos(a);
  const pb = pontos(b);
  for (let i = 0; i < pa.length; i++) {
    if (pa[i] !== pb[i]) return pa[i] > pb[i] ? a : b;
  }
  return a.nome < b.nome ? a : b;
}

/** Um grupo por título: os que importam e os que ainda não, lado a lado. */
const grupos = new Map();
function grupo(chave) {
  if (!grupos.has(chave)) grupos.set(chave, { lidos: [], pendentes: [] });
  return grupos.get(chave);
}
for (const f of fichas) grupo(f.chave).lidos.push(f);
for (const p of naoLidos) grupo(p.chave).pendentes.push(p);

const comVarios = [...grupos.entries()]
  .filter(([, g]) => g.lidos.length + g.pendentes.length > 1)
  .sort((a, b) => a[0].localeCompare(b[0]));

/**
 * A letra como SEQUÊNCIA DE PALAVRAS, sem as quebras de linha. Comparar
 * linha a linha dava falso positivo: `digno-e-o-senhor` tem a mesma letra
 * nos dois arquivos, um deles só junta dois versos numa linha só.
 */
function palavras(f) {
  return f.letra.join(' ').split(' ').filter(Boolean);
}

/** Quantas palavras cantadas de `b` não estão em `a`, na mesma ordem. */
function letraDivergente(a, b) {
  const pa = palavras(a).join(' ');
  const pb = palavras(b).join(' ');
  return pa === pb ? 0 : Math.abs(palavras(a).length - palavras(b).length) || 1;
}

/** Distância a partir da qual duas variantes ainda pedem olho humano. */
const LIMITE_QUASE = 3;

let elimináveis = 0;
let quaseIguais = 0;
let divergentes = 0;

for (const [chave, { lidos: fs, pendentes }] of comVarios) {
  const escolhido = fs.length > 0 ? fs.reduce(melhor) : undefined;
  console.log(`\n${chave}`);

  for (const f of fs) {
    const d = f === escolhido ? 0 : distancia(escolhido.graus, f.graus);
    const forma =
      f.compasso > 0 && f.posicional > 0 ? 'misto'
      : f.compasso > 0 ? 'compasso'
      : f.posicional > 0 ? 'posicional'
      : 'sem cifra';

    let veredito = '';
    let marca = ' ';
    if (f === escolhido) {
      marca = '→';
      veredito = 'fica';
    } else if (d === 0 && letraDivergente(escolhido, f) === 0) {
      marca = 'x';
      veredito = 'mesma cifra e mesma letra — pode eliminar';
      elimináveis++;
    } else if (d === 0) {
      // Harmonia igual não basta: se esta variante canta algo que a escolhida
      // não canta, eliminar apaga letra. Vira conferência, não descarte.
      marca = '?';
      veredito = `mesma cifra, mas a letra difere em ${letraDivergente(escolhido, f)} palavra(s) — conferir`;
      quaseIguais++;
    } else if (d !== undefined && d <= LIMITE_QUASE) {
      marca = '?';
      veredito = `${d} de ${f.graus.length} acordes diferem — conferir`;
      quaseIguais++;
    } else {
      veredito =
        d === undefined
          ? `outra escrita (${escolhido.graus.length} vs ${f.graus.length} acordes)`
          : `${d} de ${f.graus.length} acordes diferem`;
      divergentes++;
    }

    console.log(
      `  ${marca} ${f.nome.padEnd(46)} tom ${(f.tom || '?').padEnd(4)} ${forma.padEnd(10)}` +
        ` ${String(f.compasso).padStart(3)}| ${String(f.posicional).padStart(3)}~` +
        ` ${String(f.nLetra).padStart(3)} letra   ${veredito}`,
    );
  }
  for (const p of pendentes) {
    console.log(`  ! ${p.nome.padEnd(46)} NÃO IMPORTA: ${p.mensagem.slice(0, 80)}`);
  }
}

console.log(
  `\n--- ${fichas.length} lidos, ${naoLidos.length} não importam · ` +
    `${comVarios.length} títulos com mais de um arquivo ---\n` +
    `    ${elimináveis} cópias exatas (elimináveis) · ` +
    `${quaseIguais} a até ${LIMITE_QUASE} acordes (conferir) · ` +
    `${divergentes} realmente diferentes`,
);
