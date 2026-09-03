/**
 * O painel de operação musical, pelas rotas de verdade (`app.inject`).
 *
 * O critério de aceitação é comportamental, não estético:
 *
 * 1. **O culto é a tela principal**, com a ordem e os tons em que foi tocado.
 * 2. **Toda ação da setlist é link de verdade** — reordenar, remover,
 *    adicionar, transpor e escolher a música atual funcionam sem JavaScript,
 *    porque o culto acontece com o celular na mão e a rede da igreja não é
 *    confiável.
 * 3. **A execução é outra tela**: escura, sem casca de navegação, com a cifra
 *    saindo do emissor sem uma vírgula reimplementada.
 * 4. **O servidor continua sem estado** — a setlist inteira cabe na URL, que
 *    é o que atravessa do computador para o celular.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { criarServidor } from '../site/servidor.ts';
import { carregarRepertorio } from '../site/repertorio.ts';
import { lerNomeDeCulto, montarCultos } from '../site/cultos.ts';
import { codificarOrdem, decodificarOrdem, indiceValido } from '../site/setlist.ts';
import { TONS, CICLO, CLASSE_DE_ALTURA, passoDeTom } from '../site/tons.ts';
import { escrever } from '../gerador-ts/html.ts';

process.env.CIFRAS_LOG = 'silent';

const REPERTORIO_JSON = fileURLToPath(new URL('../dados/repertorio.json', import.meta.url));
const config = { porta: 0, host: '127.0.0.1', repertorio: REPERTORIO_JSON };
const rep = carregarRepertorio(REPERTORIO_JSON);

async function comApp<T>(fn: (app: ReturnType<typeof criarServidor>) => Promise<T>): Promise<T> {
  const app = criarServidor(config);
  try {
    return await fn(app);
  } finally {
    await app.close();
  }
}

/** Todos os `href` do HTML, na ordem em que aparecem. */
function hrefs(html: string): string[] {
  return [...html.matchAll(/href="([^"]+)"/g)].map((m) =>
    m[1]!.replaceAll('&amp;', '&').replaceAll('&lt;', '<').replaceAll('&gt;', '>'),
  );
}

/** O `?ordem=` de um href, já decodificado (`'slug:tom,slug:tom'`). */
function ordemDe(href: string): string | null {
  return new URL(href, 'http://x').searchParams.get('ordem');
}

/**
 * Só o bloco da setlist. A lista de "adicionar música" também traz títulos
 * do repertório — comparar contra o corpo inteiro confundiria "está na
 * setlist" com "pode ser adicionada".
 */
function blocoSetlist(html: string): string {
  const m = /<ol class=setlist>([\s\S]*?)<\/ol>/.exec(html);
  assert.ok(m, 'a página não tem bloco de setlist');
  return m[1]!;
}

/** O primeiro href que casa com o predicado. */
function acharHref(html: string, filtro: (h: string) => boolean): string {
  const achado = hrefs(html).find(filtro);
  assert.ok(achado, 'nenhum href bate com o filtro');
  return achado;
}

const CULTO = '06SET';
const CANONICA = 'vitorioso-es:G,eu-vou-construir:C,teu-toque:Bb,quebrantado:C,a-maior-honra:Ab';

// ------------------------------------------------------ o culto é a tela
test('o repertório carrega os 3 cultos, do mais recente para o mais antigo', () => {
  // Sem ano no nome do arquivo, a ordem é por mês/dia — 06/09 é o último.
  assert.deepEqual(
    rep.cultos.map((c) => c.nome),
    ['06SET', '30AGO_Noite', '28AGO_Sexta'],
  );
  assert.deepEqual(
    rep.cultos.map((c) => c.ordinal),
    [906, 830, 828],
  );
});

