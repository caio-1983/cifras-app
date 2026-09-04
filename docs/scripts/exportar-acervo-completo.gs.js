/**
 * Exporta TODOS os Google Docs da pasta "Cifras" como .txt CRU (export
 * text/plain), gravando na mesma pasta "txt-cru" usada pelo
 * exportar-txt-cru.gs.js. São ~400 arquivos.
 *
 * Diferença para o exportar-txt-cru.gs.js: aquele leva os 73 fileId do
 * repertório ativo embutidos (gerados de bruto/inventario.tsv); este varre
 * a pasta inteira. O nome de destino é gerado pela MESMA regra de slug, e
 * arquivo já gravado é pulado — então rodar este depois daquele não
 * rebaixa os 73 nem duplica nada.
 *
 * POR QUE O EXPORT text/plain: ler esses documentos pela via normal do
 * leitor do Drive devolve uma representacao markdown que escapa TODO
 * sustenido como "\#", fabrica "**" a partir do negrito e troca CRLF por
 * "\n\n" — corrompe o caractere mais importante de uma cifra, de forma
 * sistematica (comparacao registrada em bruto/MANIFESTO.md).
 *
 * SUBPASTAS FICAM DE FORA por construcao: folder.getFiles() nao e
 * recursivo, entao "docx-originais" (os .docx que o converter-cifras.gs.js
 * moveu) e "Cultos" nao entram.
 *
 * Antes de rodar (em script.google.com, projeto novo):
 *  1. Cole este arquivo inteiro no editor.
 *  2. Selecione "exportarAcervoCompleto" e Execute. Autorize o acesso ao
 *     Drive na primeira vez.
 *  3. Ele para sozinho antes do limite de 6 minutos do Apps Script. Com
 *     ~400 arquivos vao ser VARIAS execucoes: rode de novo ate o log dizer
 *     "nada mais a exportar". Cada execucao continua de onde parou.
 *
 * Ao terminar, ele grava tambem "_inventario-completo.tsv" na pasta de
 * destino, com titulo/fileId/slug de tudo — a procedencia desce junto com
 * o zip. Baixe a pasta "txt-cru" (botao direito > Fazer download) e
 * descompacte em bruto/txt/ aqui no repo.
 *
 * Script avulso de manutencao do Drive, como converter-cifras.gs.js — nao
 * faz parte do nucleo. Ver docs/rumo.md, Sprint 1.
 */

var PASTA_CIFRAS_ID = '1-GbEeYfhNmWWS0_Pv0wnb2RN4mT4GgEi';
var PASTA_DESTINO_NOME = 'txt-cru';
var TEMPO_LIMITE_MS = 5 * 60 * 1000;
var ARQUIVO_INVENTARIO = '_inventario-completo.tsv';

function exportarAcervoCompleto() {
  var inicio = new Date().getTime();
  var destino = pastaDestino_(PASTA_DESTINO_NOME);

  var planejados = planejarExportacao_();
  Logger.log('Docs na pasta Cifras: ' + planejados.length);

  var jaGravados = {};
  var existentes = destino.getFiles();
  while (existentes.hasNext()) {
    jaGravados[existentes.next().getName()] = true;
  }

  var token = ScriptApp.getOAuthToken();
  var gravados = 0, pulados = 0, erros = 0, suspeitos = 0, restantes = 0;

  for (var i = 0; i < planejados.length; i++) {
    var alvo = planejados[i];

    if (jaGravados[alvo.nome]) { pulados++; continue; }

    if (new Date().getTime() - inicio > TEMPO_LIMITE_MS) { restantes++; continue; }

    try {
      var url = 'https://www.googleapis.com/drive/v3/files/' + alvo.fileId
        + '/export?mimeType=text%2Fplain';
      var resposta = UrlFetchApp.fetch(url, {
        headers: { Authorization: 'Bearer ' + token },
        muteHttpExceptions: true
      });

      if (resposta.getResponseCode() !== 200) {
        erros++;
        Logger.log('ERRO HTTP ' + resposta.getResponseCode() + ' em "' + alvo.titulo
          + '": ' + resposta.getContentText().slice(0, 200));
        continue;
      }

      var blob = resposta.getBlob().setName(alvo.nome);
      var aviso = conferirFidelidade_(blob.getDataAsString('UTF-8'));
      if (aviso) { suspeitos++; Logger.log('SUSPEITO em "' + alvo.nome + '": ' + aviso); }

      // O blob vai inteiro pro arquivo, sem passar por string — reconstruir
      // o texto normalizaria BOM e CRLF, que sao os bytes a preservar.
      destino.createFile(blob);
      jaGravados[alvo.nome] = true;
      gravados++;
    } catch (e) {
      erros++;
      Logger.log('ERRO em "' + alvo.titulo + '": ' + e.message);
    }
  }

  gravarInventario_(destino, planejados);

  Logger.log('--- Resumo --- na pasta: ' + planejados.length
    + ' | gravados nesta execucao: ' + gravados
    + ' | ja existiam: ' + pulados
    + ' | suspeitos de fidelidade: ' + suspeitos
    + ' | erros: ' + erros);
  Logger.log(restantes > 0
    ? 'FALTAM ' + restantes + ' arquivos — rode a funcao de novo para continuar.'
    : 'Nada mais a exportar. Pasta: ' + destino.getUrl());
}

