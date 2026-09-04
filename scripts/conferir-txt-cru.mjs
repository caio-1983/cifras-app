/**
 * Confere a fidelidade dos .txt exportados do Drive antes de qualquer
 * importação — Sprint 1, etapa 0 (ver docs/rumo.md).
 *
 * O que ele procura é o que já falhou de verdade (bruto/MANIFESTO.md):
 * sustenido escapado como \#, negrito fabricado em **, e espaçamento
 * múltiplo colapsado (que é o que alinha acorde sobre sílaba).
 *
 * Diferente da guarda do Apps Script, que roda na origem e só sabe dizer
 * "suspeito", aqui há os bytes: o relatório separa CORRUPÇÃO de
 * PARTICULARIDADE — uma cifra escrita toda em compasso não tem
 * espaçamento múltiplo e isso está certo, não é defeito.
 *
 *   node scripts/conferir-txt-cru.mjs [diretório]   (padrão: bruto/txt)
 *
 * Sai com código 1 se achar corrupção; particularidade não derruba.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const diretorio = process.argv[2] ?? 'bruto/txt';
const ESPERADOS = 73;

/** Corrupção: o arquivo não representa mais o documento de origem. */
function corrupcoes(bytes, texto) {
  const achados = [];
  if (/\\#/.test(texto)) achados.push('sustenido escapado (\\#)');
  if (/\\\|/.test(texto)) achados.push('barra de compasso escapada (\\|)');
  if (/\\\[/.test(texto)) achados.push('colchete de subtítulo escapado (\\[)');
  if (/\*\*/.test(texto)) achados.push('negrito fabricado (**) — via markdown, não texto cru');
  if (/^#{1,6} /m.test(texto)) achados.push('heading fabricado (# no início da linha)');
  if (bytes.length === 0) achados.push('arquivo vazio');
  return achados;
}

/**
 * Particularidade: legítima, mas vale saber antes de importar em lote.
 * Nenhuma delas é motivo para rejeitar o arquivo.
 */
function particularidades(bytes, texto) {
  const achados = [];
  if (!/ {2}/.test(texto)) {
    achados.push('sem espaçamento múltiplo — provavelmente cifra 100% em compasso');
  }
  // Não existe checagem de "tem bemol": o bemol é a letra `b`, que
  // aparece em qualquer letra de música — seria sinal sem valor.
  if (!texto.includes('\r\n')) achados.push('sem CRLF (só LF)');
  if (bytes[0] !== 0xef || bytes[1] !== 0xbb || bytes[2] !== 0xbf) achados.push('sem BOM');
  return achados;
}

const arquivos = readdirSync(diretorio).filter((n) => n.endsWith('.txt')).sort();
let comCorrupcao = 0;
const porParticularidade = new Map();

for (const nome of arquivos) {
  const bytes = readFileSync(join(diretorio, nome));
  const texto = bytes.toString('utf8');

  const ruins = corrupcoes(bytes, texto);
  if (ruins.length > 0) {
    comCorrupcao++;
    console.log(`CORRUPÇÃO  ${nome}\n           ${ruins.join('; ')}`);
    continue;
  }
  for (const p of particularidades(bytes, texto)) {
    if (!porParticularidade.has(p)) porParticularidade.set(p, []);
    porParticularidade.get(p).push(nome);
  }
}

console.log(`\n--- ${arquivos.length} arquivos em ${diretorio} ---`);
for (const [p, nomes] of porParticularidade) {
  console.log(`\n${nomes.length}x ${p}`);
  for (const n of nomes) console.log(`     ${n}`);
}

if (arquivos.length !== ESPERADOS) {
  console.log(`\nATENÇÃO: esperados ${ESPERADOS} arquivos, achados ${arquivos.length}.`);
}
console.log(comCorrupcao === 0
  ? '\nNenhuma corrupção. Os bytes representam os documentos de origem.'
  : `\n${comCorrupcao} arquivo(s) corrompido(s) — NÃO importe antes de resolver a via de export.`);

process.exit(comCorrupcao === 0 && arquivos.length === ESPERADOS ? 0 : 1);
