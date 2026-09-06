/**
 * Insere `temas:` no cabeçalho das músicas que ainda não têm, a partir de um
 * mapa `{ slug: [tema, tema, tema] }` em JSON.
 *
 * Valida TUDO antes de escrever QUALQUER coisa: um tema fora do vocabulário de
 * `src/temas.ts`, um slug inexistente ou uma música que já tem `temas:` aborta
 * sem tocar em arquivo nenhum. Meio acervo marcado e meio não é pior que
 * nenhum — não dá para saber onde parou.
 *
 * Também exige que o mapa cubra TODAS as que faltam: silêncio sobre uma música
 * seria confundido com "essa não precisa".
 *
 *   node scripts/aplicar-temas.mjs mapa.json              # confere, não escreve
 *   node scripts/aplicar-temas.mjs mapa.json --escrever
 */
import { readFileSync, writeFileSync, existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { TEMAS_CANONICOS, MAX_TEMAS, normalizarTema } from '../src/temas.ts';

const ACERVO = fileURLToPath(new URL('../musicas/', import.meta.url));

const caminhoMapa = process.argv[2];
if (!caminhoMapa) {
  console.error('uso: node scripts/aplicar-temas.mjs <mapa.json> [--escrever]');
  process.exit(2);
}
const mapa = JSON.parse(readFileSync(caminhoMapa, 'utf8'));
const escrever = process.argv.includes('--escrever');

const erros = [];
const planos = [];

for (const [slug, temas] of Object.entries(mapa)) {
  const caminho = join(ACERVO, `${slug}.cifra`);
  if (!existsSync(caminho)) {
    erros.push(`${slug}: arquivo não existe`);
    continue;
  }

  const txt = readFileSync(caminho, 'utf8');
  if (/^temas:/m.test(txt)) {
    erros.push(`${slug}: já tem temas:`);
    continue;
  }

  if (!Array.isArray(temas) || temas.length !== MAX_TEMAS) {
    erros.push(`${slug}: ${temas?.length ?? '?'} temas, esperado ${MAX_TEMAS}`);
  }
  if (new Set(temas).size !== temas.length) erros.push(`${slug}: tema repetido`);
  for (const t of temas) {
    if (TEMAS_CANONICOS.includes(t)) continue;
    // `normalizarTema` reconhece sinônimo e grafia: se ele achar, o mapa quis
    // dizer isso e a mensagem diz qual é a forma canônica.
    const perto = normalizarTema(t);
    erros.push(`${slug}: "${t}" não é canônico${perto ? ` — use "${perto}"` : ''}`);
  }

  // O cabeçalho termina na primeira linha `---` sozinha. `temas:` entra logo
  // antes dela, que é onde as músicas já marcadas o têm.
  const nl = txt.includes('\r\n') ? '\r\n' : '\n';
  const linhas = txt.split(/\r?\n/);
  const corte = linhas.findIndex((l) => l.trim() === '---');
  if (corte < 1) {
    erros.push(`${slug}: cabeçalho sem separador ---`);
    continue;
  }

  linhas.splice(corte, 0, `temas: ${temas.join(', ')}`);
  planos.push({ caminho, slug, conteudo: linhas.join(nl) });
}

// O mapa tem que cobrir exatamente as que faltam — nem sobrando, nem faltando.
const forasDoMapa = readdirSync(ACERVO)
  .filter((n) => n.endsWith('.cifra'))
  .map((n) => n.replace(/\.cifra$/, ''))
  .filter((slug) => !(slug in mapa))
  .filter((slug) => !/^temas:/m.test(readFileSync(join(ACERVO, `${slug}.cifra`), 'utf8')));
if (forasDoMapa.length) {
  erros.push(`sem tema e fora do mapa (${forasDoMapa.length}): ${forasDoMapa.join(', ')}`);
}

if (erros.length) {
  console.error(`${erros.length} problema(s) — NADA foi escrito:`);
  for (const e of erros) console.error('  ' + e);
  process.exit(1);
}

console.log(`${planos.length} músicas prontas para receber temas.`);
if (!escrever) {
  console.log('(conferência apenas — passe --escrever para aplicar)');
  process.exit(0);
}
for (const p of planos) writeFileSync(p.caminho, p.conteudo, 'utf8');
console.log(`escrito em ${planos.length} arquivos.`);
