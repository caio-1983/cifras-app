/**
 * A setlist digitada de uma vez (`site/setlistTexto.ts`).
 *
 * O critério é o do balcão: o diretor musical escreve a ordem como escreve no
 * papel — com número, com acento faltando, com o tom entre parênteses — e ou
 * o culto sai montado, ou ele é avisado **linha por linha** do que não foi
 * entendido. O que não pode acontecer é sair um culto com uma música a menos
 * sem ninguém avisar: isso só se descobre no culto.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { criarServidor } from '../site/servidor.ts';
import { carregarRepertorio } from '../site/repertorio.ts';
import { lerSetlistTexto, explicarProblema } from '../site/setlistTexto.ts';
import { codificarOrdem } from '../site/setlist.ts';

process.env.CIFRAS_LOG = 'silent';

const REPERTORIO_JSON = fileURLToPath(new URL('../dados/repertorio.json', import.meta.url));
const config = { porta: 0, host: '127.0.0.1', repertorio: REPERTORIO_JSON };
const rep = carregarRepertorio(REPERTORIO_JSON);

/** A ordem lida, no mesmo formato do `?ordem=`. */
function ordem(texto: string): string {
  const lida = lerSetlistTexto(texto, rep);
  assert.deepEqual(lida.problemas, [], 'esperava nenhum problema');
  return codificarOrdem(lida.entradas);
}

test('o culto de 06SET, digitado como se escreve no papel, sai montado', () => {
  assert.equal(
    ordem(
      `1. VITORIOSO ÉS - G
       2. EU VOU CONSTRUIR (C)
       3) TEU TOQUE — Bb

       QUEBRANTADO: C
       a maior honra - Ab`,
    ),
    'vitorioso-es:G,eu-vou-construir:C,teu-toque:Bb,quebrantado:C,a-maior-honra:Ab',
  );
});

test('sem tom escrito, vale o tom de origem da música', () => {
  const m = rep.porSlug('quebrantado')!;
  assert.equal(m.tom, 'G');
  assert.equal(ordem('QUEBRANTADO'), 'quebrantado:G');
});

test('acento e caixa não importam — "coracao" tem que achar "Coração"', () => {
  const comAcento = rep.todas.find((m) => /[áéíóúâêôãõç]/i.test(m.titulo));
  assert.ok(comAcento, 'o repertório não tem título com acento para este teste');
  const semAcento = comAcento.titulo.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  assert.equal(ordem(semAcento.toLowerCase()), `${comAcento.slug}:${comAcento.tom}`);
});

test('o tom só é separado quando é tom de verdade', () => {
  // "- PARTE 2" não é tom: a linha inteira é título, e o aviso fala dela
  // inteira em vez de procurar "DEUS É DEUS".
  const lida = lerSetlistTexto('DEUS É DEUS - PARTE 2', rep);
  assert.deepEqual(lida.entradas, []);
  assert.equal(lida.problemas[0]!.linha, 'DEUS É DEUS - PARTE 2');
  assert.equal(lida.problemas[0]!.motivo, 'nao-encontrada');
});

test('linha que não casa vira aviso, e as que casam continuam valendo', () => {
  const lida = lerSetlistTexto('VITORIOSO ÉS - G\nMÚSICA QUE NÃO EXISTE\nQUEBRANTADO', rep);
  assert.equal(codificarOrdem(lida.entradas), 'vitorioso-es:G,quebrantado:G');
  assert.equal(lida.problemas.length, 1);
  assert.match(explicarProblema(lida.problemas[0]!), /não está no repertório/);
});

test('prefixo que serve a duas músicas não escolhe: pergunta', () => {
  // Um prefixo curto o bastante para pegar mais de uma música do repertório.
  const prefixos = ['e', 'a', 'o'];
  const ambiguo = prefixos.find(
    (p) => rep.todas.filter((m) => m.titulo.toLowerCase().startsWith(p)).length > 1,
  );
  assert.ok(ambiguo, 'o repertório não tem prefixo ambíguo para este teste');
  const lida = lerSetlistTexto(ambiguo, rep);
  assert.deepEqual(lida.entradas, []);
  assert.equal(lida.problemas[0]!.motivo, 'ambigua');
  assert.match(explicarProblema(lida.problemas[0]!), /mais de uma música/);
});

test('a mesma música duas vezes é avisada, não duplicada em silêncio', () => {
  const lida = lerSetlistTexto('QUEBRANTADO\nquebrantado - C', rep);
  assert.equal(codificarOrdem(lida.entradas), 'quebrantado:G');
  assert.equal(lida.problemas[0]!.motivo, 'repetida');
});

test('linha vazia é separador de bloco, não erro', () => {
  const lida = lerSetlistTexto('\n\nQUEBRANTADO\n\n\nTEU TOQUE\n', rep);
  assert.deepEqual(lida.problemas, []);
  assert.equal(lida.entradas.length, 2);
});

// ------------------------------------------------------------ pela rota
test('abrir culto com a setlist digitada já redireciona com o ?ordem= pronto', async () => {
  const app = criarServidor(config);
  try {
    const musicas = encodeURIComponent('VITORIOSO ÉS - G\nQUEBRANTADO (Bb)');
    const r = await app.inject({
      method: 'GET',
      url: `/culto/novo?data=2026-09-20&periodo=Manha&musicas=${musicas}`,
    });
    assert.equal(r.statusCode, 302);
    const destino = new URL(r.headers.location as string, 'http://x');
    assert.equal(destino.pathname, '/culto/novo/20SET_Manha');
    assert.equal(destino.searchParams.get('ordem'), 'vitorioso-es:G,quebrantado:Bb');

    // E o painel abre com as duas músicas na ordem digitada.
    const painel = await app.inject({ method: 'GET', url: r.headers.location as string });
    assert.equal(painel.statusCode, 200);
    const setlist = /<ol class=setlist>([\s\S]*?)<\/ol>/.exec(painel.body)![1]!;
    assert.ok(setlist.indexOf('VITORIOSO ÉS') < setlist.indexOf('QUEBRANTADO'));
    assert.ok(setlist.includes('>Bb</summary>'), 'o tom digitado não chegou na setlist');
  } finally {
    await app.close();
  }
});

test('linha não entendida reabre o formulário com o que já foi escrito', async () => {
  const app = criarServidor(config);
  try {
    const musicas = 'VITORIOSO ÉS - G\nMÚSICA QUE NÃO EXISTE';
    const r = await app.inject({
      method: 'GET',
      url:
        '/culto/novo?data=2026-09-20&periodo=Noite&nome=Culto+de+domingo&tema=Gratid%C3%A3o' +
        `&musicas=${encodeURIComponent(musicas)}`,
    });
    assert.equal(r.statusCode, 400);
    assert.ok(r.body.includes('MÚSICA QUE NÃO EXISTE” não está no repertório'));
    // Nada do que foi digitado se perde: o formulário volta preenchido.
    assert.ok(r.body.includes('value="Culto de domingo"'));
    assert.ok(r.body.includes('value="Gratidão"'));
    assert.ok(r.body.includes('value="2026-09-20"'));
    assert.ok(r.body.includes('<option value="Noite" selected>'));
    assert.ok(r.body.includes('MÚSICA QUE NÃO EXISTE</textarea>'));
  } finally {
    await app.close();
  }
});
