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

test('prefixo que serve a duas músicas não escolhe: pergunta, com as candidatas', () => {
  // Um prefixo curto o bastante para pegar mais de uma música do repertório.
  const prefixos = ['e', 'a', 'o'];
  const ambiguo = prefixos.find(
    (p) => rep.todas.filter((m) => m.titulo.toLowerCase().startsWith(p)).length > 1,
  );
  assert.ok(ambiguo, 'o repertório não tem prefixo ambíguo para este teste');
  const lida = lerSetlistTexto(ambiguo, rep);
  assert.deepEqual(lida.entradas, []);
  const p = lida.problemas[0]!;
  assert.equal(p.motivo, 'ambigua');
  // A pergunta só serve se vier com as opções: sem elas a tela não tem o que
  // oferecer, e o usuário fica travado — que era o defeito.
  assert.ok((p.candidatas?.length ?? 0) > 1, 'a ambiguidade tem que trazer as candidatas');
  assert.match(explicarProblema(p), /versões no acervo/);
});

/**
 * O acervo de verdade (`musicas/`), onde 58 dos 343 títulos se repetem. O
 * `rep` dos outros testes é só o JSON — nele "VITORIOSO ÉS" é uma música só, e
 * a ambiguidade que este bloco testa não existiria.
 */
const ACERVO = fileURLToPath(new URL('../musicas/', import.meta.url));
const repComAcervo = carregarRepertorio(REPERTORIO_JSON, ACERVO);

/** O primeiro grupo de títulos idênticos do acervo, com mais de uma versão. */
function tituloRepetido() {
  const norm = (s: string) =>
    s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();
  const grupos = new Map<string, typeof repComAcervo.todas>();
  for (const m of repComAcervo.todas) {
    const k = norm(m.titulo);
    grupos.set(k, [...(grupos.get(k) ?? []), m]);
  }
  const achado = [...grupos.values()].find((g) => g.length > 1);
  assert.ok(achado, 'o acervo não tem título repetido para este teste');
  return achado;
}

test('título repetido no acervo vira pergunta, não conselho impossível', () => {
  // Nesses casos os títulos são IDÊNTICOS: "escreva o título inteiro" não
  // desempata nada, e era exatamente o que a tela dizia — travando quem monta.
  const repetido = tituloRepetido();
  const lida = lerSetlistTexto(repetido[0]!.titulo, repComAcervo);
  const p = lida.problemas[0]!;
  assert.equal(p.motivo, 'ambigua');
  assert.equal(p.candidatas?.length, repetido.length);

  // E escolher uma resolve a linha, no tom da versão escolhida.
  const alvo = repetido[1]!;
  const comEscolha = lerSetlistTexto(repetido[0]!.titulo, repComAcervo, {
    [repetido[0]!.titulo]: alvo.slug,
  });
  assert.deepEqual(comEscolha.problemas, []);
  assert.equal(codificarOrdem(comEscolha.entradas), `${alvo.slug}:${alvo.tom}`);
});

test('escolha que não é candidata da linha é ignorada — não injeta música', () => {
  const repetido = tituloRepetido();
  const lida = lerSetlistTexto(repetido[0]!.titulo, repComAcervo, {
    [repetido[0]!.titulo]: 'quebrantado',
  });
  assert.deepEqual(lida.entradas, [], 'slug de fora não podia virar entrada');
  assert.equal(lida.problemas[0]!.motivo, 'ambigua');
});

test('o tom escrito na linha sobrevive à escolha da versão', () => {
  const alvo = tituloRepetido()[0]!;
  const linha = `${alvo.titulo} - Bb`;
  const lida = lerSetlistTexto(linha, repComAcervo, { [linha]: alvo.slug });
  assert.deepEqual(lida.problemas, []);
  assert.equal(codificarOrdem(lida.entradas), `${alvo.slug}:Bb`);
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
    assert.ok(r.body.includes('name=periodo value="Noite" checked'));
    assert.ok(r.body.includes('MÚSICA QUE NÃO EXISTE</textarea>'));
  } finally {
    await app.close();
  }
});

/** O servidor com o acervo por baixo — é lá que os títulos se repetem. */
const configComAcervo = { ...config, acervo: ACERVO };

