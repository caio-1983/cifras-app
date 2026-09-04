/**
 * Exporta os 73 Google Docs selecionados da pasta "Cifras" como .txt CRU
 * (export text/plain), gravando numa pasta "txt-cru" no seu Drive.
 *
 * POR QUE ESTE SCRIPT EXISTE: ler esses documentos pela via normal do
 * leitor do Drive devolve uma representacao markdown, nao o conteudo —
 * ela escapa TODO sustenido como "\#", fabrica "**" a partir do negrito
 * e troca CRLF por "\n\n". Num acervo de cifras isso corrompe o
 * caractere mais importante do arquivo, de forma sistematica. O export
 * text/plain nao faz nada disso (comparacao registrada em
 * bruto/MANIFESTO.md).
 *
 * A lista de 73 arquivos abaixo foi GERADA de bruto/inventario.tsv, que
 * ja traz a selecao validada e deduplicada (75 linhas, 73 ids unicos —
 * 2 medleys aparecem duas vezes, uma por musica). Nao edite a lista a
 * mao: regenere a partir do inventario.
 *
 * Antes de rodar (em script.google.com, projeto novo):
 *  1. Cole este arquivo inteiro no editor.
 *  2. Selecione a funcao "exportarTxtCru" no menu do topo e clique em
 *     Executar. Na primeira vez ele pede autorizacao de acesso ao seu
 *     Drive — revise e permita.
 *  3. Ele para sozinho antes do limite de 6 minutos do Apps Script. Se
 *     sobrar arquivo, rode de novo: ele pula o que ja gravou.
 *
 * Depois de rodar: baixe a pasta "txt-cru" pelo Drive (botao direito >
 * Fazer download, que gera um .zip byte-fiel) e descompacte em
 * bruto/txt/ aqui no repo.
 *
 * O script confere a fidelidade de cada arquivo NA ORIGEM e avisa no log
 * se achar sustenido escapado ou espacamento colapsado — e o que pegaria
 * uma regressao da via de export antes de 73 arquivos inserviveis serem
 * baixados.
 *
 * Script avulso de manutencao do Drive, como converter-cifras.gs.js —
 * nao faz parte do nucleo. Ver docs/rumo.md, Sprint 1, etapa 0.
 */