test('GET /culto/06SET traz a setlist na ordem e nos tons em que foi tocada', async () => {
  await comApp(async (app) => {
    const r = await app.inject({ method: 'GET', url: `/culto/${CULTO}` });
    assert.equal(r.statusCode, 200);

    const culto = rep.cultoPorNome(CULTO)!;
    assert.equal(codificarOrdem(culto.entradas), CANONICA);

    // Os títulos aparecem na ordem do culto, não em ordem alfabética.
    const setlist = blocoSetlist(r.body);
    const posicoes = culto.entradas.map((e) => setlist.indexOf(`<b>${e.musica.titulo}</b>`));
    assert.ok(posicoes.every((p) => p >= 0), 'faltou alguma música da setlist');
    for (let i = 1; i < posicoes.length; i++) {
      assert.ok(posicoes[i]! > posicoes[i - 1]!, `${culto.entradas[i]!.slug} fora de ordem`);
    }
    // O número da posição e o tom tocado saem na tela.
    assert.match(r.body, /class=num>01</);
    assert.ok(r.body.includes('>Bb</a>'), 'faltou o tom tocado de TEU TOQUE');
    // QUEBRANTADO foi tocada em C, não no seu tom de origem (G).
    assert.equal(rep.porSlug('quebrantado')!.tom, 'G');
    assert.ok(r.body.includes('href="/musica/quebrantado?tom=C"'));
  });
});

test('o momento aparece no culto — que é o contexto que ele exige', async () => {
  await comApp(async (app) => {
    const r = await app.inject({ method: 'GET', url: `/culto/${CULTO}` });
    // `momento` é propriedade do papel da música NO CULTO (docs/site.md).
    // Na página solta ele não pode aparecer (tests/site.test.ts cobre isso);
    // aqui tem que aparecer.
    assert.ok(r.body.includes('Ofertório'), 'faltou o momento de QUEBRANTADO');
    assert.ok(r.body.includes('Apelo / Ceia'), 'faltou o momento de A MAIOR HONRA');
  });
});

test('a música atual sai do emissor, sem reimplementação, e o contador confere', async () => {
  await comApp(async (app) => {
    const r = await app.inject({ method: 'GET', url: `/culto/${CULTO}?atual=2` });
    const m = rep.porSlug('teu-toque')!;
    assert.ok(
      r.body.includes(escrever(m, 'Bb', false, { momento: false })),
      'a prévia da música atual não é a saída do emissor',
    );
    assert.match(r.body, /class=conta>03 \/ 05</);
  });
});

// -------------------------------------------- ações são links de verdade
test('reordenar é link: subir a 2ª troca com a 1ª e nada mais muda', async () => {
  await comApp(async (app) => {
    const r = await app.inject({ method: 'GET', url: `/culto/${CULTO}` });
    const subir = hrefs(r.body).filter((h) => h.includes('/culto/') && ordemDe(h) !== CANONICA);
    const trocada = 'eu-vou-construir:C,vitorioso-es:G,teu-toque:Bb,quebrantado:C,a-maior-honra:Ab';
    assert.ok(
      subir.some((h) => ordemDe(h) === trocada),
      'faltou o link que sobe EU VOU CONSTRUIR para a 1ª posição',
    );

    // E o link funciona: a ordem nova é a que a tela passa a mostrar.
    const link = acharHref(r.body, (h) => ordemDe(h) === trocada);
    const depois = await app.inject({ method: 'GET', url: link });
    assert.equal(depois.statusCode, 200);
    const titulos = ['EU VOU CONSTRUIR', 'VITORIOSO ÉS'].map((t) => depois.body.indexOf(`<b>${t}</b>`));
    assert.ok(titulos[0]! < titulos[1]!, 'a troca não valeu na página seguinte');
  });
});

test('remover é link, e a última música do culto não tem como ser removida', async () => {
  await comApp(async (app) => {
    const r = await app.inject({ method: 'GET', url: `/culto/${CULTO}` });
    const semAPrimeira = 'eu-vou-construir:C,teu-toque:Bb,quebrantado:C,a-maior-honra:Ab';
    assert.ok(hrefs(r.body).some((h) => ordemDe(h) === semAPrimeira), 'faltou o link de remover');
    // Uma ação de remover por música — nem a mais, nem a menos.
    assert.equal((blocoSetlist(r.body).match(/class="remover"/g) ?? []).length, 5);

    // Setlist de uma música: remover deixaria o culto sem nada — sem link.
    const so = await app.inject({ method: 'GET', url: `/culto/${CULTO}?ordem=teu-toque:Bb` });
    assert.equal(so.statusCode, 200);
    assert.ok(!so.body.includes('class="remover"'), 'a única música não deveria ter remover');
    assert.ok(blocoSetlist(so.body).includes('<b>TEU TOQUE</b>'));
  });
});