/**
 * Enumera os Docs da pasta e decide o nome de destino de cada um, numa
 * passada só e em ordem ESTAVEL (titulo, depois fileId).
 *
 * A ordem estavel importa: o sufixo de colisao (-2, -3) depende de quem
 * vem primeiro, e a iteracao do Drive nao garante ordem entre execucoes.
 * Sem isso, o mesmo documento poderia receber nomes diferentes em runs
 * diferentes e ser baixado duas vezes. Colisao de slug e real no acervo:
 * "PODER PRA SALVAR_TOM_E" e "PODER PRA SALVAR_TOM-E" geram o mesmo.
 */
function planejarExportacao_() {
  var pasta = DriveApp.getFolderById(PASTA_CIFRAS_ID);

  var docs = [];
  var iter = pasta.getFilesByType(MimeType.GOOGLE_DOCS);
  while (iter.hasNext()) {
    var f = iter.next();
    docs.push({ fileId: f.getId(), titulo: f.getName() });
  }

  // Avisa se sobrou .docx solto — deveria ter sido convertido e movido
  // para "docx-originais" pelo converter-cifras.gs.js.
  var soltos = 0;
  var docx = pasta.getFilesByType('application/vnd.openxmlformats-officedocument.wordprocessingml.document');
  while (docx.hasNext()) { docx.next(); soltos++; }
  if (soltos > 0) {
    Logger.log('ATENCAO: ' + soltos + ' .docx ainda soltos na pasta Cifras (nao exportados). '
      + 'Rode converter-cifras.gs.js antes, ou eles ficam de fora do acervo.');
  }

  docs.sort(function (a, b) {
    if (a.titulo !== b.titulo) return a.titulo < b.titulo ? -1 : 1;
    return a.fileId < b.fileId ? -1 : 1;
  });

  var usados = {};
  for (var i = 0; i < docs.length; i++) {
    var base = gerarSlug_(docs[i].titulo);
    usados[base] = (usados[base] || 0) + 1;
    docs[i].nome = base + (usados[base] === 1 ? '' : '-' + usados[base]) + '.txt';
  }
  return docs;
}

/**
 * Mesma regra de slug do bruto/inventario.tsv — conferida contra os 73
 * nomes de la, reproduz todos. E o que faz este script reconhecer o que o
 * exportar-txt-cru.gs.js ja gravou, em vez de baixar de novo com outro nome.
 */
function gerarSlug_(titulo) {
  return titulo
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

/** Procedencia: qual .txt veio de qual documento. Desce junto no zip. */
function gravarInventario_(destino, planejados) {
  var linhas = ['titulo_drive\tfileId\tslug_destino'];
  for (var i = 0; i < planejados.length; i++) {
    linhas.push(planejados[i].titulo + '\t' + planejados[i].fileId + '\t' + planejados[i].nome);
  }
  var conteudo = linhas.join('\n') + '\n';

  var antigos = destino.getFilesByName(ARQUIVO_INVENTARIO);
  while (antigos.hasNext()) destino.removeFile(antigos.next());
  destino.createFile(ARQUIVO_INVENTARIO, conteudo, MimeType.PLAIN_TEXT);
}

/**
 * Devolve uma mensagem se o texto exportado tiver sinal das corrupcoes
 * conhecidas, ou string vazia se estiver limpo. As duas checagens
 * correspondem a falhas REAIS ja observadas: "\#" e o escape de sustenido
 * do leitor do Drive, e espacamento multiplo e o que alinha acorde sobre
 * silaba.
 *
 * "Sem espacamento multiplo" e so INDICIO: uma cifra escrita 100% em
 * compasso legitimamente nao tem nenhum. Dos 73 primeiros, os 8 avisados
 * eram todos assim. A conferencia que decide e a local, sobre os bytes
 * (scripts/conferir-txt-cru.mjs).
 */
function conferirFidelidade_(texto) {
  // Regex literal de proposito: em string, '\#' em JS e so '#', e a guarda
  // dispararia em todo arquivo sem ninguem notar.
  if (/\\#/.test(texto)) {
    return 'sustenido aparece escapado (barra invertida antes do #) — via de export errada';
  }
  if (texto.indexOf('  ') === -1) {
    return 'nenhum espacamento multiplo no arquivo — pode ser cifra 100% em compasso, ou alinhamento colapsado';
  }
  return '';
}

function pastaDestino_(nome) {
  var achadas = DriveApp.getFoldersByName(nome);
  return achadas.hasNext() ? achadas.next() : DriveApp.createFolder(nome);
}
