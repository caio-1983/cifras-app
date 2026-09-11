/**
 * Tria o que sobrou da importação em massa (`importar-lote.mjs`): por que
 * cada `.txt` do Drive ainda não virou `.cifra`, e quais dessas causas são
 * mecânicas.
 *
 *   node scripts/triar-pendentes.mjs [--origem=dir] [--detalhe=slug]
 *
 * O critério da triagem é **quem decide**:
 *
 * - `mecanico` — a correção não escolhe nada por ninguém: separador que o
 *   Docs comeu (`Bb /D` por `Bb/D`), prosa de execução no meio da cifra
 *   (`reintro | Em/D |`) que o formato já sabe carregar como `{...}`.
 * - `curadoria` — a correção é uma decisão musical: cifra sem tom no
 *   cabeçalho e sem tom no título, acorde alternativo entre parênteses
 *   (`Bm (G D/F#)`), seção referenciada que nunca foi definida. Ninguém
 *   além do diretor musical pode responder por essas, e chutar aqui é
 *   exatamente o erro que o acervo não pode ter.
 *
 * Este script **não escreve nada**. Ele só diz o que é o quê.
 */
import { readFileSync } from 'node:fs';
import { lerAcervo } from './acervoDrive.mjs';

const argumentos = process.argv.slice(2);
const origem = argumentos.find((a) => a.startsWith('--origem='))?.slice('--origem='.length) ?? 'bruto/txt';
const detalhe = argumentos.find((a) => a.startsWith('--detalhe='))?.slice('--detalhe='.length);

/**
 * Prosa que aparece dentro de linha de cifra e que o formato já comporta
 * como anotação de execução. Só entram palavras que NÃO são acorde em
 * nenhuma leitura — `e` e `o` ficam de fora de propósito, porque exigem
 * olhar a linha inteira para saber se são ligação de prosa ou outra coisa.
 */
const PROSA_DE_EXECUCAO =
  /\b(vez|vezes|compassos?|reintro|introdu[çc][ãa]o|modula[çc][ãa]o|teclado|guitar(?:ra)?|piano|ataque|volta|somente|s[óo]|apenas|entra|sai|baixo|bateria)\b/i;

/** `1ª`, `2X`, `16 compassos` — contagem de execução, não acorde. */
const CONTAGEM = /^\d+[ªºxX]?[.,:]?$/;

const causas = {
  'prosa-apos-rotulo': {
    rotulo: 'prosa na mesma linha do rótulo de seção (`[Refrão] Cai e vai subindo`)',
    tipo: 'mecanico',
    // O rótulo é subtítulo legítimo; o que vem depois dele na mesma linha é
    // instrução de execução, e o parser tenta lê-la como cifra.
    testa: (texto) => /^\s*\[[^\]\n]+\]\s+\S+\s+\S+/m.test(texto),
  },
  'separador-comido': {
    rotulo: 'baixo invertido partido por espaço (`Bb /D`)',
    tipo: 'mecanico',
    // `| Cm Bb /D |` — o `/D` sozinho só faz sentido colado no acorde anterior.
    testa: (texto) => /\|[^|\n]*\s\/[A-G]/.test(texto),
  },
  'prosa-de-execucao': {
    rotulo: 'anotação de execução solta na linha de cifra',
    tipo: 'mecanico',
    testa: (texto, token) => PROSA_DE_EXECUCAO.test(token) || CONTAGEM.test(token),
  },
  'acorde-alternativo': {
    rotulo: 'acorde alternativo entre parênteses (`Bm (G D/F#)`)',
    tipo: 'curadoria',
    testa: (_texto, token) => token.startsWith('(') || token.endsWith(')'),
  },
  'sem-tom': {
    rotulo: 'sem tom no cabeçalho e sem tom no título',
    tipo: 'curadoria',
    testa: (_t, _k, msg) => /campo obrigatório "tom"|tom ilegível/.test(msg),
  },
  'secao-fantasma': {
    rotulo: 'seção referenciada que nunca foi definida com conteúdo',
    tipo: 'curadoria',
    testa: (_t, _k, msg) => /está vazia e não há/.test(msg),
  },
};

const { naoLidos } = lerAcervo(origem);

/**
 * O erro que o arquivo dá HOJE é o que manda. Um arquivo pode conter uma
 * forma que o importador já resolve (`[Refrão] prosa`) e mesmo assim falhar
 * por outra coisa — antes isso o classificava como "mecânico" e fazia a
 * contagem prometer conserto que não viria.
 */
function classificar(pendente) {
  const texto = readFileSync(`${origem}/${pendente.nome}`, 'utf8');
  const token = /nota inválida: "([^"]*)"/.exec(pendente.mensagem)?.[1] ?? '';

  // As causas que o próprio erro nomeia vêm primeiro: são as únicas que
  // explicam por que ESTE arquivo não entra.
  for (const chave of ['sem-tom', 'secao-fantasma']) {
    if (causas[chave].testa(texto, token, pendente.mensagem)) {
      return { chave, ...causas[chave], token };
    }
  }
  if (token) {
    for (const chave of ['acorde-alternativo', 'prosa-de-execucao']) {
      if (causas[chave].testa(texto, token, pendente.mensagem)) {
        return { chave, ...causas[chave], token };
      }
    }
  }
  // Sem rótulo com o token: cada arquivo aqui falha por um motivo diferente,
  // e nomear o grupo pelo primeiro deles faria a lista mentir sobre os outros.
  return { chave: 'outro', rotulo: 'sem causa comum — ver arquivo a arquivo',
    tipo: 'curadoria', token };
}

const porCausa = new Map();
for (const p of naoLidos) {
  const c = classificar(p);
  if (!porCausa.has(c.chave)) porCausa.set(c.chave, { ...c, itens: [] });
  porCausa.get(c.chave).itens.push({ nome: p.nome, token: c.token, mensagem: p.mensagem });
}

if (detalhe) {
  const alvo = naoLidos.find((p) => p.nome.includes(detalhe));
  if (!alvo) {
    console.log(`nenhum pendente casa com "${detalhe}"`);
    process.exit(1);
  }
  const c = classificar(alvo);
  console.log(`${alvo.nome}\n  causa: ${c.rotulo} (${c.tipo})\n  erro : ${alvo.mensagem}\n`);
  const texto = readFileSync(`${origem}/${alvo.nome}`, 'utf8').split(/\r?\n/);
  texto.forEach((l, i) => {
    if (c.token && l.includes(c.token)) console.log(`  ${String(i + 1).padStart(4)}| ${l}`);
  });
  process.exit(0);
}

const ordenadas = [...porCausa.values()].sort((a, b) => b.itens.length - a.itens.length);
let mecanicos = 0;

for (const c of ordenadas) {
  if (c.tipo === 'mecanico') mecanicos += c.itens.length;
  console.log(`\n[${c.tipo}] ${c.rotulo} — ${c.itens.length}`);
  for (const i of c.itens) {
    console.log(`   ${i.nome}${i.token ? `   (${i.token})` : ''}`);
  }
}

console.log(
  `\n--- ${naoLidos.length} pendentes · ` +
    `${mecanicos} de causa mecânica · ` +
    `${naoLidos.length - mecanicos} dependem de decisão musical ---`,
);