test('adicionar é link, e só oferece o que ainda não está no culto', async () => {
  await comApp(async (app) => {
    const r = await app.inject({ method: 'GET', url: `/culto/${CULTO}` });
    // As 5 do culto ficam fora da lista de candidatas; sobram 8.
    const naSetlist = rep.cultoPorNome(CULTO)!.entradas.map((e) => e.slug);
    const candidatas = hrefs(r.body).filter((h) => (ordemDe(h) ?? '').startsWith(CANONICA + ','));
    assert.equal(candidatas.length, rep.todas.length - naSetlist.length);

    // A música entra no fim, no seu tom de ORIGEM (não no tom de outra).
    const emaus = rep.porSlug('emaus')!;
    assert.ok(
      candidatas.some((h) => ordemDe(h) === `${CANONICA},emaus:${emaus.tom}`),
      'EMAÚS não entra no fim, no tom de origem',
    );
    for (const slug of naSetlist) {
      assert.ok(
        !candidatas.some((h) => (ordemDe(h) ?? '').endsWith(`,${slug}:`)),
        `${slug} já está no culto e não deveria ser oferecida`,
      );
    }
  });
});

test('transpor é link: −1 e +1 andam meio tom e só mexem naquela música', async () => {
  await comApp(async (app) => {
    const r = await app.inject({ method: 'GET', url: `/culto/${CULTO}` });
    // VITORIOSO ÉS em G: +1 -> Ab, -1 -> Gb (grafia com bemol do ciclo).
    for (const esperado of [
      'vitorioso-es:Ab,eu-vou-construir:C,teu-toque:Bb,quebrantado:C,a-maior-honra:Ab',
      'vitorioso-es:Gb,eu-vou-construir:C,teu-toque:Bb,quebrantado:C,a-maior-honra:Ab',
    ]) {
      assert.ok(hrefs(r.body).some((h) => ordemDe(h) === esperado), `faltou o passo para ${esperado}`);
    }

    // E a cifra realmente sai no tom novo.
    const link = acharHref(r.body, (h) => (ordemDe(h) ?? '').startsWith('vitorioso-es:Ab'));
    const depois = await app.inject({ method: 'GET', url: `${link}&atual=0` });
    assert.ok(depois.body.includes('<b>Tom: Ab</b>'));
  });
});

test('escolher a música atual é link, e remover a atual não deixa o cursor no vazio', async () => {
  await comApp(async (app) => {
    const r = await app.inject({ method: 'GET', url: `/culto/${CULTO}?atual=4` });
    // Atual é a última (índice 4). O link de remover ela tem que voltar o
    // cursor para 3 — senão a próxima tela aponta para depois do fim.
    const remover = acharHref(
      r.body,
      (h) => ordemDe(h) === 'vitorioso-es:G,eu-vou-construir:C,teu-toque:Bb,quebrantado:C',
    );
    assert.equal(new URL(remover, 'http://x').searchParams.get('atual'), '3');
    const depois = await app.inject({ method: 'GET', url: remover });
    assert.match(depois.body, /class=conta>04 \/ 04</);
  });
});

// ------------------------------------------------------ a URL é o estado
test('?ordem= manda na setlist, e lixo no parâmetro cai na ordem tocada', async () => {
  await comApp(async (app) => {
    const preparada = 'emaus:C,ah-jesus:G';
    const r = await app.inject({ method: 'GET', url: `/culto/${CULTO}?ordem=${preparada}` });
    assert.equal(r.statusCode, 200);
    const setlist = blocoSetlist(r.body);
    assert.ok(setlist.includes('<b>EMAÚS</b>') && setlist.includes('<b>AH, JESUS / CORAÇÃO IGUAL AO TEU</b>'));
    assert.ok(
      !setlist.includes('<b>VITORIOSO ÉS</b>'),
      'a ordem preparada deveria ter substituído a tocada',
    );
    assert.ok(r.body.includes('Setlist alterada'), 'a tela deveria avisar que não é a ordem tocada');

    for (const lixo of ['', 'nao-existe:C', ':::', '../etc/passwd', 'emaus']) {
      const q = await app.inject({ method: 'GET', url: `/culto/${CULTO}?ordem=${encodeURIComponent(lixo)}` });
      assert.equal(q.statusCode, 200, lixo);
      const lista = blocoSetlist(q.body);
      if (lixo === 'emaus') {
        // Slug sem tom é aproveitado no tom de origem — meia informação
        // válida não justifica descartar a intenção.
        assert.ok(lista.includes('<b>EMAÚS</b>'), lixo);
      } else {
        assert.ok(lista.includes('<b>VITORIOSO ÉS</b>'), `${lixo} deveria cair na ordem tocada`);
      }
    }
  });
});

