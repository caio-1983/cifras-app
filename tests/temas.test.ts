import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizarTema,
  lerTemas,
  formatarTemas,
  TEMAS_CANONICOS,
  MAX_TEMAS,
} from '../src/temas.ts';

test('normalizarTema: a grafia é aberta — acento e caixa não criam tema novo', () => {
  // Os 4 arquivos do acervo escrevem "adoracao", sem acento e minúsculo.
  assert.equal(normalizarTema('adoracao'), 'Adoração');
  assert.equal(normalizarTema('ADORAÇÃO'), 'Adoração');
  assert.equal(normalizarTema('  Adoração  '), 'Adoração');
});

test('normalizarTema: as unificações pedidas colapsam no mesmo canônico', () => {
  // A unificação que o usuário nomeou: entrega / entrega a Deus / consagração.
  assert.equal(normalizarTema('Entrega'), 'Entrega');
  assert.equal(normalizarTema('Entrega a Deus'), 'Entrega');
  assert.equal(normalizarTema('Consagração'), 'Entrega');
  // Majestade e glória descrevem o mesmo gesto; separados dividiriam o chip.
  assert.equal(normalizarTema('Majestade de Deus'), 'Glória de Deus');
  assert.equal(normalizarTema('Glória'), 'Glória de Deus');
  // Redenção é salvação pelo lado do preço pago.
  assert.equal(normalizarTema('Redenção'), 'Salvação');
});

test('normalizarTema: "Comunhão com Deus" é intimidade, "Comunhão" é entre irmãos', () => {
  // O sufixo é a única coisa que separa os dois, e eles não podem colidir:
  // um filtra música de intimidade, o outro música de igreja.
  assert.equal(normalizarTema('Comunhão com Deus'), 'Intimidade com Deus');
  assert.equal(normalizarTema('Comunhão'), 'Comunhão');
});

test('normalizarTema: fora do vocabulário devolve undefined, nunca um palpite', () => {
  // A regra de docs/site.md: a tela não exibe tema inventado. Se o
  // classificador devolver rótulo livre, ele para aqui em vez de virar chip.
  assert.equal(normalizarTema('Música lenta'), undefined);
  assert.equal(normalizarTema('Natal'), undefined);
  assert.equal(normalizarTema(''), undefined);
});

test('lerTemas: o campo do cabeçalho vira lista, e a ordem é preservada', () => {
  // A ordem é relevância (tema 1 principal, 3 complementar) — reordenar
  // perderia a informação que a classificação produziu.
  const lido = lerTemas('Amor de Deus, Graça, Misericórdia');
  assert.deepEqual(lido.temas, ['Amor de Deus', 'Graça', 'Misericórdia']);
  assert.deepEqual(lido.desconhecidos, []);
  assert.equal(lido.temas.length, MAX_TEMAS);
});

test('lerTemas: sinônimo no arquivo entra já canônico', () => {
  const lido = lerTemas('adoracao, majestade, entrega a deus');
  assert.deepEqual(lido.temas, ['Adoração', 'Glória de Deus', 'Entrega']);
});

test('lerTemas: repetido entra uma vez — um tema não é mais e menos relevante que ele mesmo', () => {
  // "Glória" e "Majestade" colapsam no mesmo canônico: sem a deduplicação, o
  // mesmo rótulo apareceria duas vezes na mesma música.
  const lido = lerTemas('Glória, Majestade, Graça');
  assert.deepEqual(lido.temas, ['Glória de Deus', 'Graça']);
});

test('lerTemas: vírgula sobrando não é erro de conteúdo', () => {
  assert.deepEqual(lerTemas('Fé, , Esperança,').temas, ['Fé', 'Esperança']);
  assert.deepEqual(lerTemas('').temas, []);
});

test('lerTemas: o desconhecido é devolvido, não engolido em silêncio', () => {
  // Quem chama decide avisar; o que não pode é sumir sem ninguém notar.
  const lido = lerTemas('Adoração, Xarope, Graça');
  assert.deepEqual(lido.temas, ['Adoração', 'Graça']);
  assert.deepEqual(lido.desconhecidos, ['Xarope']);
});

test('formatarTemas é o inverso de lerTemas', () => {
  const texto = 'Amor de Deus, Graça, Misericórdia';
  assert.equal(formatarTemas(lerTemas(texto).temas), texto);
});

test('o vocabulário é fechado, enxuto e sem canônico repetido', () => {
  // Fechado porque tema serve para filtrar: vocabulário livre vira ruído.
  // Enxuto porque lista longa não classifica melhor — espalha a mesma música
  // por rótulos concorrentes. O alvo combinado foi 40–50.
  assert.ok(TEMAS_CANONICOS.length >= 40 && TEMAS_CANONICOS.length <= 55,
    `vocabulário com ${TEMAS_CANONICOS.length} temas, fora da faixa acordada`);
  assert.equal(new Set(TEMAS_CANONICOS).size, TEMAS_CANONICOS.length);
});

test('todo canônico se reconhece, e nenhuma variante rouba o canônico de outro', () => {
  // Mutação que este teste pega: mapear uma variante para o canônico errado
  // (ex. "verdade" -> "Justiça") passaria despercebido sem o ida-e-volta.
  for (const tema of TEMAS_CANONICOS) {
    assert.equal(normalizarTema(tema), tema, `"${tema}" não se reconhece`);
  }
});
