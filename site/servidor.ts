/**
 * Servidor do painel de operação musical: leitura, renderizado no servidor,
 * sem SPA e **sem estado**.
 *
 * Rotas:
 *   GET /                     o culto mais recente (redireciona pra /culto/:nome)
 *   GET /culto/:nome          painel do culto: setlist, tons, música atual
 *   GET /executar/:nome       MODO EXECUÇÃO — a tela do celular no culto
 *   GET /musicas              o repertório, com busca
 *   GET /buscar               a mesma busca, com o campo em foco
 *   GET /cultos               cultos anteriores
 *   GET /musica/:slug         cifra no tom de origem
 *   GET /musica/:slug?tom=G   cifra transposta
 *   GET /configuracoes        preferências deste aparelho
 *   GET /perfil               por que não existe conta de usuário
 *   GET /saude                healthcheck do systemd
 *   GET /robots.txt           bloqueia tudo
 *   GET /estatico/marca.png   a marca do produto, para a lateral
 *   GET /estatico/icone.png   a marca em quadrado: favicon hoje, PWA depois
 *
 * A setlist em execução viaja no `?ordem=` e a música atual no `?i=`/`?atual=`
 * (ver `site/setlist.ts`) — é o que faz "preparar no computador e executar no
 * celular" funcionar sem banco e sem sessão.
 *
 * **Não há autenticação aqui, de propósito.** O acervo tem letra de música
 * protegida e isto é ferramenta interna da banda: o gate é HTTP basic auth no
 * nginx (ver `deploy/`). O processo escuta em 127.0.0.1 por padrão justamente
 * para não ficar exposto sem esse gate — se mudar `CIFRAS_HOST` para 0.0.0.0,
 * o site fica aberto.
 */
import Fastify from 'fastify';
import { fileURLToPath } from 'node:url';
import { createReadStream } from 'node:fs';
import { dirname, join } from 'node:path';
import { carregarRepertorio } from './repertorio.ts';
import {
  paginaBiblioteca,
  paginaConfiguracoes,
  paginaCulto,
  paginaHistorico,
  paginaMusica,
  paginaNaoEncontrada,
  paginaPerfil,
  paginaSemCulto,
  fragmentoCifra,
} from './paginas.ts';
import { paginaExecucao } from './execucao.ts';
import { decodificarOrdem, indiceValido } from './setlist.ts';
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
    cultos: rep.cultos.length,
    versao: process.env.CIFRAS_VERSAO ?? null,
  }));

  app.get('/robots.txt', async (_req, resposta) => {
    resposta.type('text/plain; charset=utf-8');
    return ROBOTS;
  });

  // Único arquivo estático do site, servido por uma rota própria em vez de um
  // plugin de estáticos: uma rota nomeada não expõe diretório por engano, e
  // este processo escuta em 127.0.0.1 justamente para não abrir o acervo.
  //
  // Cache longo com "immutable": a marca é a mesma em toda página e não muda
  // entre versões — e a igreja com wi-fi ruim é a regra, não a exceção.
  // Trocar a marca é trocar o arquivo e recarregar forçado uma vez.
  const pastaEstatica = join(dirname(fileURLToPath(import.meta.url)), 'estatico');
  for (const arquivo of ['marca.png', 'icone.png']) {
    app.get(`/estatico/${arquivo}`, async (_req, resposta) => {
      resposta.type('image/png');
      resposta.header('cache-control', 'public, max-age=31536000, immutable');
      return createReadStream(join(pastaEstatica, arquivo));
    });
  }

  // A tela principal é o culto. Sem culto no repertório, o painel diz isso em
  // vez de redirecionar para lugar nenhum.
  app.get('/', async (_req, resposta) => {
    const maisRecente = rep.cultos[0];
    if (!maisRecente) {
      resposta.type('text/html; charset=utf-8');
      return paginaSemCulto(rep);
    }
    return resposta.redirect(`/culto/${encodeURIComponent(maisRecente.nome)}`, 302);
  });

  app.get<{ Params: { nome: string }; Querystring: { ordem?: string; atual?: string } }>(
    '/culto/:nome',
    async (req, resposta) => {
      const culto = rep.cultoPorNome(req.params.nome);
      resposta.type('text/html; charset=utf-8');
      if (!culto) {
        resposta.code(404);
        return paginaNaoEncontrada();
      }
      // `?ordem=` inválido cai na ordem tocada, como `?tom=` cai no tom de
      // origem: quem abriu quer o culto, não um 400.
      const entradas = decodificarOrdem(req.query.ordem, rep.porSlug) ?? culto.entradas;
      return paginaCulto(rep, culto, entradas, indiceValido(req.query.atual, entradas.length));
    },
  );

  app.get<{ Params: { nome: string }; Querystring: { ordem?: string; i?: string } }>(
    '/executar/:nome',
    async (req, resposta) => {
      const culto = rep.cultoPorNome(req.params.nome);
      resposta.type('text/html; charset=utf-8');
      if (!culto) {
        resposta.code(404);
        return paginaNaoEncontrada();
      }
      const entradas = decodificarOrdem(req.query.ordem, rep.porSlug) ?? culto.entradas;
      return paginaExecucao(culto, entradas, indiceValido(req.query.i, entradas.length));
    },
  );

  app.get('/musicas', async (_req, resposta) => {
    resposta.type('text/html; charset=utf-8');
    return paginaBiblioteca(rep, { foco: false });
  });

  app.get('/buscar', async (_req, resposta) => {
    resposta.type('text/html; charset=utf-8');
    return paginaBiblioteca(rep, { foco: true });
  });

  app.get('/cultos', async (_req, resposta) => {
    resposta.type('text/html; charset=utf-8');
    return paginaHistorico(rep);
  });

  app.get('/configuracoes', async (_req, resposta) => {
    resposta.type('text/html; charset=utf-8');
    return paginaConfiguracoes();
  });

  app.get('/perfil', async (_req, resposta) => {
    resposta.type('text/html; charset=utf-8');
    return paginaPerfil();
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