test('tom inválido no ?ordem= cai no tom de origem da música, não em erro', () => {
  const lida = decodificarOrdem('emaus:H,quebrantado:C', rep.porSlug);
  assert.deepEqual(
    lida?.map((e) => [e.slug, e.tom]),
    [['emaus', rep.porSlug('emaus')!.tom], ['quebrantado', 'C']],
  );
  assert.equal(decodificarOrdem('nao-existe:C', rep.porSlug), null);
  assert.equal(decodificarOrdem(undefined, rep.porSlug), null);
});

test('o índice da música atual fica sempre dentro da setlist', () => {
  for (const [pedido, esperado] of [['0', 0], ['4', 4], ['5', 0], ['-1', 0], ['x', 0], ['1.5', 0]] as const) {
    assert.equal(indiceValido(pedido, 5), esperado, pedido);
  }
  assert.equal(indiceValido(undefined, 5), 0);
});

test('codificar e decodificar a ordem é ida e volta', () => {
  const culto = rep.cultoPorNome(CULTO)!;
  const texto = codificarOrdem(culto.entradas);
  const volta = decodificarOrdem(texto, rep.porSlug)!;
  assert.equal(codificarOrdem(volta), texto);
  assert.deepEqual(volta.map((e) => e.musica.titulo), culto.entradas.map((e) => e.musica.titulo));
});

// -------------------------------------------------------- modo execução
test('a execução abre escura e sem casca de navegação', async () => {
  await comApp(async (app) => {
    const r = await app.inject({ method: 'GET', url: `/executar/${CULTO}` });
    assert.equal(r.statusCode, 200);
    assert.ok(r.body.includes('<html lang="pt-BR" data-theme=dark'), 'a execução tem que abrir no escuro');
    for (const cromo of ['class=lateral', 'class=abas', 'class=barra-topo']) {
      assert.ok(!r.body.includes(cromo), `${cromo} não pertence ao modo execução`);
    }
    // A cifra, o título, o tom, a navegação e a setlist — as cinco coisas.
    assert.ok(r.body.includes('<b>VITORIOSO ÉS</b>'));
    assert.ok(r.body.includes('id=pastilha-tom>G<'));
    assert.ok(r.body.includes('SETLIST'));
  });
});

test('a cifra da execução é byte a byte a do emissor, em toda música de todo culto', async () => {
  await comApp(async (app) => {
    for (const culto of rep.cultos) {
      for (let i = 0; i < culto.entradas.length; i++) {
        const e = culto.entradas[i]!;
        const r = await app.inject({
          method: 'GET',
          url: `/executar/${encodeURIComponent(culto.nome)}?i=${i}`,
        });
        assert.equal(r.statusCode, 200, `${culto.nome} #${i}`);
        assert.ok(
          r.body.includes(escrever(e.musica, e.tom, false, { momento: false })),
          `${culto.nome} #${i}: a cifra não é a do emissor`,
        );
        assert.ok(r.body.includes(`<b>Tom: ${e.tom}</b>`), `${culto.nome} #${i}: tom errado`);
      }
    }
  });
});

test('anterior e próxima são links de verdade, e não existem além das pontas', async () => {
  await comApp(async (app) => {
    const primeira = await app.inject({ method: 'GET', url: `/executar/${CULTO}?i=0` });
    assert.ok(!primeira.body.includes('id=ir-anterior'), 'não há anterior na primeira');
    assert.ok(primeira.body.includes('id=ir-proxima'));

    const ultima = await app.inject({ method: 'GET', url: `/executar/${CULTO}?i=4` });
    assert.ok(ultima.body.includes('id=ir-anterior'));
    assert.ok(!ultima.body.includes('id=ir-proxima'), 'não há próxima na última');

    // Seguir o link de próxima realmente avança a música.
    const meio = await app.inject({ method: 'GET', url: `/executar/${CULTO}?i=1` });
    const proxima = acharHref(meio.body, (h) => h.includes('/executar/') && h.endsWith('i=2'));
    const depois = await app.inject({ method: 'GET', url: proxima });
    assert.ok(depois.body.includes('<b>TEU TOQUE</b>'));
    assert.equal(ordemDe(proxima), CANONICA, 'a navegação tem que carregar a setlist');
  });
});

