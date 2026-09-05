/**
 * Leitura do dump do Drive (`bruto/txt`) como acervo: importa cada `.txt`,
 * agrupa por música e diz quais variantes são a mesma cifra.
 *
 * Existe para o diagnóstico (`analisar-duplicatas.mjs`) e a gravação
 * (`importar-lote.mjs`) usarem EXATAMENTE o mesmo critério. Duas cópias da
 * regra divergiriam, e a divergência apareceria como arquivo eliminado que
 * o relatório dizia manter.
 *
 * Nada aqui grava.
 */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { importarCifraCrua } from '../src/importador.ts';
import { tomDoTituloDrive } from '../src/tomDoTitulo.ts';
import { parseMusica } from '../src/index.ts';
import { parseTom } from '../src/tom.ts';
import { semitom } from '../src/nota.ts';

/**
 * Chave da música: o slug sem o que só diz TOM ou VOZ. Tira do fim, em
 * laço, porque os títulos do Drive empilham ("..._TOM_C" mais sufixo de
 * colisão numérico). O que sobra é o título.
 */
const RE_SUFIXO_DESCARTAVEL =
  /-(?:\d+|tom-[a-g](?:b|s|sus)?m?|[a-g](?:b|#)?m?|fem|feminino|masc|masculino|contralto|tenor|soprano)$/;

export function chaveMusica(slug) {
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
  if (acordes.length === 0) return [];
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
export function distancia(a, b) {
  if (a.length !== b.length) return undefined;
  let n = 0;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) n++;
  return n;
}

/**
 * A letra como sequência de palavras, sem as quebras de linha. Comparar
 * linha a linha dava falso positivo: `digno-e-o-senhor` tem a mesma letra
 * nos dois arquivos, um deles só junta dois versos numa linha só.
 */
function palavras(f) {
  return f.letra.join(' ').split(' ').filter(Boolean);
}

/** 0 quando as duas cantam exatamente o mesmo; senão, o tamanho da sobra. */
export function letraDivergente(a, b) {
  const pa = palavras(a);
  const pb = palavras(b);
  if (pa.join(' ') === pb.join(' ')) return 0;
  return Math.abs(pa.length - pb.length) || 1;
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

/**
 * Preferência do usuário: compasso `| |` ganha de posicional `~`. Depois,
 * mais letra, mais seções, mais acordes — nessa ordem. O nome do arquivo
 * desempata por último, só para o resultado não depender da ordem de
 * leitura do diretório.
 */
function pontos(f) {
  return [
    f.compasso > 0 && f.posicional === 0 ? 2 : f.compasso > 0 ? 1 : 0,
    f.nLetra,
    f.secoes,
    f.graus.length,
  ];
}

export function melhor(a, b) {
  const pa = pontos(a);
  const pb = pontos(b);
  for (let i = 0; i < pa.length; i++) {
    if (pa[i] !== pb[i]) return pa[i] > pb[i] ? a : b;
  }
  return a.nome < b.nome ? a : b;
}

/** Tom que o Apps Script deixou no título do Drive, por arquivo. */
export function lerInventario(diretorio) {
  const tomPorArquivo = new Map();
  const tituloPorArquivo = new Map();
  const caminho = join(diretorio, '_inventario-completo.tsv');
  if (!existsSync(caminho)) return { tomPorArquivo, tituloPorArquivo };
  for (const linha of readFileSync(caminho, 'utf8').split('\n').slice(1)) {
    const [tituloDrive, , slug] = linha.split('\t');
    if (!slug) continue;
    const nome = slug.trim();
    tituloPorArquivo.set(nome, (tituloDrive ?? '').trim());
    const tom = tomDoTituloDrive(tituloDrive ?? '');
    if (tom !== undefined) tomPorArquivo.set(nome, tom);
  }
  return { tomPorArquivo, tituloPorArquivo };
}

/**
 * A ficha de um `.cifra` já pronto: o que basta para comparar duas
 * variantes e para escolher entre elas. Serve tanto para o que acabou de
 * sair do importador quanto para um arquivo que já está em `musicas/`.
 */
export function ficharTexto(texto, nome) {
  const musica = parseMusica(texto, nome);
  const tomTexto = musica.cabecalho.campos.find((c) => c.chave === 'tom')?.valor?.trim() ?? '';
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
    else compasso++;
    for (const { item } of linha.itens) {
      if (item.tipo !== 'acorde') continue;
      acordes.push({
        raiz: semitom(item.acorde.raiz),
        sufixo: item.acorde.sufixo,
        baixo: item.acorde.baixo ? semitom(item.acorde.baixo) : undefined,
      });
    }
  }

  let tomValido = false;
  try {
    parseTom(tomTexto);
    tomValido = true;
  } catch {
    /* tom ilegível fica registrado como tal; quem grava decide o que fazer */
  }

  return {
    nome,
    tom: tomTexto,
    tomValido,
    compasso,
    posicional,
    secoes,
    nLetra: letra.length,
    letra,
    graus: ancorar(acordes),
    texto,
  };
}

/** true quando as duas são a mesma cifra E a mesma letra. */
export function saoIguais(a, b) {
  return distancia(a.graus, b.graus) === 0 && letraDivergente(a, b) === 0;
}

/**
 * Lê o diretório inteiro e devolve um grupo por música, com os arquivos que
 * importam (`lidos`) e os que ainda não (`pendentes`), mais o texto `.cifra`
 * já produzido para quem quiser gravar.
 */
export function lerAcervo(diretorio) {
  const { tomPorArquivo, tituloPorArquivo } = lerInventario(diretorio);
  const arquivos = readdirSync(diretorio).filter((n) => n.endsWith('.txt')).sort();

  const fichas = [];
  const naoLidos = [];

  for (const nome of arquivos) {
    const cru = readFileSync(join(diretorio, nome), 'utf8');
    let ficha;
    try {
      ficha = ficharTexto(importarCifraCrua(cru, nome, { tom: tomPorArquivo.get(nome) }), nome);
    } catch (erro) {
      naoLidos.push({ nome, chave: chaveMusica(nome), mensagem: erro.message });
      continue;
    }
    fichas.push({ ...ficha, chave: chaveMusica(nome), titulo: tituloPorArquivo.get(nome) ?? '' });
  }

  const grupos = new Map();
  const de = (chave) => {
    if (!grupos.has(chave)) grupos.set(chave, { chave, lidos: [], pendentes: [] });
    return grupos.get(chave);
  };
  for (const f of fichas) de(f.chave).lidos.push(f);
  for (const p of naoLidos) de(p.chave).pendentes.push(p);

  return {
    fichas,
    naoLidos,
    grupos: [...grupos.values()].sort((a, b) => a.chave.localeCompare(b.chave)),
  };
}

/**
 * Classifica cada variante de um grupo contra a escolhida: `fica`,
 * `duplicata` (mesma cifra E mesma letra — descartável) ou `variante`
 * (diverge em alguma coisa, precisa sobreviver com nome próprio).
 */
export function classificarGrupo(grupo, limiteQuase = 3) {
  const escolhido = grupo.lidos.length > 0 ? grupo.lidos.reduce(melhor) : undefined;
  return grupo.lidos.map((f) => {
    if (f === escolhido) return { ficha: f, papel: 'fica', distancia: 0 };
    const d = distancia(escolhido.graus, f.graus);
    const dLetra = letraDivergente(escolhido, f);
    if (d === 0 && dLetra === 0) return { ficha: f, papel: 'duplicata', distancia: 0 };
    return {
      ficha: f,
      papel: 'variante',
      distancia: d,
      letraDivergente: dLetra,
      quase: d !== undefined && d <= limiteQuase,
    };
  });
}
