/**
 * O site, pelas rotas de verdade (`app.inject`, sem porta).
 *
 * O critério de aceitação desta etapa é comportamental, não estético: as 13
 * músicas abrem em todos os tons oferecidos, a linha posicional continua com
 * o acorde sobre a sílaba, o padrão visual sai intacto do emissor, e a
 * impressão continua A4 com quebra de página.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { criarServidor, configDoAmbiente } from '../site/servidor.ts';
import { carregarRepertorio } from '../site/repertorio.ts';
import { TONS, tomValido } from '../site/tons.ts';
import { documento, escrever } from '../gerador-ts/html.ts';

process.env.CIFRAS_LOG = 'silent'; // o log do Fastify não é a saída do teste

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

// ------------------------------------------------------------------ rotas
test('GET / é a agenda: o que vem aí, abrir culto, e o último tocado a um toque', async () => {
  await comApp(async (app) => {
    const r = await app.inject({ method: 'GET', url: '/' });
    assert.equal(r.statusCode, 200);
    assert.ok(r.body.includes('id=abrir-culto'), 'faltou o botão de abrir culto');
    assert.ok(r.body.includes('Próximos cultos'), 'faltou a lista do que vem aí');
    // O culto tocado continua a um toque — era para onde `/` levava antes.
    assert.ok(
      r.body.includes(`href="/culto/${encodeURIComponent(rep.cultos[0]!.nome)}"`),
      'faltou o último culto tocado',
    );
  });
});

test('GET /musicas lista as 13 músicas, com título e artista buscáveis', async () => {
  await comApp(async (app) => {
    const r = await app.inject({ method: 'GET', url: '/musicas' });
    assert.equal(r.statusCode, 200);
    assert.match(r.headers['content-type'] as string, /text\/html/);
    for (const m of rep.todas) {
      assert.ok(r.body.includes(m.titulo), `faltou ${m.titulo}`);
      assert.ok(r.body.includes(`/musica/${m.slug}`), `faltou link de ${m.slug}`);
    }
    assert.ok(r.body.includes(rep.todas[0]!.artista));
  });
});

test('GET /musica/:slug abre no tom de origem quando não se pede tom', async () => {
  await comApp(async (app) => {
    for (const m of rep.todas) {
      const r = await app.inject({ method: 'GET', url: `/musica/${m.slug}` });
      assert.equal(r.statusCode, 200, m.slug);
      assert.ok(r.body.includes(`<b>Tom: ${m.tom}</b>`), `${m.slug} não abriu em ${m.tom}`);
    }
  });
});

test('GET /musica/:slug?tom=X: as 13 músicas abrem em TODOS os tons oferecidos, sem erro', async () => {
  await comApp(async (app) => {
    for (const m of rep.todas) {
      for (const { tom } of TONS) {
        const r = await app.inject({ method: 'GET', url: `/musica/${m.slug}?tom=${encodeURIComponent(tom)}` });
        assert.equal(r.statusCode, 200, `${m.slug} -> ${tom}`);
        assert.ok(r.body.includes(`<b>Tom: ${tom}</b>`), `${m.slug} -> ${tom}: cabeçalho errado`);
      }
    }
  });
});

test('tom desconhecido cai no tom de origem em vez de dar erro', async () => {
  await comApp(async (app) => {
    for (const pedido of ['H', 'Dó', 'Fb', '', '../etc/passwd', 'C; rm -rf /']) {
      const r = await app.inject({ method: 'GET', url: `/musica/vitorioso-es?tom=${encodeURIComponent(pedido)}` });
      assert.equal(r.statusCode, 200, pedido);
      assert.ok(r.body.includes('<b>Tom: G</b>'), `${pedido} deveria cair no tom de origem`);
    }
    assert.equal(tomValido('H'), null);
    assert.equal(tomValido('F#'), 'F#');
  });
});

test('slug inexistente devolve 404, não 500', async () => {
  await comApp(async (app) => {
    const r = await app.inject({ method: 'GET', url: '/musica/nao-existe' });
    assert.equal(r.statusCode, 404);
    assert.ok(r.body.includes('Não encontrada'));
    const outra = await app.inject({ method: 'GET', url: '/qualquer/coisa' });
    assert.equal(outra.statusCode, 404);
  });
});

test('GET /saude responde para o systemd', async () => {
  await comApp(async (app) => {
    const r = await app.inject({ method: 'GET', url: '/saude' });
    assert.equal(r.statusCode, 200);
    assert.deepEqual(JSON.parse(r.body).ok, true);
    assert.equal(JSON.parse(r.body).musicas, 13);
  });
});

// --------------------------------------------------------- não indexar
test('toda página traz noindex/nofollow, na meta e no cabeçalho', async () => {
  await comApp(async (app) => {
    const paginas = [
      '/musicas',
      '/buscar',
      '/cultos',
      '/configuracoes',
      '/perfil',
      '/culto/06SET',
      '/executar/06SET',
      '/musica/vitorioso-es',
      '/musica/nao-existe',
    ];
    for (const url of [...paginas, '/']) {
      const r = await app.inject({ method: 'GET', url });
      assert.equal(r.headers['x-robots-tag'], 'noindex, nofollow', url);
    }
    for (const url of paginas) {
      const r = await app.inject({ method: 'GET', url });
      assert.ok(r.body.includes('name="robots" content="noindex, nofollow"'), url);
    }
  });
});

test('robots.txt bloqueia tudo', async () => {
  await comApp(async (app) => {
    const r = await app.inject({ method: 'GET', url: '/robots.txt' });
    assert.equal(r.statusCode, 200);
    assert.match(r.headers['content-type'] as string, /text\/plain/);
    assert.equal(r.body, 'User-agent: *\nDisallow: /\n');
  });
});

// ------------------------------------------------------- padrão visual
test('padrão visual preservado: as cores e a Arial vêm do emissor, não reimplementadas', async () => {
  await comApp(async (app) => {
    const r = await app.inject({ method: 'GET', url: '/musica/vitorioso-es' });
    for (const marca of [
      'font-family:Arial,sans-serif',
      '.c{color:#ff6600}'.replace('.c{', '.c{'), // laranja da cifra
      '#0000ff', // azul dos rótulos
      '#9900ff', // roxo das anotações
      '#1b1b1b', // escuro da letra
    ]) {
      assert.ok(r.body.includes(marca), `sumiu do CSS: ${marca}`);
    }
    // O bloco da cifra é literalmente o que o emissor produz.
    const m = rep.porSlug('vitorioso-es')!;
    assert.ok(r.body.includes(escrever(m, m.tom, false, { momento: false })));
  });
});

test('impressão continua A4 com quebra de página entre músicas', async () => {
  await comApp(async (app) => {
    const r = await app.inject({ method: 'GET', url: '/musica/vitorioso-es' });
    assert.ok(r.body.includes('@page{size:A4;margin:72pt}'), 'sumiu o A4');
    assert.ok(r.body.includes('.pb{page-break-before:always}'), 'sumiu a quebra de página');
    // O cromo de tela não pode vazar para o papel: a casca de navegação, os
    // controles e o cromo da execução são escondidos na impressão.
    for (const classe of ['.lateral', '.abas', '.barra-topo', '.exec-topo', '.exec-rodape', '.chip']) {
      assert.ok(
        new RegExp(`@media print\\{[^}]*\\${classe}[,{]`).test(r.body),
        `${classe} não é escondido na impressão`,
      );
    }
  });

  // A quebra entre músicas é do emissor e continua valendo para vários blocos
  // (documento de culto). A tela de montagem de culto é etapa seguinte; o
  // mecanismo, não.
  const [a, b] = [rep.todas[0]!, rep.todas[1]!];
  const doc = documento([[a, a.tom], [b, b.tom]]);
  assert.equal(doc.split('class=pb').length - 1, 1, 'a 2ª música tem que começar em página nova');
});

// -------------------------------------------- momento fora do culto
test('momento NÃO aparece na página de uma música sozinha', async () => {
  const comMomento = rep.todas.filter((m) => m.momento);
  assert.ok(comMomento.length > 0, 'esperava alguma música com momento no repertório');

  await comApp(async (app) => {
    for (const m of comMomento) {
      const r = await app.inject({ method: 'GET', url: `/musica/${m.slug}` });
      assert.ok(
        !r.body.includes(`<b>${m.momento}</b>`),
        `${m.slug}: "${m.momento}" apareceu sem contexto de culto`,
      );
      assert.ok(r.body.includes(m.titulo));
    }
  });

  // Mas dentro de documento de culto ele continua saindo — é lá que faz sentido.
  const m = comMomento[0]!;
  assert.ok(documento([[m, m.tom]]).includes(`<b>${m.momento}</b>`));
});

// ------------------------------------------ linha posicional na tela
test('linha posicional: o acorde continua sobre a sílaba em todos os tons oferecidos', async () => {
  // VITORIOSO ÉS e PAI DE MULTIDÕES são as músicas com linha posicional que
  // revelaram a colisão do colunaAbsoluta. Na tela, o espaço múltiplo só
  // sobrevive como &nbsp; — se o emissor deixar de endurecer o espaço, o
  // navegador colapsa e todo acorde sai do lugar.
  await comApp(async (app) => {
    for (const slug of ['vitorioso-es', 'pai-de-multidoes']) {
      const m = rep.porSlug(slug)!;
      const posicionais = m.corpo.filter(([t]) => t === 'pos').length;
      assert.ok(posicionais > 0, `${slug} deveria ter linha posicional`);

      for (const { tom } of TONS) {
        const r = await app.inject({ method: 'GET', url: `/musica/${slug}?tom=${encodeURIComponent(tom)}` });
        assert.equal(r.statusCode, 200, `${slug} -> ${tom}`);
        assert.ok(r.body.includes('&nbsp;'), `${slug} -> ${tom}: espaço colapsaria na tela`);
        // Nenhuma linha de cifra pode conter dois espaços comuns seguidos:
        // seriam colapsados pelo navegador e o alinhamento iria embora.
        const linhas = r.body.match(/<span class=c>(.*?)<\/span>/g) ?? [];
        assert.ok(linhas.length > 0, `${slug} -> ${tom}: nenhuma linha de cifra`);
        for (const linha of linhas) {
          assert.ok(!/ {2}/.test(linha), `${slug} -> ${tom}: espaço múltiplo cru em ${linha.slice(0, 60)}`);
        }
      }
    }
  });
});

test('a cifra não quebra linha na tela — quebrar destruiria o alinhamento', async () => {
  await comApp(async (app) => {
    const r = await app.inject({ method: 'GET', url: '/musica/pai-de-multidoes' });
    assert.ok(r.body.includes('.cifra .c,.cifra .a{white-space:nowrap}'));
    assert.ok(r.body.includes('.cifra{overflow-x:auto'));
  });
});

// ------------------------------------------------ troca de tom sem recarga
test('fragmento=1 devolve só o miolo, e é o mesmo miolo da página inteira', async () => {
  await comApp(async (app) => {
    const inteira = await app.inject({ method: 'GET', url: '/musica/emaus?tom=A' });
    const frag = await app.inject({ method: 'GET', url: '/musica/emaus?tom=A&fragmento=1' });
    assert.equal(frag.statusCode, 200);
    assert.ok(!frag.body.includes('<!doctype html>'), 'fragmento não é página');
    assert.ok(inteira.body.includes(frag.body), 'o fragmento tem que ser o miolo da página');
    assert.ok(frag.body.includes('<b>Tom: A</b>'));
  });
});

test('os tons são links de verdade — sem JS a troca continua funcionando', async () => {
  await comApp(async (app) => {
    const r = await app.inject({ method: 'GET', url: '/musica/emaus' });
    for (const { tom } of TONS) {
      assert.ok(
        r.body.includes(`href="/musica/emaus?tom=${encodeURIComponent(tom)}"`),
        `faltou o link do tom ${tom}`,
      );
    }
  });
});

// ------------------------------------------------------ seletor de tom
test('o seletor oferece as duas grafias onde as duas são usadas — E->Gb e E->F# são respostas diferentes', async () => {
  const oferecidos = TONS.map((o) => o.tom);
  for (const t of ['C', 'Db', 'C#', 'D', 'Eb', 'E', 'F', 'Gb', 'F#', 'G', 'Ab', 'G#', 'A', 'Bb', 'A#', 'B']) {
    assert.ok(oferecidos.includes(t), `faltou ${t} no seletor`);
  }

  await comApp(async (app) => {
    const gb = await app.inject({ method: 'GET', url: '/musica/vitorioso-es?tom=Gb' });
    const fs = await app.inject({ method: 'GET', url: '/musica/vitorioso-es?tom=F%23' });
    assert.notEqual(gb.body, fs.body, 'Gb e F# não podem render a mesma coisa');
    assert.ok(gb.body.includes('<b>Tom: Gb</b>'));
    assert.ok(fs.body.includes('<b>Tom: F#</b>'));
  });
});

test('o tom de origem é marcado no seletor, e o tom atual também', async () => {
  await comApp(async (app) => {
    const m = rep.porSlug('vitorioso-es')!;
    const r = await app.inject({ method: 'GET', url: `/musica/${m.slug}?tom=A` });
    assert.match(r.body, new RegExp(`class="tom origem"[^>]*href="/musica/${m.slug}\\?tom=${m.tom}"`));
    assert.match(r.body, /href="\/musica\/vitorioso-es\?tom=A" aria-current="true"/);
  });
});

// ------------------------------------------------------------ configuração
test('configDoAmbiente escuta em 127.0.0.1 por padrão — o gate é o nginx', () => {
  const padrao = configDoAmbiente({} as NodeJS.ProcessEnv);
  assert.equal(padrao.host, '127.0.0.1');
  assert.equal(padrao.porta, 3000);
  assert.ok(padrao.repertorio.endsWith('repertorio.json'));

  const custom = configDoAmbiente({
    CIFRAS_PORTA: '8080',
    CIFRAS_HOST: '0.0.0.0',
    CIFRAS_REPERTORIO: '/opt/cifras/dados/repertorio.json',
  } as NodeJS.ProcessEnv);
  assert.equal(custom.porta, 8080);
  assert.equal(custom.host, '0.0.0.0');
  assert.equal(custom.repertorio, '/opt/cifras/dados/repertorio.json');
});

test('repertório ausente falha na subida, em vez de servir lista vazia', () => {
  assert.throws(() => carregarRepertorio('/caminho/que/nao/existe.json'), /não consegui ler o repertório/);
});

test('as imagens estáticas são entregues como PNG, com cache longo', async () => {
  await comApp(async (app) => {
    for (const url of ['/estatico/marca.png', '/estatico/icone.png']) {
      const r = await app.inject({ method: 'GET', url });
      assert.equal(r.statusCode, 200, url);
      assert.match(String(r.headers['content-type']), /image\/png/, url);
      assert.match(String(r.headers['cache-control']), /immutable/, url);
      // PNG de verdade, não uma página de erro devolvida com status 200
      assert.deepEqual([...r.rawPayload.subarray(0, 4)], [0x89, 0x50, 0x4e, 0x47], url);
    }
  });
});

test('o nome do produto está na aba e o ícone está declarado', async () => {
  await comApp(async (app) => {
    const html = (await app.inject({ method: 'GET', url: '/musicas' })).body;
    assert.match(html, /<title>[^<]*· Integra Music<\/title>/);
    assert.match(html, /rel=icon href="\/estatico\/icone\.png"/);
    assert.match(html, /rel="apple-touch-icon"/);
  });
});

test('a marca e o nome do produto aparecem na navegação', async () => {
  await comApp(async (app) => {
    const html = (await app.inject({ method: 'GET', url: '/musicas' })).body;
    assert.match(html, /Integra Music/);
    // A lateral e a barra do topo (celular) usam a mesma marca — trocar o
    // arquivo troca as duas.
    assert.equal(html.match(/\/estatico\/marca\.png/g)?.length, 2);
  });
});
