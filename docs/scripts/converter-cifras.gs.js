/**
 * Converte todos os .docx soltos na pasta "Cifras" para Google Doc,
 * preservando o conteúdo (inclusive o espaçamento usado pra alinhar
 * acordes sobre a letra). O .docx original é movido para a pasta
 * "docx-originais" (não é apagado).
 *
 * Script avulso de manutenção do Drive (regra 2 do usuário: só um
 * formato deve sobrar na pasta Cifras). Não faz parte do núcleo do
 * projeto (parser/transpositor) — ver docs/plano-camada-formato.md e a
 * memória "referencia-drive-acervo" pro contexto completo.
 *
 * Antes de rodar (em script.google.com, projeto novo):
 *  1. No editor do Apps Script, clique em "Serviços" (ícone +) na barra
 *     lateral esquerda e adicione "Drive API" (versão avançada).
 *  2. Se aparecer um aviso pedindo pra habilitar a API no Google Cloud,
 *     clique no link indicado e habilite.
 *  3. Selecione a função "converterCifras" no menu suspenso do topo e
 *     clique em Executar (Run). Na primeira vez ele vai pedir autorização
 *     de acesso ao seu Drive — revise e permita.
 *
 * O script para sozinho um pouco antes do limite de 6 minutos do Apps
 * Script. Se ainda sobrar arquivo pra converter, é só rodar de novo —
 * ele continua de onde parou (os já convertidos saem da pasta Cifras,
 * então não são reprocessados).
 */
function converterCifras() {
  var PASTA_CIFRAS_ID = '1-GbEeYfhNmWWS0_Pv0wnb2RN4mT4GgEi';
  var PASTA_ORIGINAIS_ID = '1GmxkHgI57wKEUQimIHPEen4HWDogwXEx';
  var MIME_DOCX = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  var TEMPO_LIMITE_MS = 5 * 60 * 1000;

  var inicio = new Date().getTime();
  var pastaCifras = DriveApp.getFolderById(PASTA_CIFRAS_ID);
  var pastaOriginais = DriveApp.getFolderById(PASTA_ORIGINAIS_ID);

  // Nomes que já existem como Google Doc na pasta, pra não converter duas vezes
  // se uma execução anterior tiver sido interrompida no meio de um arquivo.
  var nomesJaConvertidos = {};
  var docsExistentes = pastaCifras.getFilesByType(MimeType.GOOGLE_DOCS);
  while (docsExistentes.hasNext()) {
    nomesJaConvertidos[docsExistentes.next().getName()] = true;
  }

  var arquivos = pastaCifras.getFilesByType(MIME_DOCX);
  var convertidos = 0;
  var erros = 0;

  while (arquivos.hasNext()) {
    if (new Date().getTime() - inicio > TEMPO_LIMITE_MS) {
      Logger.log('Parando antes do limite de tempo. Convertidos nesta execução: ' + convertidos + '. Rode a função de novo para continuar.');
      return;
    }

    var arquivo = arquivos.next();
    var nomeOriginal = arquivo.getName();
    var nomeNovo = nomeOriginal.replace(/\.docx$/i, '');

    try {
      if (!nomesJaConvertidos[nomeNovo]) {
        var recurso = {
          title: nomeNovo,
          mimeType: MimeType.GOOGLE_DOCS,
          parents: [{ id: PASTA_CIFRAS_ID }]
        };
        Drive.Files.copy(recurso, arquivo.getId());
        nomesJaConvertidos[nomeNovo] = true;
      }

      pastaOriginais.addFile(arquivo);
      pastaCifras.removeFile(arquivo);

      convertidos++;
      Logger.log('Convertido: ' + nomeOriginal);
    } catch (e) {
      erros++;
      Logger.log('ERRO em "' + nomeOriginal + '": ' + e.message);
    }
  }

  Logger.log('Concluído. Convertidos nesta execução: ' + convertidos + '. Erros: ' + erros + '. Não há mais .docx soltos na pasta Cifras.');
}
