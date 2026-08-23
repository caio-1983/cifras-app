const RE_TOKEN = /\|:|:\||\|/g;

/**
 * Insere espaço em volta de `|`, `|:` e `:|` quando a linha crua não tem
 * (`|Am|G|F Dm7| Am`), sem tocar em nenhum outro espaçamento da linha
 * (alinhamentos com espaço extra em outros pontos são preservados).
 * Idempotente: uma linha já bem espaçada volta idêntica.
 *
 * A alternância `\|:|:\||\|` já resolve sozinha qual token é maior em cada
 * posição (tenta `|:` e `:|` antes do `|` solto), então basta olhar o
 * caractere original antes e depois de cada match — sem lookbehind/lookahead,
 * que abriria margem pro motor tentar casar o `|` solto começando *dentro*
 * de um `:|` cujo início já tinha sido descartado por outra asserção.
 */
export function normalizarEspacamentoCompasso(linha: string): string {
  return linha.replace(RE_TOKEN, (token, indice, str) => {
    const antes = str[indice - 1];
    const depois = str[indice + token.length];
    const prefixo = antes !== undefined && !/\s/.test(antes) ? ' ' : '';
    const sufixo = depois !== undefined && !/\s/.test(depois) ? ' ' : '';
    return `${prefixo}${token}${sufixo}`;
  });
}

/**
 * Expande tab por espaço até a próxima parada de tabulação (padrão de 8,
 * igual editor de texto e terminal — não é troca 1-por-1). Necessário antes
 * de qualquer linha virar posicional (`~`): a coluna de cada acorde é
 * calculada por índice de caractere, e um tab conta 1 caractere mas ocupa
 * várias colunas visuais — sem expandir, o realinhamento na hora de
 * transpor fica errado (acorde não fica mais sobre a sílaba certa), mesmo
 * a linha crua "parecendo" alinhada no documento original.
 */
export function expandirTabs(linha: string, larguraTab = 8): string {
  let saida = '';
  let coluna = 0;
  for (const ch of linha) {
    if (ch === '\t') {
      const espacos = larguraTab - (coluna % larguraTab);
      saida += ' '.repeat(espacos);
      coluna += espacos;
    } else {
      saida += ch;
      coluna += 1;
    }
  }
  return saida;
}