// [fileId, nome do .txt de destino]  // titulo no Drive
var ARQUIVOS = [
  ['1uG1dSbETKMzRXHXPqHo-jVEXFuXXBm-bdc6TrtQ-PEc', 'alem-do-impossivel-c-masculino.txt'],  // ALÉM DO IMPOSSÍVEL_C_masculino
  ['1aYvlSfjkz_4LRlNLT74jJMp2Jy13RUpLMwbOswnaDP8', 'alem-do-impossivel-e-feminino.txt'],  // ALÉM DO IMPOSSÍVEL_E_feminino
  ['1LeNOQlTPq_pvN3j5GuvlGN38GDbB2f-wv9Xe3rZ96h0', 'ao-unico-ab.txt'],  // AO ÚNICO_Ab
  ['1AiGjcDOSedM_2kH7JzdR8Z4ReI31QMpMjauQCU8F4Mw', 'ao-unico-c.txt'],  // AO ÚNICO_C
  ['1d4u5jDBXs9IzAfBq_4bB13dMIvn0-acvgzuHx5fFCCo', 'vim-para-adorar-te-ao-unico-a-ele-a-gloria.txt'],  // Vim Para Adorar-Te / Ao Único / A Ele a Glória
  ['1ezxlqla55E1WqD3AHGk7_hsDQh3NxqqWQdrC9NBOz30', 'atos-2-g-feminino.txt'],  // Atos 2_G_Feminino
  ['1-16FUGaz1a6tg6jx-84fPZes0ysYWsiN7LfqquX3FWw', 'atos-2-f-contralto.txt'],  // Atos 2_F_Contralto
  ['1udioM9ZB1HjtKY0DJMXoag48f3f2FOoXprwDxAmiX18', 'atos-2-c-tenor.txt'],  // Atos 2_C_Tenor
  ['1PxfPNyRA7oTRSTU1Zg69tpH1otFd6jnqXqYDIHN6lGg', 'bendito-e-o-rei.txt'],  // Bendito é o Rei
  ['1gK3gj78GgEq81M2AH-SuYt9hpa2R2zZc07CWnQpoYjw', 'caminho-no-deserto-tom-g.txt'],  // CAMINHO NO DESERTO - TOM_G
  ['1pukHx6aWLBzQkBlfml-5-MX-rcYhX7nA2JQfg90zrvY', 'caminho-no-deserto-g.txt'],  // CAMINHO NO DESERTO_G
  ['1srTyKCzZwUKqbi3ePMvzDDxwvyjmXVWiMN-Lwg2KMYI', 'cancao-do-ceu-e.txt'],  // Canção do Céu_E
  ['17iwpE9DXR55VPGMI9h0YXGgOIUHvPCUPHrITyxvA43Y', 'confiarei-tom-geral.txt'],  // CONFIAREI (tom geral)
  ['1Ke3ChHvikr4YqjUm3gA4VLKoHJXg_g9SADg12hHFRuU', 'digno-de-tudo-tom-c.txt'],  // DIGNO DE TUDO - TOM_C
  ['1227d54hXQjxfyJpkMBVfp6nL1VDy-bQqpiAJYdQwoig', 'digno-de-tudo-tom-f.txt'],  // DIGNO DE TUDO - TOM_F
  ['1aaP1vCsJ8dpkGAf9yEwiGG5Ob0f6VWLsf6GslKcEOyA', 'digno-de-tudo-c.txt'],  // DIGNO DE TUDO_C
  ['1kNFmCNiJLihskKC2WqwHoMv3bpzOrlVe-YkjpGRie5s', 'digno-de-tudo-d.txt'],  // DIGNO DE TUDO_D
  ['1WhQIce5TzbYXMA_7_YsivdvhJF6UjcmmaJcazLW2xzY', 'digno-e-o-senhor-tom-g.txt'],  // DIGNO É O SENHOR - TOM_G
  ['16O_W1C2179aVcl8yOO-myDFtK403tM6mCv_uv7zXLcs', 'digno-e-o-senhor-e-contralto.txt'],  // DIGNO É O SENHOR_E_Contralto
  ['13_KtVNrJTrLu-HGGGk3TSm5S7rzHUCs0bbgWYAm2sKw', 'ele-e-exaltado-tom-g.txt'],  // ELE É EXALTADO_TOM_G
  ['1q4dXsGfkrtjJ-NPAjFcKLOKo10r5GryTxvWHMDBPyjQ', 'espirito-enche-a-minha-vida-tom-a.txt'],  // ESPÍRITO, ENCHE A MINHA VIDA - TOM_A
  ['1HDB8tRuanqQFX-kA8v2jzR3sx8A7OZUje5E_ZMrFMjQ', 'jesus-em-tua-presenca-enche-a-minha-vida-a.txt'],  // Jesus em Tua Presença+Enche a Minha Vida_A
  ['1Hb8qZJMsGWRxXrjVGOZQIRaMTRs-79eugLBg6R_anYU', 'eu-confio-em-deus-d-original.txt'],  // Eu Confio em Deus_D_original
  ['1zsWdIAGbRl6sdeqWOLbg7o87htLpYWA5-TF81WifqIY', 'eu-e-minha-casa-tom-g.txt'],  // EU E MINHA CASA_TOM_G
  ['1FvZinSbkRSw-JZmHo3JzTgjjdWcawbSYRs25Fn1WLNU', 'eu-e-minha-casa-julliany-souza-e-contralto.txt'],  // EU E MINHA CASA_Julliany Souza_E_contralto
  ['16-lGlVMS3ioiXUBheYmqonaqj1nijOJ_Ket8CWx-C9c', 'copia-de-eu-e-minha-casa-julliany-souza-f-sop-tenor.txt'],  // Cópia de EU E MINHA CASA_Julliany Souza_F_sop+tenor
  ['1YYRF-Boe354MmMs4-tE5UDT_e2cOzwKg-XPAD1SXWpo', 'eu-vou-construir-tom-d.txt'],  // Eu vou construir_Tom_D
  ['10iRczTbZ_UVV45BYQu3w0pdwsAknVVO5gosJl0Wl6UA', 'eu-vou-construir-tom-f.txt'],  // Eu vou construir_Tom_F
  ['1kSDOX8mu61wfju2IxSO5vMGnJbDe_NJtLdEMzKU8EaU', 'eu-vou-construir-tom-a.txt'],  // Eu vou construir_Tom_A
  ['1yBbP-2BSPBwN7SrwKUycol01Ks7mi1hTj9RdRGTb2l4', 'eu-vou-construir-tom-g.txt'],  // Eu vou construir_Tom_G
  ['153e-UHZOjRYPSwOOMQSEnp9Tbf5g_iVycIPUQt7OKCY', 'grato-sou-tom-e.txt'],  // Grato Sou_Tom_E
  ['1WO3OXy94IZp6kaejMxAId1U5kPVapuLXNOL772GEC1k', 'jesus-em-tua-presenca-e.txt'],  // JESUS EM TUA PRESENÇA_E
  ['1RyPnkWAVw1ASVf3HzzCyR2TCZywDPRF7RwaePHOcgkw', 'nao-ha-um-nome-igual-tom-b.txt'],  // NÃO HÁ UM NOME IGUAL_TOM_B
  ['1iU8Almm2DrtvPCzaG_kGbHHk2nY0dthi16dW5AW-too', 'nao-ha-um-nome-igual-tom-f.txt'],  // NÃO HÁ UM NOME IGUAL_TOM_F
  ['1TeB-nyTCtQKR_mPUsWMAu9o-5U294jxjxW72E4Tk0h8', 'nao-ha-um-nome-igual-tom-a.txt'],  // NÃO HÁ UM NOME IGUAL_TOM_A
  ['1d_MV5vZ48MH2qhqwHXlA9eIXS0Jctfx35AR14qT-vyM', 'nao-ha-um-nome-igual-fem-b.txt'],  // Não Há Um Nome Igual_FEM_B
  ['1_Rhv2AawZLKmFVXg_Ou-nUChiOT8E-IgnP6CjhhPoyw', 'o-grande-eu-sou-d.txt'],  // O GRANDE EU SOU_D
  ['1gJE-Oz64eGopGrnaoqtgAo5xz48jhtyfZHNobXBZWfc', 'o-grande-eu-sou-c.txt'],  // O GRANDE EU SOU_C
  ['1qentJvwGrb4ZvZsFRmlIRfMfPjzD3efwRtm3z_-iOaw', 'o-novo-de-deus-tom-c.txt'],  // O NOVO DE DEUS_TOM_C
  ['1MwDf4j-7Tqi-DM5jnUIpMOGnSeoYbduktfsnKzdrI6g', 'oh-quao-lindo-esse-nome-e-tom-e.txt'],  // OH, QUÃO LINDO ESSE NOME É _TOM_E
  ['1aBNDEH3MsBmGh42hoksHVwymy1O7Vbe5ZF4YPegWp70', 'oh-quao-lindo-esse-nome-e-d.txt'],  // OH, QUÃO LINDO ESSE NOME É _D
  ['17RTLb1XYSmEPbB-tdw-5YUhZyrf90PfF0xXK1CZM6LE', 'nada-alem-do-sangue-pra-sempre-oh-quao-lindo-esse-nome-e-bb-masculino.txt'],  // NADA ALÉM DO SANGUE+PRA SEMPRE+OH QUÃO LINDO ESSE NOME É_Bb_Masculino
  ['1WUoAx8f_-n50dH4fTOgbQ_hq2lAJCvAS8RKqMI7JBIM', 'eu-vou-construir-oh-quao-lindo-esse-nome-e.txt'],  // Eu Vou Construir / Oh Quão Lindo Esse Nome É
  ['1hGXV-IRBUVGM4rvalgYmdpZSSsYzTJls595gbAIpJIs', 'pardal-bb.txt'],  // Pardal_Bb
  ['183MM5l2g72VBqoa3s4XVzLkmPUyHnCip6a4DlVu7IKw', 'poder-pra-salvar-tom-e.txt'],  // PODER PRA SALVAR_TOM_E
  ['1l_xQ4oJB81t_A4LOvJP86RTTZoINDTkNaPDJAQdsJfQ', 'poder-pra-salvar.txt'],  // PODER PRA SALVAR
  ['1J2kFDBK7YMSJetHaI3Q5jyK1xPEymqo9qqCS26YpEgc', 'poder-pra-salvar-tom-e-2.txt'],  // PODER PRA SALVAR_TOM-E
  ['1ax0NBTs5sonLOPZDgUkHRtR9HJ3-X5Wt_Xu_M23pHps', 'pra-sempre-d-feminino.txt'],  // Pra Sempre_D_Feminino
  ['1bk69EXpJF9Nw_cXzTmSyPDX1odiNTk5FboC5xFjAVB0', 'pra-sempre-c-fernandinho.txt'],  // Pra Sempre (C) - Fernandinho
  ['1OuD7QFwJtZUanq7nXmpeIJGLP4pxtO8HQdI80V_nclg', 'quem-e-esse-f-soprano.txt'],  // Quem é esse_F_Soprano
  ['117fAkzvHsvfImU233gZNz2M2AnXhc9-GpoazT6cz8KI', 'quem-e-esse-d-contralto.txt'],  // QUEM É ESSE_D_Contralto
  ['1gPLjywGkthktrQVRnZqmM61QB_kTrClwJvpkgSM-9KI', 'rendido-estou-tom-d.txt'],  // RENDIDO ESTOU_TOM_D
  ['1jHowfO8O7YhTiZzuhw0clmXwby-WtpvKYhPWj4szLA0', 'renova-me-c-contralto.txt'],  // RENOVA-ME_ C_contralto
  ['1a8aJursItzJdDa97ZrGeRU42HUOduy8x2VnVEDftjm8', 'renova-me-eb-masculino.txt'],  // RENOVA-ME_ Eb_masculino
  ['1AOeEVTdHfZ38zOpQVsVmIOfV5bzYrD-oZxxe8_VXcP8', 'santo-pra-sempre.txt'],  // Santo Pra Sempre
  ['1bHpRW-Nnp89QAiKEDGnqadMBIJRGzr1-TmmdESea3zA', 'sublime-e-contralto.txt'],  // Sublime_E_contralto
  ['1ERB4JyeIOOHxmObeBaAjkxAsNJf8VTzmCEQ_ui2fcLc', 'sublime-g-soprano.txt'],  // SUBLIME_G_Soprano
  ['13sNtb_-x96OtVh9jn5vD324OEElF-tfb_fNLSkyAnnQ', 'sublime-d-original.txt'],  // Sublime_D_original
  ['1nzGYAE1SB3rIYC1OtpGcWAjGs4nhUAcd16IKD1yr3P8', 'sublime-c-masculino.txt'],  // SUBLIME_C_masculino
  ['1WVVU71YAukDoT2_oxqTU00TL3dps0DTdAV4toUhVFsg', 'te-louvarei-msc-f-feminino.txt'],  // TE LOUVAREI_MSC_F_Feminino
  ['1GCWiT0zYwAIcdDUFdX0XiTrC1DjVauAJIPD7v6ko3os', 'te-louvarei-a-masculino.txt'],  // TE LOUVAREI_A_masculino
  ['1LSNagZNmMMcBnuIDP1LyqvWJ6yBxSUlklIRn4JWvpuc', 'teu-reino-tom-b.txt'],  // TEU REINO_TOM-B
  ['19MpbsWAMNF04kcMBYhUTM8PgLZsQQuYmhVMsVxp0lL4', 'teu-reino.txt'],  // TEU REINO
  ['1E_vYvbaDZZI9dT1yUNXIWEhlCFqMVgxhdXlCbpXqaMA', 'teu-reino-fem-g.txt'],  // TEU REINO_FEM_G
  ['1etVDOSfC3aIbInexi5Sfk_6XqyKOD6yFDSS1Kp4N1Zw', 'teu-toque-d-masculino.txt'],  // Teu Toque_D_masculino
  ['1KfvLoMpgKva1lSRK15DooCYH82lakF3Ub8EW2tiD3sg', 'teu-toque-bb-feminino.txt'],  // Teu Toque_Bb_Feminino
  ['16Gaz6IxbJgCdiGCzueOHW6UlSs2Sk5CJseDO1MUk8L0', 'tremenda-graca-tom-c-contralto.txt'],  // TREMENDA GRAÇA_TOM_C_Contralto
  ['1zsLXZ3ekl94PP4bz9TO2-z4PMTfUILpyIFQoXwQgv6w', 'tremenda-graca-e-soprano.txt'],  // Tremenda Graça_E_soprano
  ['1vmhtMPQsfxmhZyHQjICFvsc30Gc1moMinvsJho1YYMI', 'tu-es-d.txt'],  // TU ÉS_D
  ['1QPVPbDGlqJUVg4fGonfD0fi1_tlU-SJo_DjZziDHrUw', 'tu-es-aguas-purificadoras.txt'],  // Tu És / Águas Purificadoras
  ['19F60XgqATWuyTi_mqGLif34v8Wk9SRKL7-Sux1vDZZA', 'um-novo-dia-f-original.txt'],  // Um novo dia_F#_Original
  ['1y504TBjEYVYdcx3dtz9clQkxsc7aej7mjIL7V8O7S5w', 'vencendo-vem-jesus-tom-geral.txt'],  // VENCENDO VEM JESUS (tom geral)
  ['1KXloYwUvti0V5ULXmucoHTOsRJsL6zmrZ0EJ9e6GhHw', 'vencendo-vem-jesus-raiz-worship-e.txt']  // VENCENDO VEM JESUS-RAIZ WORSHIP_E
];