test('a setlist da execução marca feita, atual e por vir, e leva a qualquer música', async () => {
  await comApp(async (app) => {
    const r = await app.inject({ method: 'GET', url: `/executar/${CULTO}?i=2` });
    // ✓ nas duas anteriores, ▶ na atual, ○ nas seguintes.
    assert.equal((r.body.match(/&check;/g) ?? []).length, 2);
    assert.equal((r.body.match(/&#9654;/g) ?? []).length, 1);
    assert.equal((r.body.match(/&#9675;/g) ?? []).length, 2);
    assert.equal((r.body.match(/class=feita/g) ?? []).length, 2);

    for (let i = 0; i < 5; i++) {
      assert.ok(
        hrefs(r.body).some((h) => h.startsWith('/executar/') && h.endsWith(`i=${i}`)),
        `faltou o link direto para a música ${i}`,
      );
    }
  });
});

test('a transposição está na execução: os 16 tons e o passo de meio tom', async () => {
  await comApp(async (app) => {
    const r = await app.inject({ method: 'GET', url: `/executar/${CULTO}?i=0` });
    for (const { tom } of TONS) {
      assert.ok(
        hrefs(r.body).some((h) => ordemDe(h)?.startsWith(`vitorioso-es:${tom},`)),
        `faltou o tom ${tom} na grade`,
      );
    }
    // Gb e F# são links diferentes: a grafia do destino é uma escolha.
    const gb = acharHref(r.body, (h) => ordemDe(h)?.startsWith('vitorioso-es:Gb,') === true);
    const fs = acharHref(r.body, (h) => ordemDe(h)?.startsWith('vitorioso-es:F#,') === true);
    assert.notEqual(gb, fs);
    const emGb = await app.inject({ method: 'GET', url: gb });
    const emFs = await app.inject({ method: 'GET', url: fs });
    assert.ok(emGb.body.includes('<b>Tom: Gb</b>') && emFs.body.includes('<b>Tom: F#</b>'));
    assert.notEqual(emGb.body, emFs.body);

    // O passo sai marcado com o salto, para o script reapontá-lo depois de
    // uma troca sem recarregar.
    assert.ok(r.body.includes('data-passo="1"') && r.body.includes('data-passo="-1"'));
  });
});

test('a execução também respeita a setlist preparada e o ?i= fora da faixa', async () => {
  await comApp(async (app) => {
    const r = await app.inject({ method: 'GET', url: `/executar/${CULTO}?ordem=emaus:C,teu-toque:F&i=1` });
    assert.ok(r.body.includes('<b>TEU TOQUE</b>'));
    assert.ok(r.body.includes('<b>Tom: F</b>'));
    assert.match(r.body, /02 \/ 02/);

    const fora = await app.inject({ method: 'GET', url: `/executar/${CULTO}?i=99` });
    assert.equal(fora.statusCode, 200);
    assert.ok(fora.body.includes('<b>VITORIOSO ÉS</b>'), '?i= fora da faixa cai na primeira');
  });
});

test('culto inexistente devolve 404 nas duas telas, não 500', async () => {
  await comApp(async (app) => {
    for (const url of ['/culto/NAO_EXISTE', '/executar/NAO_EXISTE', '/culto/../etc']) {
      const r = await app.inject({ method: 'GET', url });
      assert.equal(r.statusCode, 404, url);
    }
  });
});

// ------------------------------------------------------------ biblioteca
test('a busca oferece filtro por tom com dado que existe, e não inventa tema', async () => {
  await comApp(async (app) => {
    const r = await app.inject({ method: 'GET', url: '/buscar' });
    assert.equal(r.statusCode, 200);
    // Cada item carrega o que a busca filtra: título, artista e tom de origem.
    for (const m of rep.todas) {
      assert.ok(r.body.includes(`data-tom-origem="${m.tom}"`), `faltou o tom de ${m.slug}`);
      assert.ok(r.body.includes(m.titulo), `faltou ${m.titulo}`);
    }
    const tons = [...new Set(rep.todas.map((m) => m.tom))];
    for (const t of tons) {
      assert.ok(r.body.includes(`data-tom-filtro="${t}"`), `faltou o chip de ${t}`);
    }
    // O repertório não tem campo de tema — a tela diz isso em vez de exibir
    // rótulo chutado.
    assert.ok(r.body.includes('ainda não tem o campo de tema'));
  });
});

test('o histórico lista os cultos e cada um abre no painel', async () => {
  await comApp(async (app) => {
    const r = await app.inject({ method: 'GET', url: '/cultos' });
    for (const c of rep.cultos) {
      assert.ok(r.body.includes(`href="/culto/${encodeURIComponent(c.nome)}"`), `faltou ${c.nome}`);
      assert.ok(r.body.includes(c.rotulo), `faltou o rótulo de ${c.nome}`);
    }
  });
});

// ------------------------------------------------------ nome do culto
test('o nome do arquivo de culto é lido pela convenção, sem inventar o que não tem', () => {
  assert.deepEqual(lerNomeDeCulto('06SET'), {
    data: '06 de setembro',
    periodo: null,
    rotulo: 'Culto de 06 de setembro',
    ordinal: 906,
  });
  assert.deepEqual(lerNomeDeCulto('23AGO_Manha'), {
    data: '23 de agosto',
    periodo: 'Manhã',
    rotulo: 'Culto de 23 de agosto',
    ordinal: 823,
  });
  assert.equal(lerNomeDeCulto('28AGO_Sexta').periodo, 'Sexta');

  // Nome fora da convenção não ganha data inventada.
  for (const nome of ['ensaio', '99XXX', '06XYZ']) {
    const lido = lerNomeDeCulto(nome);
    assert.equal(lido.data, null, nome);
    assert.equal(lido.rotulo, nome, nome);
  }
  // E nada aqui carrega ano, horário ou dia da semana: o nome não tem.
  assert.ok(!lerNomeDeCulto('06SET').rotulo.match(/\d{4}|\d{1,2}:\d{2}|domingo/i));
});

test('culto com música fora do repertório é descartado inteiro, não pela metade', () => {
  const porSlug = rep.porSlug;
  const montados = montarCultos(
    {
      BOM: [['emaus', 'C'], ['teu-toque', 'Bb']],
      FURADO: [['emaus', 'C'], ['nao-existe', 'G']],
      VAZIO: [],
    },
    porSlug,
  );
  assert.deepEqual(montados.map((c) => c.nome), ['BOM']);
});

// ------------------------------------------------------------- o passo
test('o passo de meio tom anda pelo ciclo de doze, e o ciclo é a grafia com bemol', () => {
  assert.equal(CICLO.length, 12);
  // Índice do ciclo = classe de altura. É o que faz o passo ser aritmética
  // de altura em vez de tabela decorada.
  CICLO.forEach((tom, i) => assert.equal(CLASSE_DE_ALTURA[tom], i, tom));

  for (const [tom, delta, esperado] of [
    ['C', 1, 'Db'],
    ['C', -1, 'B'],
    ['B', 1, 'C'],
    ['G', 1, 'Ab'],
    ['G', -1, 'Gb'],
    ['F#', 1, 'G'],
    ['F#', -1, 'F'],
    ['Gb', -1, 'F'],
    ['A#', 1, 'B'],
  ] as const) {
    assert.equal(passoDeTom(tom, delta), esperado, `${tom} ${delta > 0 ? '+' : ''}${delta}`);
  }

  // Doze passos para cima voltam ao mesmo som.
  let t = 'Eb';
  for (let i = 0; i < 12; i++) t = passoDeTom(t, 1);
  assert.equal(CLASSE_DE_ALTURA[t], CLASSE_DE_ALTURA['Eb']);

  // Tom que o núcleo não entende não ganha passo inventado.
  assert.equal(passoDeTom('H', 1), 'H');
});

// ----------------------------------------------------------- impressão
test('imprimir da execução continua produzindo o documento validado', async () => {
  await comApp(async (app) => {
    const r = await app.inject({ method: 'GET', url: `/executar/${CULTO}` });
    assert.ok(r.body.includes('@page{size:A4;margin:72pt}'), 'sumiu o A4');
    assert.ok(r.body.includes('.pb{page-break-before:always}'), 'sumiu a quebra de página');
    // As cores do padrão saem do emissor, não daqui.
    assert.ok(r.body.includes('.c{color:#ff6600}') && r.body.includes('.l{color:#0000ff}'));
    // E o cromo da execução não vai para o papel.
    assert.match(r.body, /@media print\{[^}]*\.exec-topo/);
  });
});
