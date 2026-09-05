/**
 * Agrupa os .txt crus por música e diz quais variantes são a MESMA cifra,
 * SEM GRAVAR NADA. Diagnóstico para decidir, na importação, qual arquivo
 * vira o `.cifra` quando a mesma música veio do Drive em vários tons.
 *
 * A regra de agrupamento e de igualdade mora em `acervoDrive.mjs`, junto
 * com a que `importar-lote.mjs` usa para gravar — de propósito: relatório
 * e gravação divergirem seria pior que não ter relatório.
 *
 *   node scripts/analisar-duplicatas.mjs [diretório]   (padrão: bruto/txt)
 */
import { classificarGrupo, lerAcervo } from './acervoDrive.mjs';

const diretorio = process.argv[2] ?? 'bruto/txt';
const { fichas, naoLidos, grupos } = lerAcervo(diretorio);

const comVarios = grupos.filter((g) => g.lidos.length + g.pendentes.length > 1);

let duplicatas = 0;
let quaseIguais = 0;
let divergentes = 0;

for (const grupo of comVarios) {
  console.log(`\n${grupo.chave}`);

  for (const { ficha: f, papel, distancia: d, letraDivergente: dl, quase } of classificarGrupo(grupo)) {
    const forma =
      f.compasso > 0 && f.posicional > 0 ? 'misto'
      : f.compasso > 0 ? 'compasso'
      : f.posicional > 0 ? 'posicional'
      : 'sem cifra';

    let marca = ' ';
    let veredito;
    if (papel === 'fica') {
      marca = '→';
      veredito = 'fica';
    } else if (papel === 'duplicata') {
      marca = 'x';
      veredito = 'mesma cifra e mesma letra — pode eliminar';
      duplicatas++;
    } else if (d === 0) {
      marca = '?';
      veredito = `mesma cifra, mas a letra difere em ${dl} palavra(s) — conferir`;
      quaseIguais++;
    } else if (quase) {
      marca = '?';
      veredito = `${d} de ${f.graus.length} acordes diferem — conferir`;
      quaseIguais++;
    } else {
      veredito =
        d === undefined ? `outra escrita (${f.graus.length} acordes)` : `${d} de ${f.graus.length} acordes diferem`;
      divergentes++;
    }

    console.log(
      `  ${marca} ${f.nome.padEnd(46)} tom ${(f.tom || '?').padEnd(4)} ${forma.padEnd(10)}` +
        ` ${String(f.compasso).padStart(3)}| ${String(f.posicional).padStart(3)}~` +
        ` ${String(f.nLetra).padStart(3)} letra   ${veredito}`,
    );
  }
  for (const p of grupo.pendentes) {
    console.log(`  ! ${p.nome.padEnd(46)} NÃO IMPORTA: ${p.mensagem.slice(0, 80)}`);
  }
}

console.log(
  `\n--- ${fichas.length} lidos, ${naoLidos.length} não importam · ` +
    `${comVarios.length} títulos com mais de um arquivo ---\n` +
    `    ${duplicatas} cópias exatas (elimináveis) · ` +
    `${quaseIguais} quase iguais (conferir) · ` +
    `${divergentes} realmente diferentes`,
);