function exportarTxtCru() {
  var TEMPO_LIMITE_MS = 5 * 60 * 1000;
  var inicio = new Date().getTime();

  var destino = pastaDestino_('txt-cru');

  // Nomes ja gravados, pra poder rodar de novo de onde parou.
  var jaGravados = {};
  var existentes = destino.getFiles();
  while (existentes.hasNext()) {
    jaGravados[existentes.next().getName()] = true;
  }

  var token = ScriptApp.getOAuthToken();
  var gravados = 0, pulados = 0, erros = 0, suspeitos = 0;

  for (var i = 0; i < ARQUIVOS.length; i++) {
    if (new Date().getTime() - inicio > TEMPO_LIMITE_MS) {
      Logger.log('Parando antes do limite de tempo. Gravados nesta execucao: '
        + gravados + '. Rode de novo para continuar.');
      break;
    }

    var fileId = ARQUIVOS[i][0];
    var nome = ARQUIVOS[i][1];

    if (jaGravados[nome]) { pulados++; continue; }

    try {
      var url = 'https://www.googleapis.com/drive/v3/files/' + fileId
        + '/export?mimeType=text%2Fplain';
      var resposta = UrlFetchApp.fetch(url, {
        headers: { Authorization: 'Bearer ' + token },
        muteHttpExceptions: true
      });

      if (resposta.getResponseCode() !== 200) {
        erros++;
        Logger.log('ERRO HTTP ' + resposta.getResponseCode() + ' em "' + nome
          + '": ' + resposta.getContentText().slice(0, 200));
        continue;
      }

      var blob = resposta.getBlob().setName(nome);
      var aviso = conferirFidelidade_(blob.getDataAsString('UTF-8'));
      if (aviso) { suspeitos++; Logger.log('SUSPEITO em "' + nome + '": ' + aviso); }

      // O blob vai inteiro pro arquivo, sem passar por string —
      // reconstruir o texto normalizaria BOM e CRLF, que sao exatamente
      // os bytes que queremos preservar.
      destino.createFile(blob);
      jaGravados[nome] = true;
      gravados++;
      Logger.log('Gravado: ' + nome);
    } catch (e) {
      erros++;
      Logger.log('ERRO em "' + nome + '": ' + e.message);
    }
  }

  Logger.log('--- Resumo --- selecionados: ' + ARQUIVOS.length
    + ' | gravados nesta execucao: ' + gravados
    + ' | ja existiam: ' + pulados
    + ' | suspeitos de fidelidade: ' + suspeitos
    + ' | erros: ' + erros);
  Logger.log('Pasta de destino: ' + destino.getUrl());
}

/**
 * Devolve uma mensagem se o texto exportado tiver sinal das corrupcoes
 * conhecidas, ou string vazia se estiver limpo.
 *
 * As duas checagens correspondem a falhas REAIS ja observadas:
 * "\#" e o escape de sustenido do leitor do Drive, e espacamento
 * multiplo e o que alinha acorde sobre silaba — se ele desaparecer, a
 * cifra posicional chega destruida.
 */
function conferirFidelidade_(texto) {
  // Regex literal de proposito: em string, o escape de barra invertida
  // sobrevive mal a copiar/colar e a qualquer gerador — '\#' em JS e so
  // '#', e a guarda dispararia em todo arquivo sem ninguem notar.
  if (/\\#/.test(texto)) {
    return 'sustenido aparece escapado (barra invertida antes do #) — via de export errada';
  }
  if (texto.indexOf('  ') === -1) {
    return 'nenhum espacamento multiplo no arquivo — alinhamento posicional pode ter colapsado';
  }
  return '';
}

function pastaDestino_(nome) {
  var achadas = DriveApp.getFoldersByName(nome);
  return achadas.hasNext() ? achadas.next() : DriveApp.createFolder(nome);
}
