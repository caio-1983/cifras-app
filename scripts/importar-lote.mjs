/**
 * Grava o acervo do Drive como `.cifra`. É a etapa de gravação do sprint 1
 * (`docs/rumo.md`); o diagnóstico que a antecede é `analisar-duplicatas.mjs`,
 * e as duas leem o acervo pelo mesmo módulo (`acervoDrive.mjs`).
 *
 *   node scripts/importar-lote.mjs [destino] [--origem=dir] [--seco]
 *
 * `--seco` mostra o que faria sem escrever nada. Sem ele, escreve — mas
 * NUNCA por cima de arquivo que já existe: os `.cifra` curados à mão valem
 * mais que qualquer coisa que este script produza, e sobrescrever um deles
 * seria perda silenciosa.
 *
 * Nome do arquivo:
 *   - a variante escolhida do grupo vira `<titulo>.cifra`, sem sufixo de
 *     tom — porque tom é coisa que o transpositor resolve na hora de
 *     exibir, não identidade de música;
 *   - variante que diverge de verdade sobrevive como `<titulo>-<tom>.cifra`,
 *     porque é outro arranjo (ou outra transcrição) e descartá-la perderia
 *     trabalho de alguém;
 *   - cópia exata — mesma cifra e mesma letra — não é gravada.
 */
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { classificarGrupo, ficharTexto, lerAcervo, saoIguais } from './acervoDrive.mjs';

const argumentos = process.argv.slice(2);
const seco = argumentos.includes('--seco');
const origem = argumentos.find((a) => a.startsWith('--origem='))?.slice('--origem='.length) ?? 'bruto/txt';
const destino = argumentos.find((a) => !a.startsWith('--')) ?? 'musicas';

/** `Ab` → `ab`, `F#m` → `fsm`. O `#` não sobrevive a nome de arquivo. */
function sufixoDeTom(tom) {
  return tom.toLowerCase().replace(/#/g, 's').replace(/[^a-z0-9]/g, '');
}

const { naoLidos, grupos } = lerAcervo(origem);

const aGravar = new Map(); // nome do arquivo -> ficha
const descartados = [];
const colisoes = [];

/**
 * O `.cifra` que já mora no destino sob o nome canônico do grupo, quando
 * existe. Comparar contra ele evita gravar, ao lado de um arquivo curado à
 * mão, uma variante que é a mesma coisa em outro tom.
 */
function jaNoDestino(chave) {
  const caminho = join(destino, `${chave}.cifra`);
  if (!existsSync(caminho)) return undefined;
  try {
    return ficharTexto(readFileSync(caminho, 'utf8'), `${chave}.cifra`);
  } catch {
    // Arquivo que o núcleo não lê é problema dele, não deste script: sem
    // ficha, nada é comparado e nada é descartado por engano.
    return undefined;
  }
}

for (const grupo of grupos) {
  const existente = jaNoDestino(grupo.chave);

  for (const { ficha, papel } of classificarGrupo(grupo)) {
    if (papel === 'duplicata') {
      descartados.push({ ficha, chave: grupo.chave });
      continue;
    }
    if (existente && saoIguais(existente, ficha)) {
      descartados.push({ ficha, chave: grupo.chave });
      continue;
    }

    let nomeArquivo;
    if (papel === 'fica') {
      nomeArquivo = `${grupo.chave}.cifra`;
    } else {
      const sufixo = ficha.tomValido ? sufixoDeTom(ficha.tom) : '';
      // Sem tom legível, o slug de origem é o único desempate que existe —
      // inventar um número faria o nome mudar toda vez que o acervo mudasse.
      nomeArquivo = sufixo ? `${grupo.chave}-${sufixo}.cifra` : `${ficha.nome.replace(/\.txt$/, '')}.cifra`;
    }

    if (aGravar.has(nomeArquivo)) {
      // Duas variantes diferentes no mesmo tom: as duas têm de sobreviver,
      // então a segunda cai no slug de origem, que é único por construção.
      const alternativo = `${ficha.nome.replace(/\.txt$/, '')}.cifra`;
      colisoes.push({ pretendido: nomeArquivo, usado: alternativo });
      nomeArquivo = alternativo;
    }
    aGravar.set(nomeArquivo, ficha);
  }
}

mkdirSync(destino, { recursive: true });

let gravados = 0;
const preservados = [];

for (const [nomeArquivo, ficha] of [...aGravar].sort(([a], [b]) => a.localeCompare(b))) {
  const caminho = join(destino, nomeArquivo);
  if (existsSync(caminho)) {
    preservados.push({ nomeArquivo, origem: ficha.nome });
    continue;
  }
  if (!seco) writeFileSync(caminho, ficha.texto, 'utf8');
  gravados++;
}

const rotulo = seco ? 'gravaria' : 'gravados';

if (colisoes.length) {
  console.log('\nColisão de nome (duas variantes no mesmo tom):');
  for (const c of colisoes) console.log(`  ${c.pretendido} já tomado → ${c.usado}`);
}

if (preservados.length) {
  console.log('\nJá existiam em ' + destino + ', preservados como estão:');
  for (const p of preservados) console.log(`  ${p.nomeArquivo}   (viria de ${p.origem})`);
}

console.log(`\nDescartados como cópia exata (${descartados.length}):`);
for (const d of descartados) console.log(`  ${d.ficha.nome}  →  já coberto por ${d.chave}.cifra`);

console.log(`\nNão importam, ficam de fora (${naoLidos.length}):`);
for (const p of naoLidos) console.log(`  ${p.nome}: ${p.mensagem.slice(0, 90)}`);

console.log(
  `\n--- ${gravados} ${rotulo} em ${destino}/ · ` +
    `${preservados.length} preservados · ` +
    `${descartados.length} cópias exatas descartadas · ` +
    `${naoLidos.length} pendentes de curadoria ---`,
);