test('título com várias versões abre a escolha, com tom e acordes de cada uma', async () => {
  const app = criarServidor(configComAcervo);
  try {
    const r = await app.inject({
      method: 'GET',
      url: `/culto/novo?data=2026-09-20&periodo=Manha&musicas=${encodeURIComponent('VITORIOSO ÉS')}`,
    });
    // Não é 302 (não dá para adivinhar) nem trava: é a pergunta.
    assert.equal(r.statusCode, 400);
    // O formulário sai duas vezes (o modal e o <noscript>): a pergunta tem que
    // funcionar nos dois, então a conferência é dentro de um deles.
    const modal = r.body.slice(r.body.indexOf('<dialog'), r.body.indexOf('</dialog>'));
    assert.ok(modal.includes('class=escolhas'), 'faltou o bloco de escolha');
    assert.ok(modal.includes('versões no acervo. Qual é a de vocês?'));
    // Rádio de verdade, uma por versão, com o par LINHA=slug.
    const radios = [...modal.matchAll(/name=escolha value="([^"]+)"/g)].map((m) => m[1]!);
    assert.ok(radios.length > 1, 'esperava mais de uma versão para escolher');
    assert.ok(radios.every((v) => v.startsWith('VITORIOSO ÉS=')));
    // A primeira nasce marcada: o formulário nunca volta sem resposta possível.
    assert.equal((modal.match(/name=escolha value="[^"]+" checked/g) ?? []).length, 1);
    // E sem JavaScript a mesma pergunta está na página.
    const noscript = r.body.slice(r.body.indexOf('<noscript>'), r.body.indexOf('</noscript>'));
    assert.ok(noscript.includes('name=escolha'), 'a escolha tem que existir sem JS');
    // E o que decide a escolha está na tela: o tom e os primeiros acordes.
    assert.ok(r.body.includes('class=versao-tom'), 'faltou o tom de cada versão');
    assert.ok(r.body.includes('class=versao-cifra'), 'faltou a prévia de acordes');
    // O que foi digitado continua lá — escolher não pode custar a setlist.
    assert.ok(r.body.includes('VITORIOSO ÉS</textarea>'));
  } finally {
    await app.close();
  }
});

test('escolhida a versão, o culto sai montado com ela', async () => {
  const app = criarServidor(configComAcervo);
  try {
    const escolha = encodeURIComponent('VITORIOSO ÉS=vitorioso-es-g');
    const r = await app.inject({
      method: 'GET',
      url:
        `/culto/novo?data=2026-09-20&periodo=Manha&musicas=${encodeURIComponent('VITORIOSO ÉS')}` +
        `&escolha=${escolha}`,
    });
    assert.equal(r.statusCode, 302);
    const destino = new URL(r.headers.location as string, 'http://x');
    assert.equal(destino.searchParams.get('ordem'), 'vitorioso-es-g:G');
  } finally {
    await app.close();
  }
});

test('várias linhas ambíguas são resolvidas de uma vez, não uma por recarga', async () => {
  const app = criarServidor(configComAcervo);
  try {
    const musicas = encodeURIComponent('VITORIOSO ÉS\nTEU TOQUE');
    const r = await app.inject({
      method: 'GET',
      url: `/culto/novo?data=2026-09-20&periodo=Manha&musicas=${musicas}`,
    });
    assert.equal(r.statusCode, 400);
    // Dois grupos de pergunta na mesma tela — não uma pergunta por recarga.
    const modal = r.body.slice(r.body.indexOf('<dialog'), r.body.indexOf('</dialog>'));
    assert.equal((modal.match(/class=escolha-grupo/g) ?? []).length, 2);

    const resolvido = await app.inject({
      method: 'GET',
      url:
        `/culto/novo?data=2026-09-20&periodo=Manha&musicas=${musicas}` +
        `&escolha=${encodeURIComponent('VITORIOSO ÉS=vitorioso-es-g')}` +
        `&escolha=${encodeURIComponent('TEU TOQUE=teu-toque-d')}`,
    });
    assert.equal(resolvido.statusCode, 302);
    const destino = new URL(resolvido.headers.location as string, 'http://x');
    assert.equal(destino.searchParams.get('ordem'), 'vitorioso-es-g:G,teu-toque-d:D');
  } finally {
    await app.close();
  }
});

test('o cartão diz o que separa as versões: capotraste e, em último caso, o arquivo', async () => {
  const app = criarServidor(configComAcervo);
  try {
    const r = await app.inject({
      method: 'GET',
      url: `/culto/novo?data=2026-09-20&periodo=Manha&musicas=${encodeURIComponent('VITORIOSO ÉS')}`,
    });
    const modal = r.body.slice(r.body.indexOf('<dialog'), r.body.indexOf('</dialog>'));

    // O capotraste vem da própria transcrição ("CAPOTRASTE NA PRIMEIRA CASA"),
    // e é o que separa as duas versões em C# do mesmo artista: uma se toca em
    // C e soa em C#, a outra se toca em C# mesmo.
    assert.ok(modal.includes('capotraste na 1ª casa'), 'faltou anunciar o capotraste');

    // Duas versões ficam com tom E acordes idênticos (as duas em G). Só nessas
    // o nome do arquivo aparece — é o único lugar onde a diferença existe.
    //
    // A conferência é sobre a LEGENDA, o texto que o usuário lê: o slug está
    // no `value` de todo rádio, que é outra coisa.
    const legendas = [...modal.matchAll(/class=versao-quem><b>[^<]*<\/b>(?:<span>(.*?)<\/span>)?/g)]
      .map((m) => m[1] ?? '');
    assert.ok(
      legendas.some((l) => l.includes('vitorioso-es-g')),
      'faltou desempatar as duas em G pelo nome do arquivo',
    );
    // E não aparece nas que já se distinguem sozinhas: as duas em C# têm
    // acordes diferentes, e o cartão não precisa expor o encanamento.
    assert.ok(
      !legendas.some((l) => l.includes('vitorioso-es-cs')),
      'slug não devia aparecer em versão que o tom e os acordes já separam',
    );
  } finally {
    await app.close();
  }
});

// ------------------------------------------------------- manhã e noite
test('marcar manhã e noite cria os dois cultos com a mesma setlist', async () => {
  const app = criarServidor(config);
  try {
    const r = await app.inject({
      method: 'GET',
      url:
        '/culto/novo?data=2026-09-20&periodo=Manha&periodo=Noite' +
        `&musicas=${encodeURIComponent('QUEBRANTADO')}`,
    });
    assert.equal(r.statusCode, 302);
    const destino = new URL(r.headers.location as string, 'http://x');
    // Abre o primeiro da ordem do dia; o outro viaja como irmão.
    assert.equal(destino.pathname, '/culto/novo/20SET_Manha');
    assert.deepEqual(destino.searchParams.getAll('irmao'), ['20SET_Noite']);
    assert.equal(destino.searchParams.get('ordem'), 'quebrantado:G');

    // O painel anuncia os dois e dá o caminho para o outro, sem passar pela
    // agenda — e a setlist vai junto no link.
    const painel = await app.inject({ method: 'GET', url: r.headers.location as string });
    assert.equal(painel.statusCode, 200);
    assert.ok(painel.body.includes('2 cultos criados'));
    assert.ok(painel.body.includes('Abrir Noite'));
    assert.ok(/href="[^"]*20SET_Noite[^"]*ordem=quebrantado%3AG/.test(painel.body));
  } finally {
    await app.close();
  }
});

test('a ordem do dia manda: marcar só a noite abre a noite', async () => {
  const app = criarServidor(config);
  try {
    const r = await app.inject({
      method: 'GET',
      url: '/culto/novo?data=2026-09-20&periodo=Noite',
    });
    assert.equal(r.statusCode, 302);
    const destino = new URL(r.headers.location as string, 'http://x');
    assert.equal(destino.pathname, '/culto/novo/20SET_Noite');
    assert.deepEqual(destino.searchParams.getAll('irmao'), []);
  } finally {
    await app.close();
  }
});

test('período fora do vocabulário não vira culto', async () => {
  const app = criarServidor(config);
  try {
    // `Sexta` é lida no acervo (28AGO_Sexta) mas não é oferecida; `Madrugada`
    // não existe em lugar nenhum. Nenhuma das duas pode virar sufixo de URL.
    for (const p of ['Madrugada', 'Sexta']) {
      const r = await app.inject({ method: 'GET', url: `/culto/novo?data=2026-09-20&periodo=${p}` });
      assert.equal(r.statusCode, 400, `${p} não devia criar culto`);
    }
  } finally {
    await app.close();
  }
});

test('o culto irmão só existe se o nome seguir a convenção', async () => {
  const app = criarServidor(config);
  try {
    // `?irmao=` chega pela URL como tudo neste site: lixo ali não pode virar
    // cartão de culto na tela nem entrada no índice do aparelho.
    const r = await app.inject({
      method: 'GET',
      url: '/culto/novo/20SET_Manha?d=2026-09-20&irmao=NAO_E_CULTO&irmao=20SET_Noite',
    });
    assert.equal(r.statusCode, 200);
    assert.ok(r.body.includes('Abrir Noite'));
    assert.ok(!r.body.includes('NAO_E_CULTO'), 'nome inválido não podia virar irmão');
    assert.ok(r.body.includes('2 cultos criados'), 'sobrou só um irmão válido');
  } finally {
    await app.close();
  }
});
