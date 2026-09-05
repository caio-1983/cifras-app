/**
 * Servidor do painel de operação musical: leitura, renderizado no servidor,
 * sem SPA e **sem estado**.
 *
 * Rotas:
 *   GET /                     a agenda: próximos cultos e o botão de abrir
 *   GET /culto/:nome          painel do culto: setlist, tons, música atual
 *   GET /culto/novo           abre um culto: monta nome e setlist, redireciona
 *   GET /culto/novo/:nome     painel de um culto criado na tela
 *   GET /executar/:nome       MODO EXECUÇÃO — a tela do celular no culto
 *   GET /executar/novo/:nome  o mesmo, para o culto criado na tela
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
  paginaAgenda,
  fragmentoCifra,
} from './paginas.ts';
import { paginaExecucao } from './execucao.ts';
import { codificarOrdem, decodificarOrdem, indiceValido } from './setlist.ts';
import { explicarProblema, lerSetlistTexto } from './setlistTexto.ts';
import {
  PERIODOS,
  cultoNovo,
  dataISOValida,
  identidadeDoCulto,
  nomeDeCultoNovo,
  textoDeCulto,
} from './cultos.ts';

import { tomValido } from './tons.ts';

/**
 * O nome, o tema e a data do culto criado na tela, como chegam na query.
 * `cultoNovo` é quem limpa e valida — aqui só se lê o que o link trouxe.
 */
function extrasDoCulto(q: { titulo?: string; tema?: string; d?: string }) {
  return { titulo: q.titulo, tema: q.tema, data: q.d };
}

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

  // A agenda: o que vem aí neste aparelho, mais o botão de abrir culto. Era
  // um redirecionamento para o culto mais recente do repertório — e isso
  // deixava o culto aberto na tela sem caminho pelo menu, porque o servidor
  // não sabe que ele existe.
  app.get('/', async (_req, resposta) => {
    resposta.type('text/html; charset=utf-8');
    return paginaAgenda(rep);
  });

  // Abrir culto. O servidor não guarda nada: "abrir" é montar o nome na
  // convenção e mandar o navegador para a URL desse culto — dali em diante a
  // setlist vive no `?ordem=` e no rascunho do aparelho, e o nome e o tema
  // que o usuário escreveu viajam na mesma query. Por isso é GET, e por isso
  // o formulário funciona sem JavaScript.
  app.get<{
    Querystring: { data?: string; periodo?: string; nome?: string; tema?: string; musicas?: string };
  }>('/culto/novo', async (req, resposta) => {
    const rascunho = {
      nome: req.query.nome,
      data: req.query.data,
      periodo: req.query.periodo,
      tema: req.query.tema,
      musicas: req.query.musicas,
    };

    // O período é obrigatório: dois cultos no mesmo dia (manhã e noite) são
    // dois cultos, e sem o sufixo eles dividiriam nome, URL e rascunho.
    const periodo = req.query.periodo;
    const nome = periodo ? nomeDeCultoNovo(req.query.data ?? '', periodo) : null;
    // A setlist digitada é lida aqui: linha que não casa com o repertório
    // volta como aviso, e o formulário reabre com o que já foi escrito. Montar
    // o culto sem uma música e não avisar é o pior desfecho — só se descobre
    // no culto.
    const setlist = lerSetlistTexto(req.query.musicas, rep);
    const erros = [
      ...(periodo && PERIODOS[periodo] ? [] : ['Escolha o período do culto.']),
      ...(dataISOValida(req.query.data) ? [] : ['Escolha uma data válida para o culto.']),
      ...setlist.problemas.map(explicarProblema),
    ];
    if (!nome || erros.length > 0) {
      resposta.code(400).type('text/html; charset=utf-8');
      return paginaAgenda(rep, { erros, rascunho });
    }

    const q = new URLSearchParams();
    const titulo = textoDeCulto(req.query.nome);
    const tema = textoDeCulto(req.query.tema, 40);
    if (titulo) q.set('titulo', titulo);
    if (tema) q.set('tema', tema);
    // A data completa acompanha o culto porque o nome não tem ano — e sem
    // ano não há como dizer o que ainda está por vir.
    q.set('d', dataISOValida(req.query.data)!);
    // A setlist digitada vira o `?ordem=` de sempre: daí em diante o culto
    // aberto na tela e o culto do repertório são a mesma coisa.
    if (setlist.entradas.length > 0) q.set('ordem', codificarOrdem(setlist.entradas));
    return resposta.redirect(`/culto/novo/${encodeURIComponent(nome)}?${q}`, 302);
  });

  app.get<{
    Params: { nome: string };
    Querystring: { ordem?: string; atual?: string; titulo?: string; tema?: string; d?: string };
  }>(
    '/culto/novo/:nome',
    async (req, resposta) => {
      // Não há o que procurar no repertório: o culto é o nome mais o
      // `?ordem=`. Nome fora da convenção é 404, e setlist vazia é o estado
      // inicial legítimo de quem acabou de criar.
      const entradas = decodificarOrdem(req.query.ordem, rep.porSlug) ?? [];
      const culto = cultoNovo(req.params.nome, entradas, extrasDoCulto(req.query));
      resposta.type('text/html; charset=utf-8');
      if (!culto) {
        resposta.code(404);
        return paginaNaoEncontrada();
      }
      return paginaCulto(rep, culto, entradas, indiceValido(req.query.atual, entradas.length));
    },
  );

  app.get<{
    Params: { nome: string };
    Querystring: { ordem?: string; i?: string; titulo?: string; tema?: string; d?: string };
  }>(
    '/executar/novo/:nome',
    async (req, resposta) => {
      const entradas = decodificarOrdem(req.query.ordem, rep.porSlug) ?? [];
      const culto = cultoNovo(req.params.nome, entradas, extrasDoCulto(req.query));
      if (!culto) {
        resposta.code(404).type('text/html; charset=utf-8');
        return paginaNaoEncontrada();
      }
      // Não existe execução de setlist vazia: volta para a preparação, que é
      // onde a música entra.
      if (entradas.length === 0) {
        const q = new URLSearchParams(identidadeDoCulto(culto));
        return resposta.redirect(
          `/culto/novo/${encodeURIComponent(culto.nome)}${q.size ? `?${q}` : ''}`,
          302,
        );
      }
      resposta.type('text/html; charset=utf-8');
      return paginaExecucao(culto, entradas, indiceValido(req.query.i, entradas.length));
    },
  );

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
