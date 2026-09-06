/**
 * Hino de hinário no acervo — `fonte` e `numero` como campos de verdade.
 *
 * O acervo já tinha sete hinos do HCC vindos do Drive, e o número deles
 * estava enfiado no campo `artista`, em seis grafias diferentes: `HCC 25`,
 * `25 HCC`, `52 HCC`, `329 HCC`, `HCC 66`, e um medley com o número no fim
 * de um título que também não era título. Dado certo no campo errado é pior
 * que dado ausente: a busca por artista achava "HCC" como se fosse banda, e
 * o número — que num hinário É o nome do hino — não achava nada.
 *
 * Estes testes travam as três pontas: o normalizador aceita os campos, o
 * acervo não volta a esconder número dentro de artista, e a biblioteca acha
 * o hino pelo número.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { parseMusica } from '../src/index.ts';
import { obterCampo } from '../src/cabecalho.ts';
import { normalizarCabecalhoBruto } from '../src/normalizacaoCabecalho.ts';
import { carregarRepertorio } from '../site/repertorio.ts';
import { paginaBiblioteca, paginaHinario } from '../site/paginas.ts';
import { criarServidor } from '../site/servidor.ts';
import { NAV } from '../site/ui.ts';

process.env.CIFRAS_LOG = 'silent';

const REPERTORIO_JSON = fileURLToPath(new URL('../dados/repertorio.json', import.meta.url));
const ACERVO = fileURLToPath(new URL('../musicas/', import.meta.url));

const DIRETORIO = 'musicas';
const arquivos = readdirSync(DIRETORIO).filter((n) => n.endsWith('.cifra')).sort();
const musicas = arquivos.map((nome) => ({ nome, musica: parseMusica(readFileSync(join(DIRETORIO, nome), 'utf8'), nome) }));

test('normalizarCabecalhoBruto: fonte e numero atravessam a linha em branco do cabeçalho', () => {
  // Mutação: tire 'numero'/'fonte' de CAMPOS_CONHECIDOS em
  // `src/normalizacaoCabecalho.ts` e este teste falha — a branca passa a
  // encerrar o cabeçalho e os dois campos viram corpo.
  const { cabecalho, resto } = normalizarCabecalhoBruto(['TU ÉS FIEL', 'Tom: D', '', 'fonte: HCC', 'numero: 25', '[Intro] | D |']);
  assert.deepEqual(cabecalho, ['titulo: TU ÉS FIEL', 'tom: D', 'fonte: HCC', 'numero: 25']);
  assert.deepEqual(resto, ['[Intro] | D |']);
});

test('acervo: todo .cifra com fonte declara um numero, e vice-versa', () => {
  for (const { nome, musica } of musicas) {
    const fonte = obterCampo(musica.cabecalho, 'fonte');
    const numero = obterCampo(musica.cabecalho, 'numero');
    if (fonte === undefined && numero === undefined) continue;
    assert.ok(fonte, `${nome}: tem numero sem fonte — número de hino sem hinário não identifica nada`);
    assert.ok(numero, `${nome}: tem fonte sem numero`);
    assert.match(numero!, /^\d+$/, `${nome}: numero deve ser só dígitos, veio "${numero}"`);
  }
});

test('acervo: os hinos do HCC que já existiam estão marcados, não escondidos', () => {
  const doHcc = musicas.filter(({ musica }) => obterCampo(musica.cabecalho, 'fonte') === 'HCC');
  // Sete arquivos citam o HCC pelo nome, mas só seis são hino. O sétimo é um
  // medley de duas músicas, e apenas a segunda ("A TI, Ó DEUS") é o hino 8 —
  // marcar o arquivo inteiro com `numero: 8` seria dado certo no lugar
  // errado, o mesmo defeito que este arquivo existe para impedir. Ele fica
  // sem os campos até o split de medley (`docs/rumo.md`, etapa 4); o número
  // sobrevive no rótulo da seção, `[A TI, Ó DEUS (08 HCC)]`.
  assert.equal(doHcc.length, 6, `esperava 6 hinos marcados com fonte: HCC, achei ${doHcc.length}`);
  const numeros = doHcc.map(({ musica }) => obterCampo(musica.cabecalho, 'numero')).sort();
  assert.deepEqual(numeros, ['25', '25', '329', '422', '52', '66']);
});

test('acervo: nenhum arquivo volta a guardar o número do hinário dentro de artista', () => {
  for (const { nome, musica } of musicas) {
    const artista = obterCampo(musica.cabecalho, 'artista') ?? '';
    assert.doesNotMatch(
      artista,
      /\bHCC\b/i,
      `${nome}: "${artista}" — hinário e número são campos próprios (fonte/numero), não texto no artista`,
    );
  }
});

test('biblioteca: o hino é achável pelo número, e o cartão mostra a referência', () => {
  const rep = carregarRepertorio(REPERTORIO_JSON, ACERVO);
  const html = paginaBiblioteca(rep);

  // O campo "Nome da música" filtra por `data-titulo`: é lá que o número
  // precisa estar para quem digita "25" achar o hino 25.
  assert.match(html, /data-titulo="TU ÉS FIEL HCC 25"/);
  assert.match(html, /data-busca="[^"]*HCC 329[^"]*"/);
  // E a legenda do cartão (a linha do artista, vazia num hino) mostra de onde
  // o hino vem, senão "25" acha uma música cuja origem não aparece na tela.
  assert.match(html, /<span>HCC 52<\/span>/);
});

test('repertório: `hinos` vem na ordem do LIVRO, não na de título', () => {
  const rep = carregarRepertorio(REPERTORIO_JSON, ACERVO);
  const numeros = rep.hinos.map((m) => Number(m.numero));
  assert.deepEqual(numeros, [...numeros].sort((a, b) => a - b), 'a ordem não é numérica crescente');
  // Mutação: troque `porNumero` por `porTitulo` em `site/repertorio.ts` e isto
  // falha — em ordem de título o 422 ("COMO AGRADECER") vem primeiro, e em
  // ordem de texto o 422 viria antes do 52. Só a ordem numérica dá 25 < 422.
  assert.equal(numeros[0], 25);
  assert.equal(numeros[numeros.length - 1], 422);
});

test('hinário: a tela lista por número e não repete o hinário em toda linha', () => {
  const rep = carregarRepertorio(REPERTORIO_JSON, ACERVO);
  const html = paginaHinario(rep);
  const numerosNaTela = [...html.matchAll(/<span class=num-hino>(\d+)<\/span>/g)].map((m) => Number(m[1]));
  assert.deepEqual(numerosNaTela, [25, 25, 52, 66, 329, 422]);
  // Com um hinário só no acervo, "HCC" em toda linha não distingue nada e o
  // número já está na coluna ao lado. A referência completa continua no
  // índice de busca, senão digitar "HCC" não acharia nada.
  assert.doesNotMatch(html, /<span>HCC<\/span>/);
  assert.match(html, /data-busca="[^"]*HCC 422[^"]*"/);
});

test('a navegação leva ao hinário, na lateral e na aba do celular', () => {
  const itens = NAV.flatMap((g) => g.itens);
  const hinario = itens.find((i) => i.href === '/hinario');
  assert.ok(hinario, 'sem item de hinário na navegação');
  assert.equal(hinario!.aba, true, 'sem aba no celular o hinário fica inalcançável: a lateral some no estreito');
  // Mora no mesmo grupo de Músicas: é outra ordem do mesmo acervo, não um
  // quarto assunto (ver a doutrina em `site/ui.ts`).
  const grupo = NAV.find((g) => g.itens.some((i) => i.href === '/hinario'));
  assert.equal(grupo!.grupo, 'Biblioteca');
});

test('rota /hinario responde e a do culto aceita o hino pelo número', async () => {
  const app = criarServidor({ porta: 0, host: '127.0.0.1', repertorio: REPERTORIO_JSON, acervo: ACERVO });
  try {
    const hinario = await app.inject({ method: 'GET', url: '/hinario' });
    assert.equal(hinario.statusCode, 200);
    assert.match(hinario.body, /COMO AGRADECER A JESUS\?/);

    // O que o pedido depende de verdade: dentro do culto, o filtro de
    // "+ Adicionar música" tem que casar com o número do hino. Sem a
    // referência no `data-busca`, digitar 422 não acha nada — e o número é o
    // que quem monta o culto tem na mão.
    const culto = await app.inject({ method: 'GET', url: '/culto/06SET' });
    assert.equal(culto.statusCode, 200);
    const linha = /<li data-busca="([^"]*como agradecer[^"]*)"/.exec(culto.body);
    assert.ok(linha, 'o hino não aparece entre as candidatas do culto');
    assert.match(linha![1]!, /hcc 422/, 'o número do hino não está no índice de busca do culto');
  } finally {
    await app.close();
  }
});
