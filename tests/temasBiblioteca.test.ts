/**
 * O filtro de tema da biblioteca, contra o acervo de verdade.
 *
 * O par `tests/painel.test.ts` roda sobre o JSON de 13 músicas, que não tem
 * `temas:` — lá a exigência é que nenhuma opção apareça. A prova de que o
 * filtro serve só existe aqui, com as músicas reais: teste sintético mostra que
 * o código faz o que se pensou, música real mostra que se pensou na coisa certa.
 *
 * Por que LISTA e não campo de texto: o vocabulário é fechado (`src/temas.ts`),
 * então digitar só oferece o erro de grafia — "adoraçao", "louvores" — sem
 * oferecer nada que escolher de uma lista não ofereça.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { carregarRepertorio } from '../site/repertorio.ts';
import { paginaBiblioteca } from '../site/paginas.ts';
import { TEMAS_CANONICOS } from '../src/temas.ts';
import { esc } from '../gerador-ts/html.ts';

process.env.CIFRAS_LOG = 'silent';

const REPERTORIO_JSON = fileURLToPath(new URL('../dados/repertorio.json', import.meta.url));
const ACERVO = fileURLToPath(new URL('../musicas/', import.meta.url));
const rep = carregarRepertorio(REPERTORIO_JSON, ACERVO);

/** Quantas músicas por tema, do acervo carregado. */
function usados(): Map<string, number> {
  const conta = new Map<string, number>();
  for (const m of rep.todas) for (const t of m.temas ?? []) conta.set(t, (conta.get(t) ?? 0) + 1);
  return conta;
}

test('o acervo chega ao site com os temas já canônicos', () => {
  const comTema = rep.todas.filter((m) => m.temas?.length);
  assert.ok(comTema.length > 0, 'nenhuma música do acervo trouxe tema');
  // Mutação: tire a leitura de `temas` de `site/repertorio.ts` e isto cai.
  for (const m of comTema) {
    for (const t of m.temas!) {
      assert.ok(TEMAS_CANONICOS.includes(t), `${m.slug} trouxe "${t}", fora do vocabulário`);
    }
    // Repetido não entra duas vezes: um tema não é mais e menos relevante que
    // ele mesmo (ver `lerTemas`).
    assert.equal(new Set(m.temas!).size, m.temas!.length, `${m.slug} repetiu tema`);
  }
});

test('o filtro de tema é uma lista, e ela traz só o que o acervo usa', () => {
  const html = paginaBiblioteca(rep);
  const conta = usados();
  assert.ok(conta.size > 0);

  assert.match(html, /<select class="campo campo-select" data-filtro=lista data-campo="tema"/);
  assert.ok(!/<input[^>]*data-campo="tema"/.test(html), 'o tema voltou a ser campo de texto');
  assert.ok(html.includes('<option value="">Todos os temas</option>'));

  for (const [t, n] of conta) {
    assert.ok(
      html.includes(`<option value="|${esc(t)}|">${esc(t)} (${n})</option>`),
      `faltou a opção "${t}" com a contagem ${n}`,
    );
  }
  // Tema do vocabulário que ninguém usou seria opção que só leva a "nada com
  // esses filtros".
  for (const t of TEMAS_CANONICOS) {
    if (conta.has(t)) continue;
    assert.ok(!html.includes(`<option value="|${esc(t)}|"`), `"${t}" não é usado e virou opção`);
  }

  // Uma lista que o script não recolhe é decoração: o filtro tem que juntar
  // `select` aos `input`, e ouvir `change` — nem todo navegador dispara
  // `input` ao escolher, e no celular menos ainda.
  assert.ok(
    html.includes("querySelectorAll('input[data-filtro],select[data-filtro]')"),
    'o script de filtro não enxerga o select',
  );
  assert.ok(
    html.includes("if(c.tagName==='SELECT')c.addEventListener('change',aplicar)"),
    'o script não ouve a troca no select',
  );
});

test('a lista vem por frequência, para o topo ser o que mais serve', () => {
  const html = paginaBiblioteca(rep);
  const conta = usados();
  const naTela = [...html.matchAll(/<option value="\|([^|]+)\|">[^(]*\((\d+)\)<\/option>/g)].map(
    (m) => [m[1]!, Number(m[2])] as const,
  );
  assert.equal(naTela.length, conta.size);
  for (let i = 1; i < naTela.length; i++) {
    const [nomeA, nA] = naTela[i - 1]!;
    const [nomeB, nB] = naTela[i]!;
    assert.ok(
      nA > nB || (nA === nB && nomeA.localeCompare(nomeB, 'pt-BR') <= 0),
      `ordem quebrada entre "${nomeA}" (${nA}) e "${nomeB}" (${nB})`,
    );
  }
});

test('o tema do item é delimitado — substring não pode casar tema errado', () => {
  const html = paginaBiblioteca(rep);
  for (const m of rep.todas) {
    if (!m.temas?.length) continue;
    assert.ok(
      html.includes(`data-tema="|${esc(m.temas.join('|'))}|"`),
      `os temas de ${m.slug} não saíram delimitados`,
    );
  }

  // A razão de existir do delimitador: sem ele, um tema contido no nome de
  // outro traria música errada. O vocabulário tem pares assim de verdade —
  // e se um dia não tiver, o delimitador continua sendo o certo.
  const contido = TEMAS_CANONICOS.filter((a) =>
    TEMAS_CANONICOS.some((b) => b !== a && b.toLowerCase().includes(a.toLowerCase())),
  );
  for (const curto of contido) {
    const longo = TEMAS_CANONICOS.find(
      (b) => b !== curto && b.toLowerCase().includes(curto.toLowerCase()),
    )!;
    // Buscar pelo segmento do curto não pode achar o atributo que só tem o longo.
    assert.ok(
      !`|${longo}|`.includes(`|${curto}|`),
      `"${curto}" casaria dentro de "${longo}" mesmo delimitado`,
    );
  }
});
