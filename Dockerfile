# Imagem do Painel de Operação Musical.
#
# O servidor é TypeScript rodando direto no Node (type stripping nativo), sem
# passo de build — por isso o que entra aqui é o fonte, não um `dist/`. A
# versão do Node é escolhida AQUI, e não herdada do host: a VPS está na 22.22.2
# e é compartilhada com outros serviços, então subir o Node dela para satisfazer
# este projeto seria mexer no que já está no ar por um motivo que o contêiner
# resolve de graça.
FROM node:24-alpine

ENV NODE_ENV=production
WORKDIR /app

# Dependências primeiro, em camada própria: `musicas/` muda toda semana, o
# `package-lock.json` quase nunca. Invertido, todo `.cifra` novo custaria um
# `npm ci` inteiro.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

# Só o que o servidor lê em runtime. `gerador/` (Python), `tests/`, `bruto/` e
# `docs/` ficam de fora — ver .dockerignore.
COPY src/       ./src/
COPY gerador-ts/ ./gerador-ts/
COPY site/      ./site/
COPY musicas/   ./musicas/
COPY dados/     ./dados/

# 0.0.0.0 aqui NÃO é o mesmo que 0.0.0.0 no host. É a interface do contêiner, e
# ela só é alcançável por quem está na mesma rede Docker — o proxy. O gate de
# acesso continua sendo o basic auth do Nginx Proxy Manager.
#
# O que torna isso verdade é o compose NÃO publicar porta. Se alguém acrescentar
# um `ports:` neste serviço, o acervo fica aberto na internet sem senha.
ENV CIFRAS_HOST=0.0.0.0 \
    CIFRAS_PORTA=3000 \
    CIFRAS_REPERTORIO=/app/dados/repertorio.json \
    CIFRAS_ACERVO=/app/musicas/ \
    CIFRAS_LOG=info

USER node
EXPOSE 3000

# /saude responde a contagem de músicas carregadas: se o acervo não montou, o
# contêiner fica unhealthy em vez de servir uma biblioteca vazia calada.
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
    CMD node -e "fetch('http://127.0.0.1:3000/saude').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", "site/servidor.ts"]
