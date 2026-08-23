// Vocabulário de sufixo restrito só pra ESTA detecção — deliberadamente
// mais rígido que `acorde.ts`. O parser real aceita sufixo opaco (qualquer
// texto depois da nota), o que é o que o deixa robusto a notação exótica
// sem rejeitar nada — mas usar essa mesma regra permissiva pra ADIVINHAR se
// uma linha crua é uma linha de acorde teria falso positivo constante:
// "Ele", "Deus", "Estamos" também "parseiam" como acorde com sufixo lixo
// (`E` + sufixo `"le"`, por exemplo). Aqui a régua é mais curta: só o
// vocabulário de sufixo já visto no acervo real (achados 1-12).
const SUFIXO_BASE = '(?:7M|7\\+|maj7|sus4|sus2|dim|aug|m7M|[0-9]{1,2})';
const ALTERACAO = '(?:\\([^()]{1,8}\\))';
const DIMINUTO = '[°ºo]';

const RE_ACORDE_RESTRITO = new RegExp(
  `^[A-G](?:#{1,2}|b{1,2})?(?:m)?(?:${SUFIXO_BASE})?(?:${ALTERACAO})*(?:${DIMINUTO})?(?:\\/[A-G](?:#{1,2}|b{1,2})?)?$`,
);

/**
 * Mais restrito que `parseAcorde` de propósito — ver comentário acima do
 * arquivo. Usado só pra decidir "essa linha crua parece cifra?", nunca pra
 * parsear de verdade (isso continua sendo `acorde.ts`).
 *
 * Ambiguidade conhecida, não eliminável por forma: `Do`/`Fa` como raiz +
 * diminuto batem igual a "do"/"fá" maiúsculo no início de frase. Mitigado
 * por operar por LINHA inteira (`pareceLinhaDeAcordeCrua`), não por token
 * solto — uma frase de verdade quase nunca tem todas as palavras nesse
 * formato, só uma coincidência isolada não basta.
 */
export function pareceAcordeRestrito(token: string): boolean {
  return RE_ACORDE_RESTRITO.test(token);
}

/**
 * true quando TODA palavra da linha parece acorde (ver `pareceAcordeRestrito`)
 * e a linha ainda não tem marcador nenhum (`[`, `~`, `|` — essas já são
 * reconhecidas por `classificarLinha`, essa função é só pra cobrir a lacuna:
 * linha de acorde crua, sem marcador nenhum, que hoje cai em `letra` sem
 * erro, silenciosamente errada).
 */
export function pareceLinhaDeAcordeCrua(linha: string): boolean {
  const trimada = linha.trim();
  if (trimada === '') return false;
  const primeiroChar = trimada[0];
  if (primeiroChar === '[' || primeiroChar === '~' || primeiroChar === '|') return false;
  const tokens = trimada.split(/\s+/);
  return tokens.every(pareceAcordeRestrito);
}

/**
 * Prefixa `~` em toda linha que parece cifra crua sem marcador e é seguida
 * de uma linha não-vazia (a letra que ela deveria alinhar) — só prepende o
 * caractere, não mexe em mais nada da linha, porque o `~` ocupa uma coluna
 * "marcador" que o resto do pipeline (relayout, serialização) já sabe
 * descontar; ver teste de round-trip em `deteccaoPosicionalCrua.test.ts`.
 */
export function marcarLinhasPosicionaisCruas(linhas: string[]): string[] {
  return linhas.map((linha, i) => {
    const proxima = linhas[i + 1];
    const temContinuidade = proxima !== undefined && proxima.trim() !== '';
    if (temContinuidade && pareceLinhaDeAcordeCrua(linha)) {
      return `~${linha}`;
    }
    return linha;
  });
}
