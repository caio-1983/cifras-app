/**
 * Mede a taxa do importador contra os .txt crus, SEM GRAVAR NADA.
 * Sprint 1, etapa 3 — mas rodado antes, como diagnóstico: o valor aqui
 * não é o arquivo produzido, é a lista de causas de falha agrupada.
 * Causa recorrente vira regra no importador; causa única vira curadoria
 * humana (ver docs/rumo.md).
 *
 *   node scripts/medir-importacao.mjs [diretório]   (padrão: bruto/txt)
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { importarCifraCrua } from '../src/importador.ts';

const diretorio = process.argv[2] ?? 'bruto/txt';
const arquivos = readdirSync(diretorio).filter((n) => n.endsWith('.txt')).sort();

const ok = [];
const falhas = new Map(); // causa normalizada -> [{arquivo, mensagem}]

/** Agrupa mensagens que só diferem no dado citado (acorde, rótulo, linha). */
function causa(mensagem) {
  return mensagem
    .replace(/"[^"]*"/g, '"…"')
    .replace(/linha \d+/g, 'linha N')
    .replace(/:\d+/g, ':N');
}

for (const nome of arquivos) {
  const cru = readFileSync(join(diretorio, nome), 'utf8');
  try {
    const cifra = importarCifraCrua(cru, nome);
    ok.push({ nome, linhas: cifra.split('\n').length });
  } catch (erro) {
    const c = causa(erro.message);
    if (!falhas.has(c)) falhas.set(c, []);
    falhas.get(c).push({ nome, mensagem: erro.message });
  }
}

const ordenadas = [...falhas.entries()].sort((a, b) => b[1].length - a[1].length);

for (const [c, casos] of ordenadas) {
  console.log(`\n${casos.length}x  ${c}`);
  for (const { nome, mensagem } of casos) {
    console.log(`      ${nome}`);
    if (mensagem !== c) console.log(`        ${mensagem}`);
  }
}

const total = arquivos.length;
console.log(`\n--- ${ok.length}/${total} importam limpo `
  + `(${Math.round((ok.length / total) * 100)}%) · `
  + `${total - ok.length} falham, em ${falhas.size} causa(s) distinta(s) ---`);
