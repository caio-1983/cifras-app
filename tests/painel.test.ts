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
import { cultoNovo, lerNomeDeCulto, montarCultos, nomeDeCultoNovo } from '../site/cultos.ts';
import { codificarOrdem, decodificarOrdem, indiceValido } from '../site/setlist.ts';
import { TONS, CICLO, CLASSE_DE_ALTURA, passoDeTom } from '../site/tons.ts';
import { esc, escrever } from '../gerador-ts/html.ts';
import { paginaAgenda, paginaCulto } from '../site/paginas.ts';
import { TEMAS_CANONICOS } from '../src/temas.ts';

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
    // O tom fica na linha, agora como o gatilho do menu de tons.
    assert.ok(r.body.includes('>Bb</summary>'), 'faltou o tom tocado de TEU TOQUE');
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

test('o tom abre a lista dos 16 na própria linha, e escolher é link de verdade', async () => {
  await comApp(async (app) => {
    const r = await app.inject({ method: 'GET', url: `/culto/${CULTO}` });
    const setlist = blocoSetlist(r.body);

    // Um menu por música, e a pastilha é o gatilho — não um link para outra
    // tela, que era o que tirava o usuário do culto para ver a cifra.
    assert.equal((setlist.match(/<details class=menu-tom>/g) ?? []).length, 5);
    assert.ok(setlist.includes('<summary class=pastilha'), 'a pastilha tem que abrir o menu');

    // As 16 grafias aparecem: E→Gb e E→F# são respostas diferentes.
    const primeiro = setlist.slice(setlist.indexOf('<div class=menu-lista>'));
    for (const o of TONS) {
      assert.ok(primeiro.includes(`>${o.tom}</span>`), `faltou ${o.tom} no menu`);
    }

    // Escolher é `href` que troca o tom daquela música e mantém o resto —
    // sem JavaScript o menu abre e a escolha navega igual.
    const emE = 'vitorioso-es:E,eu-vou-construir:C,teu-toque:Bb,quebrantado:C,a-maior-honra:Ab';
    const link = acharHref(r.body, (h) => ordemDe(h) === emE);
    const depois = await app.inject({ method: 'GET', url: link });
    assert.equal(depois.statusCode, 200);
    assert.ok(blocoSetlist(depois.body).includes('>E</summary>'), 'a escolha não valeu');

    // E a cifra continua a um clique, no rodapé do menu.
    assert.ok(setlist.includes('href="/musica/quebrantado?tom=C"'));
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

test('a rolagem automática fica na tela, não só na gaveta', async () => {
  await comApp(async (app) => {
    const r = await app.inject({ method: 'GET', url: `/executar/${CULTO}?i=0` });
    // O botão flutuante existe e é irmão da cifra, não filho de uma gaveta:
    // quem está tocando não abre menu para começar a rolar.
    assert.ok(r.body.includes('id=auto-fab'), 'faltou o botão flutuante');
    const antesDaGaveta = r.body.indexOf('id=auto-fab');
    const primeiraGaveta = r.body.indexOf('class=exec-gaveta');
    assert.ok(
      antesDaGaveta > 0 && antesDaGaveta < primeiraGaveta,
      'o botão flutuante caiu dentro de uma gaveta',
    );
    // Nasce escondido: sem JavaScript não há rolagem automática, e botão que
    // não faz nada é pior que botão nenhum.
    assert.match(r.body, /<button class=exec-auto id=auto-fab type=button hidden/);
    // O da gaveta continua existindo — os dois comandam a mesma rolagem.
    assert.ok(r.body.includes('id=auto-liga'), 'sumiu o controle da gaveta');
  });
});

test('a casca do modo execução se recolhe, e a rolagem sobrevive a ela', async () => {
  await comApp(async (app) => {
    const r = await app.inject({ method: 'GET', url: `/executar/${CULTO}?i=0` });
    // Topo e rodapé saem por transform sob `body.quieto`.
    assert.match(r.body, /body\.quieto \.exec-topo\{transform:translateY\(-100%\)/);
    assert.match(r.body, /body\.quieto \.exec-rodape\{transform:translateY\(100%\)/);
    // O botão de rolagem NÃO é escondido junto: ele só desce para o lugar que
    // o rodapé desocupou. É o controle que precisa sobreviver ao recolhimento.
    assert.doesNotMatch(r.body, /body\.quieto \.exec-auto\{[^}]*(visibility:hidden|opacity:0)/);
    assert.match(r.body, /body\.quieto \.exec-auto\{bottom:/);
    // Rolar não conta como atividade — se contasse, a rolagem automática
    // seguraria a casca aberta para sempre.
    assert.ok(!/addEventListener\('scroll',mostrarCasca/.test(r.body));
    assert.ok(r.body.includes("addEventListener('pointerdown',mostrarCasca"));
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
test('a biblioteca busca por nome, tema e cantor, cada um no seu campo', async () => {
  await comApp(async (app) => {
    const r = await app.inject({ method: 'GET', url: '/musicas' });
    assert.equal(r.statusCode, 200);
    // Cada item carrega, separado, o que cada campo filtra.
    for (const m of rep.todas) {
      assert.ok(r.body.includes(`data-tom-origem="${m.tom}"`), `faltou o tom de ${m.slug}`);
      assert.ok(r.body.includes(`data-titulo="${esc(m.titulo)}"`), `faltou o título de ${m.slug}`);
      assert.ok(r.body.includes(`data-artista="${esc(m.artista)}"`), `faltou o artista de ${m.slug}`);
    }
    for (const chave of ['titulo', 'tema', 'artista']) {
      assert.ok(r.body.includes(`data-campo="${chave}"`), `faltou o campo de busca por ${chave}`);
    }
    const tons = [...new Set(rep.todas.map((m) => m.tom))];
    for (const t of tons) {
      assert.ok(r.body.includes(`data-tom-filtro="${t}"`), `faltou o chip de ${t}`);
    }
    // O tema é LISTA, não campo de texto: o vocabulário é fechado
    // (`src/temas.ts`), e digitar só oferece o erro de grafia.
    assert.match(r.body, /<select class="campo campo-select" data-filtro=lista data-campo="tema"/);
    assert.ok(!/<input[^>]*data-campo="tema"/.test(r.body), 'o tema ainda é campo de texto');

    assert.ok(r.body.includes('<option value="">Todos os temas</option>'), 'faltou o "todos"');

    // Este repertório é o JSON de 13 músicas, que não tem `temas:`. Então aqui
    // a exigência é a inversa e vale a pena: nenhuma opção de tema pode
    // aparecer. A lista se monta do que o acervo tem, não do vocabulário — a
    // cobertura contra música de verdade está em `tests/temasBiblioteca.test.ts`.
    for (const t of TEMAS_CANONICOS) {
      assert.ok(!r.body.includes(`<option value="|${esc(t)}|"`), `${t} virou opção sem música`);
    }
  });
});

test('/buscar não existe mais: a busca é a própria biblioteca', async () => {
  await comApp(async (app) => {
    const r = await app.inject({ method: 'GET', url: '/buscar' });
    assert.equal(r.statusCode, 404);
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

// ------------------------------------------------------ criar culto
test('nomeDeCultoNovo segue a convenção — e descarta o ano, que a convenção não tem', () => {
  assert.equal(nomeDeCultoNovo('2026-09-14'), '14SET');
  assert.equal(nomeDeCultoNovo('2026-09-14', 'Noite'), '14SET_Noite');
  assert.equal(nomeDeCultoNovo('2026-01-05', 'Manha'), '05JAN_Manha');
  // Período fora do vocabulário não vira sufixo livre: o nome vai para a URL
  // e para a chave do rascunho.
  assert.equal(nomeDeCultoNovo('2026-09-14', 'Madrugada'), '14SET');
  for (const ruim of ['', '14/09/2026', '2026-13-01', '2026-09-32', 'hoje']) {
    assert.equal(nomeDeCultoNovo(ruim), null, `aceitou ${ruim}`);
  }
});

test('cultoNovo rotula pela convenção e recusa nome que não sabe ler', () => {
  const c = cultoNovo('14SET_Noite', []);
  assert.equal(c?.rotulo, 'Culto de 14 de setembro');
  assert.equal(c?.periodo, 'Noite');
  assert.equal(c?.novo, true);
  assert.equal(cultoNovo('Ensaio', []), null);
});

test('a agenda traz o modal de novo culto, com nome, data, período, tema e setlist', async () => {
  await comApp(async (app) => {
    const r = await app.inject({ method: 'GET', url: '/' });
    assert.equal(r.statusCode, 200);
    assert.ok(r.body.includes('<dialog class=modal id=dlg-culto'), 'faltou o modal');
    assert.ok(r.body.includes('action="/culto/novo"'), 'faltou o formulário');
    assert.ok(r.body.includes('method=get'), 'o formulário tem que ser navegação, não fetch');
    assert.ok(r.body.includes('<b>Novo culto</b>'), 'o botão é "Novo culto"');
    // Ação secundária: o caminho normal é clicar no domingo da grade, e por
    // isso "Novo culto" é um card de ação rápida, não o CTA da página.
    assert.ok(r.body.includes('class=acoes-rapidas'), 'faltou a faixa de ações rápidas');
    for (const campo of ['name=nome', 'type=date name=data', 'name=periodo', 'name=tema', 'name=musicas']) {
      assert.ok(r.body.includes(campo), `faltou ${campo}`);
    }
    // Período oferece manhã, tarde e noite, nessa ordem — a ordem do dia — e
    // é marcável: dois cultos no mesmo dia continuam sendo dois cultos, mas a
    // mesma setlist pode servir aos dois, e digitá-la duas vezes é trabalho
    // que o produto poupa.
    // Dentro do modal: o formulário sai duas vezes (modal e <noscript>).
    const modal = r.body.slice(r.body.indexOf('<dialog'), r.body.indexOf('</dialog>'));
    const opcoes = [...modal.matchAll(/type=checkbox name=periodo value="(\w+)"/g)].map((m) => m[1]);
    assert.deepEqual(opcoes, ['Manha', 'Tarde', 'Noite']);
    assert.ok(modal.includes('>Manhã</span>'), 'o rótulo do período sai acentuado');
    // `Sexta` existe no acervo (28AGO_Sexta) e continua sendo lida, mas não é
    // oferecida: o formulário não é o vocabulário de leitura.
    assert.ok(!r.body.includes('>Sexta<'), 'Sexta não deveria estar no formulário');
    // `<dialog>` não abre sem JavaScript: o formulário tem que estar na
    // página também, ou abrir culto vira a única coisa que exige script.
    const noscript = r.body.slice(r.body.indexOf('<noscript>'), r.body.indexOf('</noscript>'));
    assert.ok(noscript.includes('action="/culto/novo"'), 'faltou o formulário sem JS');
    assert.ok(r.body.includes('id=abrir-culto type=button hidden'), 'o botão do modal nasce escondido');
  });
});

test('abrir culto é montar a URL — o servidor não guarda nada', async () => {
  await comApp(async (app) => {
    const r = await app.inject({ method: 'GET', url: '/culto/novo?data=2026-09-14&periodo=Noite' });
    assert.equal(r.statusCode, 302);
    assert.equal(r.headers.location, '/culto/novo/14SET_Noite?d=2026-09-14');

    // Duas vezes a mesma data dá o mesmo culto: o nome é a identidade, e o
    // segundo "abrir" reabre o primeiro em vez de duplicá-lo.
    const outra = await app.inject({ method: 'GET', url: '/culto/novo?data=2026-09-14&periodo=Noite' });
    assert.equal(outra.headers.location, r.headers.location);

    // Nome e tema não cabem na convenção do nome: viajam na query, como a
    // setlist, porque é o link que atravessa para o celular.
    const comNome = await app.inject({
      method: 'GET',
      url: '/culto/novo?data=2026-09-14&periodo=Noite&nome=Culto da Família&tema=Gratidão',
    });
    const destino = new URL(comNome.headers.location as string, 'http://x');
    assert.equal(destino.pathname, '/culto/novo/14SET_Noite');
    assert.equal(destino.searchParams.get('titulo'), 'Culto da Família');
    assert.equal(destino.searchParams.get('tema'), 'Gratidão');
    assert.equal(destino.searchParams.get('d'), '2026-09-14');
  });
});

test('o nome e o tema aparecem no painel e sobrevivem ao primeiro clique', async () => {
  await comApp(async (app) => {
    const m = rep.todas[0]!;
    const q = 'titulo=Culto+da+Fam%C3%ADlia&tema=Gratid%C3%A3o&d=2026-09-14';
    const r = await app.inject({ method: 'GET', url: `/culto/novo/14SET_Noite?${q}` });
    assert.equal(r.statusCode, 200);
    assert.ok(r.body.includes('<h1>Culto da Família</h1>'), 'o nome escrito é o título da tela');
    // Com ano informado o rótulo pode dizer o ano; a convenção do nome não tem.
    assert.ok(r.body.includes('Culto de 14 de setembro de 2026'));
    assert.ok(r.body.includes('Gratidão'));
    // Todo link do painel carrega a identidade junto com a ordem.
    assert.ok(
      r.body.includes(`titulo=Culto+da+Fam%C3%ADlia&amp;tema=Gratid%C3%A3o&amp;d=2026-09-14&amp;ordem=${m.slug}`),
      'o link de adicionar música perdeu o nome/tema/data',
    );
  });
});

test('o período é obrigatório: dois cultos no mesmo dia são dois cultos', async () => {
  await comApp(async (app) => {
    const r = await app.inject({ method: 'GET', url: '/culto/novo?data=2026-09-20' });
    assert.equal(r.statusCode, 400);
    assert.ok(r.body.includes('Escolha ao menos um período do culto.'));
    // O que já estava escrito continua na tela — errar o período não pode
    // custar a setlist digitada.
    const comSetlist = await app.inject({
      method: 'GET',
      url: `/culto/novo?data=2026-09-20&musicas=${encodeURIComponent('QUEBRANTADO')}`,
    });
    assert.equal(comSetlist.statusCode, 400);
    assert.ok(comSetlist.body.includes('QUEBRANTADO</textarea>'));
  });
});

test('sair com alteração não salva pergunta antes — e editar não conta como sair', async () => {
  await comApp(async (app) => {
    const r = await app.inject({
      method: 'GET',
      url: '/culto/novo/20SET_Manha?d=2026-09-20&ordem=quebrantado:G',
    });
    assert.ok(r.body.includes('id=dlg-sair'), 'faltou o aviso de sair sem salvar');
    assert.ok(r.body.includes('Sair sem salvar?'));
    // Três saídas: continuar, sair perdendo o carimbo, ou salvar e sair.
    for (const b of ['id=sair-cancelar', 'id=sair-descartar', 'id=sair-salvar']) {
      assert.ok(r.body.includes(b), `faltou ${b}`);
    }
    // Trocar tom, reordenar e adicionar são links para o próprio painel —
    // avisar a cada um seria alarme que se aprende a ignorar. Iniciar o culto
    // também passa: a setlist viaja no link.
    assert.ok(r.body.includes('u.pathname===location.pathname||u.pathname===EXEC'));
    assert.ok(r.body.includes('"/executar/novo/20SET_Manha"'));

    // O culto do repertório não tem o que salvar, logo não tem o que avisar.
    const tocado = await app.inject({ method: 'GET', url: `/culto/${CULTO}` });
    assert.ok(!tocado.body.includes('id=dlg-sair'));
  });
});

test('o culto novo não tem ordem canônica — senão o rascunho é apagado ao voltar', async () => {
  await comApp(async (app) => {
    const ordem = 'quebrantado:G,teu-toque:Bb';
    const r = await app.inject({
      method: 'GET',
      url: `/culto/novo/20SET_Manha?d=2026-09-20&ordem=${encodeURIComponent(ordem)}`,
    });
    // O script guarda o rascunho com `ordem === CANONICA ? apagar : guardar`.
    // Com a setlist atual como "canônica", guardar virava apagar — e a
    // setlist salva sumia ao voltar para a agenda.
    assert.ok(r.body.includes('var CANONICA="";'), 'o culto novo não pode ter ordem canônica');
    assert.ok(!r.body.includes(`var CANONICA="${ordem}"`));

    // O culto do repertório continua tendo: é a ordem em que foi tocado.
    const tocado = await app.inject({ method: 'GET', url: `/culto/${CULTO}` });
    assert.ok(tocado.body.includes(`var CANONICA="${CANONICA}";`));
  });
});

test('salvar culto é do culto aberto na tela, e diz onde salva', async () => {
  await comApp(async (app) => {
    const novo = await app.inject({ method: 'GET', url: '/culto/novo/20SET_Manha?d=2026-09-20' });
    assert.ok(novo.body.includes('id=salvar'), 'faltou o botão de salvar');
    assert.ok(novo.body.includes('>Salvar culto</button>'));
    // Sem JS não há onde guardar: o botão nasce escondido e o script o mostra.
    assert.ok(novo.body.includes('id=salvar type=button hidden'));
    assert.ok(novo.body.includes('id=estado-salvo'), 'faltou o estado do salvamento');

    // O culto do repertório não tem o que salvar: é dado versionado, e um
    // botão ali prometeria escrita que não existe.
    const doRepertorio = await app.inject({ method: 'GET', url: `/culto/${CULTO}` });
    assert.ok(!doRepertorio.body.includes('id=salvar'), 'o culto tocado não deveria ter salvar');
  });
});

test('a data só vale se concordar com o nome do culto — o nome é a identidade', async () => {
  await comApp(async (app) => {
    // `?d=` de outro dia (link editado à mão) é descartado, e o rótulo volta
    // a ser o da convenção, sem ano.
    const r = await app.inject({ method: 'GET', url: '/culto/novo/14SET_Noite?d=2026-03-02' });
    assert.ok(r.body.includes('Culto de 14 de setembro'));
    assert.ok(!r.body.includes('de 2026'), 'mostrou uma data que não é a do culto aberto');
  });
});

test('data inválida volta para a página de cultos com o motivo, não com 500', async () => {
  await comApp(async (app) => {
    const r = await app.inject({ method: 'GET', url: '/culto/novo?data=' });
    assert.equal(r.statusCode, 400);
    assert.ok(r.body.includes('Escolha uma data válida'));
    assert.ok(r.body.includes('action="/culto/novo"'), 'o formulário continua na tela');
  });
});

test('o culto novo abre vazio e monta a setlist pelos mesmos links do repertório', async () => {
  await comApp(async (app) => {
    const vazio = await app.inject({ method: 'GET', url: '/culto/novo/14SET_Noite' });
    assert.equal(vazio.statusCode, 200);
    assert.ok(vazio.body.includes('Culto de 14 de setembro'));
    assert.ok(vazio.body.includes('Nenhuma música ainda'));
    // Sem música não há o que executar: a tela oferece adicionar.
    assert.ok(vazio.body.includes('Adicionar música'));

    const m = rep.todas[0]!;
    assert.ok(
      vazio.body.includes(`/culto/novo/14SET_Noite?ordem=${m.slug}%3A${encodeURIComponent(m.tom)}`),
      'o link de adicionar tem que apontar para o próprio culto novo',
    );

    const com = await app.inject({
      method: 'GET',
      url: `/culto/novo/14SET_Noite?ordem=${m.slug}:${encodeURIComponent(m.tom)}&atual=0`,
    });
    assert.equal(com.statusCode, 200);
    assert.ok(com.body.includes(m.titulo));
    assert.ok(com.body.includes('Culto novo'), 'não é "setlist alterada": não há ordem tocada');
    assert.ok(!com.body.includes('Restaurar ordem do culto'), 'não há ordem para restaurar');
    // Com uma música só, ainda dá para tirar: montar é errar e desfazer.
    assert.ok(com.body.includes('aria-label="Tirar do culto"'));
  });
});

test('o culto novo executa pelo link, e setlist vazia volta para a preparação', async () => {
  await comApp(async (app) => {
    const m = rep.todas[0]!;
    const ordem = `${m.slug}:${m.tom}`;
    const r = await app.inject({
      method: 'GET',
      url: `/executar/novo/14SET_Noite?ordem=${encodeURIComponent(ordem)}&i=0`,
    });
    assert.equal(r.statusCode, 200);
    assert.ok(r.body.includes(m.titulo));
    assert.ok(r.body.includes('/culto/novo/14SET_Noite'), 'o "voltar" tem que ir para o culto novo');

    const semMusica = await app.inject({ method: 'GET', url: '/executar/novo/14SET_Noite' });
    assert.equal(semMusica.statusCode, 302);
    assert.equal(semMusica.headers.location, '/culto/novo/14SET_Noite');
  });
});

test('nome fora da convenção não vira culto — 404 em vez de rótulo cru na tela', async () => {
  await comApp(async (app) => {
    for (const url of ['/culto/novo/Ensaio', '/executar/novo/Ensaio']) {
      const r = await app.inject({ method: 'GET', url });
      assert.equal(r.statusCode, 404, url);
    }
  });
});

test('criar culto não atropela o culto do repertório: as rotas são distintas', async () => {
  await comApp(async (app) => {
    const c = rep.cultos[0]!;
    const doRepertorio = await app.inject({ method: 'GET', url: `/culto/${encodeURIComponent(c.nome)}` });
    assert.equal(doRepertorio.statusCode, 200);
    assert.ok(doRepertorio.body.includes('Ordem do culto'), 'o culto tocado continua com a ordem canônica');
    // E o mesmo nome sob /novo/ é outro culto, com rascunho em outra chave.
    const novo = await app.inject({ method: 'GET', url: `/culto/novo/${encodeURIComponent(c.nome)}` });
    assert.equal(novo.statusCode, 200);
    assert.ok(novo.body.includes('Nenhuma música ainda'));
    assert.ok(novo.body.includes("'cifras:culto:'+\"novo/\""));
  });
});

test('a agenda lista o que vem aí a partir do aparelho — o servidor não sabe', async () => {
  await comApp(async (app) => {
    const r = await app.inject({ method: 'GET', url: '/' });
    // Sai vazia do servidor: quem preenche é o script, com o índice local.
    assert.ok(r.body.includes('id=futuros-lista'), 'faltou a lista de próximos');
    // Seção vazia nasce escondida: a home não mostra caixa vazia explicando
    // que está vazia — quem não marcou nada tem a grade do mês.
    assert.ok(r.body.includes('<section class=lista-cultos id=futuros hidden>'));
    assert.ok(r.body.includes('cifras:cultos-novos'), 'faltou o script que lê o índice');
    // E o painel do culto novo é quem escreve nesse índice, com a data
    // completa — sem ano não dá para dizer o que é futuro.
    const painel = await app.inject({ method: 'GET', url: '/culto/novo/14SET_Noite?d=2026-09-14' });
    assert.ok(painel.body.includes('cifras:cultos-novos'));
    assert.ok(painel.body.includes('data:"2026-09-14"'));
  });
});

// ------------------------------------------------------------ home
test('a home deriva os domingos do mês do calendário, não de cadastro', () => {
  // Setembro de 2026 tem quatro domingos (06, 13, 20, 27); março tem cinco
  // (01, 08, 15, 22, 29). Nada de mês fixo no código: muda o relógio, muda a
  // grade — inclusive a quantidade de células.
  const set = paginaAgenda(rep, { agora: new Date(2026, 8, 5) });
  const dias = (html: string) => [...html.matchAll(/<b>(\d\d\/\d\d)<\/b>/g)].map((m) => m[1]);
  assert.deepEqual(dias(set), ['06/09', '13/09', '20/09', '27/09']);
  assert.ok(set.includes('>setembro de 2026<'), 'faltou o mês por extenso');

  const mar = paginaAgenda(rep, { agora: new Date(2026, 2, 3) });
  assert.deepEqual(dias(mar), ['01/03', '08/03', '15/03', '22/03', '29/03']);
  assert.ok(mar.includes('>março de 2026<'));
});

test('o domingo já tocado sai como realizado; o pendente abre o culto com a data pronta', () => {
  const html = paginaAgenda(rep, { agora: new Date(2026, 8, 5) });
  // 06SET está no repertório — foi tocado. O casamento é por dia e mês, que é
  // tudo o que o nome do culto carrega (ver site/cultos.ts).
  assert.ok(
    html.includes('href="/culto/06SET" data-dia data-data="2026-09-06" data-estado=realizado'),
    'o domingo tocado tem que levar ao culto tocado',
  );
  // Pendente é link de verdade (funciona sem JS) e já leva a data: clicar em
  // 20/09 e ter que digitar 20/09 seria trabalho inventado.
  assert.ok(html.includes('href="/culto/novo?data=2026-09-20" data-dia'));
  assert.ok(html.includes('data-abrir-culto data-data="2026-09-20"'));
  // Um de quatro, e a barra acompanha.
  assert.ok(html.includes('>1 de 4 preparados<'), 'faltou a contagem do mês');
  assert.ok(html.includes('id=mes-barra style="width:25%"'));
});

test('o próximo culto é o CTA da home, e não inventa horário nem músicos', () => {
  // 14/09/2026 é segunda: o próximo domingo é 20/09, que ninguém preparou.
  const html = paginaAgenda(rep, { agora: new Date(2026, 8, 14) });
  assert.ok(html.includes('>Domingo, 20 de setembro<'), 'faltou o próximo culto');
  assert.ok(html.includes('id=prox-acao'), 'faltou o CTA');
  assert.ok(html.includes('>Preparar culto '), 'o CTA principal é preparar');
  assert.ok(html.includes('>Ainda não preparado<'));

  // Domingo continua sendo o próximo domingo quando hoje é domingo — e 06SET
  // está no repertório, então o cartão diz que está pronto e leva ao culto.
  // Dizer "ainda não preparado" ao lado da grade que o mostra realizado seria
  // a home se contradizendo em dois cartões vizinhos.
  const noDomingo = paginaAgenda(rep, { agora: new Date(2026, 8, 6) });
  assert.ok(noDomingo.includes('data-iso="2026-09-06"'));
  assert.ok(noDomingo.includes('>Culto preparado<'));
  assert.ok(noDomingo.includes('id=prox-acao href="/culto/06SET"'), 'o CTA abre o culto');

  // Horário e número de músicos NÃO existem no modelo. O cartão não os mostra
  // — encher cartão com dado inventado é o erro que este teste tranca.
  const cartao = html.slice(html.indexOf('<section class="cartao proximo"'), html.indexOf('</section>', html.indexOf('id=proximo')));
  const texto = cartao.replace(/<[^>]*>/g, ' ');
  assert.ok(!/\d\dh\b|\d\d:\d\d/.test(texto), 'a home não tem horário: o dado não existe');
  assert.ok(!texto.includes('músicos'), 'a home não tem contagem de músicos');
});

test('a home trata o dia com mais de um culto: um dia, vários períodos', () => {
  // Manhã e noite do mesmo domingo são DOIS cultos. Quem monta a home a partir
  // do índice do aparelho precisa listá-los, não escolher um — antes o outro
  // ficava inalcançável pela grade do mês.
  //
  // O estado desses cultos mora no `localStorage`, então quem os desenha é o
  // script da página (progressive enhancement, como o resto da home). Este
  // teste tranca o contrato do script; o comportamento na tela foi conferido
  // no navegador.
  const html = paginaAgenda(rep, { agora: new Date(2026, 8, 5) });
  const script = html.slice(html.indexOf("var porData={}"));

  // A chave do dia guarda a LISTA — foi trocar isto que consertou o bug.
  assert.ok(
    /porData\[c\.data\]=porData\[c\.data\]\|\|\[\]\)\.push/.test(script),
    'o dia tem que acumular os cultos, não ficar só com um',
  );
  // Na ordem do dia, que é como a agenda fala.
  assert.ok(script.includes("var ORDEM_DIA=['Manhã','Tarde','Noite']"));
  // O dia só é "preparado" quando todo culto dele tem setlist: com a manhã
  // pronta e a noite vazia ainda falta trabalho.
  assert.ok(script.includes('faltando===0'), 'dia com culto vazio não é preparado');
  // E cada período vira um link de verdade.
  assert.ok(script.includes("fita.className='periodos-dia'"), 'faltou a fita de períodos');
  assert.ok(script.includes('p.href=x.href'), 'cada período precisa do link dele');

  // UM cartão: o dia em cima, os períodos embaixo divididos ao meio. A moldura
  // (estado e anel de hoje) é do cartão, porque a célula de dentro perdeu a
  // borda — sem isto o domingo de dois cultos não mostraria o estado do dia.
  assert.ok(script.includes("caixa.setAttribute('data-estado',estado)"),
    'o cartão tem que carregar o estado do dia');
  assert.ok(script.includes("caixa.setAttribute('data-hoje-dia','')"),
    'o anel de hoje tem que passar para o cartão');
  // O topo diz quantos cultos o dia tem; o "quantos prontos" já está nas
  // metades (verde/apagado) e repeti-lo seria ruído.
  assert.ok(script.includes("lista.length+' cultos'"), 'o topo conta os cultos do dia');

  // E o CSS que faz o cartão ser um só, dividido ao meio.
  assert.ok(html.includes('.dia-varios{'), 'faltou o cartão do dia com vários cultos');
  // As duas réguas precisam ser linha de verdade, não `border:0` — é o que faz
  // "um cartão dividido" se ler em vez de um bloco só.
  assert.ok(/\.periodos-dia\{[^}]*border-top:1px solid/.test(html),
    'faltou a régua entre o dia e as metades');
  assert.ok(/\.periodos-dia a\+a\{border-left:1px solid/.test(html),
    'faltou a divisória entre manhã e noite');
});

test('o culto irmão nasce com a setlist que foi criada junto', () => {
  // "Mesma setlist, um por período" é a promessa da criação. Sem gravar a
  // chave do irmão, o culto da noite nascia vazio no aparelho e a agenda o
  // mostrava como "setlist vazia" — contradizendo a tela que acabou de criá-lo.
  const culto = cultoNovo('20SET_Manha', [], { data: '2026-09-20' })!;
  const irmao = cultoNovo('20SET_Noite', [], { data: '2026-09-20' })!;
  const html = paginaCulto(rep, culto, [], 0, { irmaos: [irmao] });
  assert.ok(
    html.includes("if(ordem)por('cifras:culto:novo/'+ir.nome,ordem)"),
    'a setlist tem que ser gravada também para o irmão',
  );
  // Mas só na criação: irmão que já existia pode ter setlist própria, e
  // "saíram iguais" não autoriza apagá-la.
  const bloco = html.slice(html.indexOf('for(var j=IRMAOS.length-1'));
  assert.ok(bloco.indexOf('if(!tem){') < bloco.indexOf("por('cifras:culto:novo/'"),
    'a gravação tem que estar dentro do "se ainda não existe"');
});

test('a home mostra os últimos cultos com dado real, e sem ano inventado', () => {
  const html = paginaAgenda(rep, { agora: new Date(2026, 8, 5) });
  assert.ok(html.includes('<table class=tabela-cultos'), 'faltou a tabela');
  assert.ok(html.includes('>Últimos cultos<'));
  assert.ok(html.includes('href="/cultos">Ver todos'), 'faltou o "Ver todos"');
  const linhas = [...html.matchAll(/<td class=data>(\d\d\/\d\d)<\/td>/g)].map((m) => m[1]);
  assert.deepEqual(linhas, rep.cultos.slice(0, 5).map((c) => {
    const dia = c.ordinal % 100;
    return `${String(dia).padStart(2, '0')}/${String((c.ordinal - dia) / 100).padStart(2, '0')}`;
  }));
  // O nome do culto não tem ano (site/cultos.ts) — a tabela não completa com um.
  assert.ok(!/\d\d\/\d\d\/\d{4}/.test(html), 'a data não pode ganhar ano que o dado não tem');
  const musicas = rep.cultos[0]!.entradas.length;
  assert.ok(html.includes(`<td class=qtd>${musicas} músicas</td>`), 'a contagem vem do repertório');
});

test('toda tela de preparação tem volta pelo topo — a marca é link para o início', async () => {
  await comApp(async (app) => {
    for (const url of ['/configuracoes', '/perfil', '/musicas', '/cultos', '/culto/06SET']) {
      const r = await app.inject({ method: 'GET', url });
      // As duas marcas (trilho do computador e barra do celular) levam ao
      // início. Configurações não tem aba própria: quem entrou por ela
      // procurava a saída no topo, onde só havia a engrenagem que o trouxe.
      assert.equal(
        r.body.match(/class=marca href="\/"/g)?.length,
        2,
        `${url}: as duas marcas têm que levar ao início`,
      );
    }
  });
});

test('o tema se troca da tela principal, sem passar por Configurações', async () => {
  await comApp(async (app) => {
    const home = (await app.inject({ method: 'GET', url: '/' })).body;
    // Dois botões: o do cabeçalho (computador) e o da barra de topo (celular).
    // Um está sempre escondido por CSS, e o script liga os dois.
    assert.equal(home.match(/data-trocar-tema type=button/g)?.length, 2);
    assert.ok(home.includes('cifras:tema'), 'a escolha tem que ser guardada no aparelho');
    // O ícone mostra a ação e troca por CSS — sem script, sem piscar.
    assert.ok(home.includes(':root[data-theme=dark] .tema-btn .ico-sol{display:block}'));
    // Sem JavaScript ele não faria nada: nasce escondido, como o de novo culto.
    assert.ok(home.includes('data-trocar-tema type=button hidden'));

    // O botão acompanha todas as telas de preparação pela barra de topo.
    for (const url of ['/musicas', '/cultos', '/configuracoes']) {
      const r = await app.inject({ method: 'GET', url });
      assert.ok(r.body.includes('data-trocar-tema'), `${url} ficou sem troca de tema`);
    }
    // Automático continua sendo escolha de Configurações, e só dela.
    const cfg = (await app.inject({ method: 'GET', url: '/configuracoes' })).body;
    assert.ok(cfg.includes('data-tema=auto'), 'o terceiro estado mora em Configurações');
    assert.ok(!home.includes('data-tema=auto'), 'a home não passeia por três estados');
  });
});

test('o chão iluminado é da home, e não vai para o papel', async () => {
  await comApp(async (app) => {
    const home = await app.inject({ method: 'GET', url: '/' });
    assert.ok(home.body.includes('<body class="home">'), 'a home carrega o próprio chão');
    // Sem cor nova e sem o acento: o DESIGN.md reserva o acento para ação,
    // seleção e estado — "nunca em decoração". O chão é só o neutro com luz.
    const receita = home.body.slice(home.body.indexOf('body.home{--chao-luz'), home.body.indexOf('.home-topo{'));
    assert.ok(!receita.includes('var(--acento'), 'o acento não decora o fundo');
    assert.ok(home.body.includes('body.home{background:none!important}'), 'no papel o chão sai');

    // As telas densas continuam no chão chapado: luz é da tela que tem hero.
    for (const url of ['/musicas', '/cultos', '/culto/06SET']) {
      const r = await app.inject({ method: 'GET', url });
      assert.ok(!r.body.includes('<body class="home">'), `${url} não devia ter o chão da home`);
    }
  });
});

test('a home não explica mais como o servidor guarda — isso é assunto de Configurações', async () => {
  await comApp(async (app) => {
    const r = await app.inject({ method: 'GET', url: '/' });
    const miolo = r.body.slice(r.body.indexOf('<main'), r.body.indexOf('</main>'));
    assert.ok(!miolo.includes('o servidor não guarda nada'), 'texto técnico fora da home');
    assert.ok(miolo.includes('Preparado para o próximo culto?'));
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
