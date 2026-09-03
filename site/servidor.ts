/**
 * Servidor do site de cifras: leitura, renderizado no servidor, sem SPA.
 *
 * Rotas:
 *   GET /                     lista, com busca por título e artista
 *   GET /musica/:slug         cifra no tom de origem
 *   GET /musica/:slug?tom=G   cifra transposta
 *   GET /saude                healthcheck do systemd
 *   GET /robots.txt           bloqueia tudo
 *
 * **Não há autenticação aqui, de propósito.** O acervo tem letra de música
 * protegida e isto é ferramenta interna da banda: o gate é HTTP basic auth no
 * nginx (ver `deploy/`). O processo escuta em 127.0.0.1 por padrão justamente
 * para não ficar exposto sem esse gate — se mudar `CIFRAS_HOST` para 0.0.0.0,
 * o site fica aberto.
 */
import Fastify from 'fastify';
import { fileURLToPath } from 'node:url';
import { carregarRepertorio } from './repertorio.ts';
import { paginaLista, paginaMusica, paginaNaoEncontrada, fragmentoCifra } from './paginas.ts';
import { tomValido } from './tons.ts';

const RAIZ = new URL('..', import.meta.url);

export interface Config {
  porta: number;
  host: string;
  repertorio: string;
}

export function configDoAmbiente(env: NodeJS.ProcessEnv = process.env): Config {
  return {
    porta: Number(env.CIFRAS_PORTA ?? 3000),
    // 127.0.0.1: só o nginx alcança. Ver o comentário de topo.
    host: env.CIFRAS_HOST ?? '127.0.0.1',
    repertorio: env.CIFRAS_REPERTORIO ?? fileURLToPath(new URL('dados/repertorio.json', RAIZ)),
  };
}

const ROBOTS = 'User-agent: *\nDisallow: /\n';

export function criarServidor(config: Config) {
  const rep = carregarRepertorio(config.repertorio);
  const app = Fastify({ logger: { level: process.env.CIFRAS_LOG ?? 'info' } });

  // noindex também no cabeçalho: robô que ignora a meta tag costuma respeitar
  // este. Cinto e suspensório, porque o acervo não pode ser indexado.
  app.addHook('onSend', async (_req, resposta) => {
    resposta.header('X-Robots-Tag', 'noindex, nofollow');
  });

  app.get('/saude', async () => ({
    ok: true,
    musicas: rep.todas.length,
    versao: process.env.CIFRAS_VERSAO ?? null,
  }));

  app.get('/robots.txt', async (_req, resposta) => {
    resposta.type('text/plain; charset=utf-8');
    return ROBOTS;
  });

  app.get('/', async (_req, resposta) => {
    resposta.type('text/html; charset=utf-8');
    return paginaLista(rep);
  });

  app.get<{ Params: { slug: string }; Querystring: { tom?: string; fragmento?: string } }>(
    '/musica/:slug',
    async (req, resposta) => {
      const musica = rep.porSlug(req.params.slug);
      resposta.type('text/html; charset=utf-8');
      if (!musica) {
        resposta.code(404);
        return paginaNaoEncontrada();
      }
      // Tom desconhecido cai no tom de origem em vez de dar erro: o link pode
      // ter vindo de um favorito antigo, e o músico quer a cifra, não um 400.
      const tom = tomValido(req.query.tom) ?? musica.tom;
      return req.query.fragmento === '1' ? fragmentoCifra(musica, tom) : paginaMusica(musica, tom);
    },
  );

  app.setNotFoundHandler(async (_req, resposta) => {
    resposta.code(404).type('text/html; charset=utf-8');
    return paginaNaoEncontrada();
  });

  return app;
}

/** Sobe o servidor. Só roda quando este arquivo é o ponto de entrada. */
async function main() {
  const config = configDoAmbiente();
  const app = criarServidor(config);

  // systemd manda SIGTERM no stop/restart; fechar limpo evita conexão cortada
  // no meio de uma resposta.
  for (const sinal of ['SIGTERM', 'SIGINT'] as const) {
    process.once(sinal, () => {
      app.log.info(`${sinal} recebido, encerrando`);
      app.close().then(() => process.exit(0));
    });
  }

  try {
    await app.listen({ port: config.porta, host: config.host });
  } catch (erro) {
    app.log.error(erro);
    process.exit(1);
  }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  await main();
}
