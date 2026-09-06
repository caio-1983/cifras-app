# Deploy — louvor.integrasolutions.com.br

Há **dois** caminhos aqui, e eles não se misturam. Confira em qual servidor
você está antes de seguir qualquer um:

| | Caminho A — Docker | Caminho B — host |
|---|---|---|
| Quando | a VPS já roda Docker com um proxy em contêiner | a VPS tem nginx e certbot no próprio host |
| Em uso hoje | **sim**, em `143.95.215.221` | não |
| Empacotamento | `Dockerfile` + `docker-compose.yml` | `cifras.service` (systemd) |
| Proxy e TLS | Nginx Proxy Manager, pela interface | `nginx-cifras.conf` + certbot |

O caminho B é o histórico, e continua correto para uma VPS daquele feitio —
está preservado no fim. **Para o servidor que está no ar hoje, use o A.**

---

# Caminho A — Docker, via Portainer (o que está em uso)

## Como esta VPS é, de fato

Levantado em 2026-09-06, em `143.95.215.221`:

- **Não há nginx no host.** Não há certbot. Não há `/etc/nginx/`.
- Quem segura as portas 80 e 443 é o contêiner **`nginx-proxy-manager`**
  (`jc21/nginx-proxy-manager`), que também serve seu painel na porta 81. É ele
  que emite e renova o certificado Let's Encrypt.
- **Portainer** administra os contêineres, na porta 9000.
- A máquina é compartilhada: `evolution-api`, `viva-biblioteca`,
  `integra-connect-frontend`, `ai-runtime`, dois Postgres. Nada aqui pode
  derrubar esses.
- O Node do host é **22.22.2** — abaixo dos `>=23.6` que o `package.json` pede.
  Isso não importa: a versão do Node é escolhida dentro do `Dockerfile`
  (Node 24), e o host não é tocado.

> **Nunca instale nginx ou certbot nesta VPS.** As portas 80/443 já estão
> ocupadas pelo `docker-proxy`; o nginx falharia no bind e a tentativa põe em
> risco tudo que já está no ar.

## O que vai no ar

Um processo Node lendo os `.cifra` de `musicas/` mais `dados/repertorio.json`,
devolvendo HTML pronto. Sem banco, sem build, sem estado — reiniciar não perde
nada.

| | |
|---|---|
| Processo | `node site/servidor.ts` dentro do contêiner, em `0.0.0.0:3000` |
| Alcance | **só pela rede Docker** — o compose não publica porta |
| Gate de acesso | basic auth na **Access List do NPM** — o Node não tem login |
| TLS | Let's Encrypt, pedido pelo NPM |
| Healthcheck | `GET /saude`, que deve ficar fora do basic auth |

`CIFRAS_HOST=0.0.0.0` é a interface **do contêiner**, não a do host — só quem
está na mesma rede Docker chega nela. O que sustenta isso é o compose **não**
ter `ports:`. Acrescentar um `ports:` entrega o acervo inteiro, sem senha, a
quem souber o IP.

## Antes de começar

O DNS precisa estar resolvendo **antes** de pedir o certificado — a validação
do Let's Encrypt é por HTTP.

```bash
dig +short louvor.integrasolutions.com.br @a.auto.dns.br
```

Consulte o autoritativo (`a.auto.dns.br`, do Registro.br) e não o resolvedor
local: se o registro tiver sido criado em outro painel que não o do Registro.br,
ele nunca vai resolver, e esperar não resolve.

## 1. Repositório

O Portainer não recebe arquivos do seu disco: ele constrói a partir de um
repositório Git — `github.com/caio-1983/cifras-app`.

> **Público em caráter temporário desde 2026-09-06**, para o Portainer clonar
> sem token durante a montagem do protótipo. **Pendência aberta: voltar a
> privado.** Enquanto estiver aberto, as 341 letras do acervo estão públicas e
> indexáveis — o oposto do que o basic auth do site protege e do que
> `docs/rumo.md` põe fora de escopo.
>
> ```bash
> gh repo edit caio-1983/cifras-app --visibility private \
>     --accept-visibility-change-consequences
> ```
>
> Ao fechar, a stack do Portainer para de clonar: ligue **Authentication** nela,
> com um *fine-grained token* de **Contents: Read-only** restrito a este
> repositório.

## 2. Stack no Portainer

Portainer → **Stacks** → **Add stack** → aba **Repository**.

| Campo | Valor |
|---|---|
| Name | `cifras` |
| Repository URL | `https://github.com/caio-1983/cifras-app` |
| Repository reference | `refs/heads/painel-operacao-musical` |
| Compose path | `docker-compose.yml` |
| Authentication | desligado — o repositório é público |

Em **Environment variables**, `REDE_PROXY` = o nome da rede do passo anterior.

Antes de dar **Deploy**, resolva a rede: em Portainer → **Networks**, ache a
rede do `nginx-proxy-manager` e troque `NOME_DA_REDE_DO_NPM` no
`docker-compose.yml` pelo nome exato. **Se o painel e o proxy não estiverem na
mesma rede, o NPM responde 502** — ele simplesmente não enxerga o nome `cifras`.

## 3. Conferir antes de expor

Ainda sem proxy nenhum, em Portainer → Containers → `cifras` → **Console**:

```bash
wget -qO- http://127.0.0.1:3000/saude
```

Tem que responder `{"ok":true,"musicas":343,...}`. Se `musicas` vier 13, o
acervo não montou e o que subiu é só o `repertorio.json` — confira
`CIFRAS_ACERVO`.

## 4. Proxy e senha, no NPM

No painel do NPM (porta 81), **Hosts → Proxy Hosts → Add Proxy Host**:

| Campo | Valor |
|---|---|
| Domain Names | `louvor.integrasolutions.com.br` |
| Scheme | `http` |
| Forward Hostname | `cifras` (o nome do contêiner, não um IP) |
| Forward Port | `3000` |
| Block Common Exploits | ligado |

Na aba **SSL**: *Request a new SSL Certificate*, com **Force SSL** e **HTTP/2**
ligados. Só funciona com o DNS já resolvendo.

Na aba **Access List**: crie uma lista com os usuários. Use um usuário
**separado** para visitante (uma igreja em demonstração, por exemplo) em vez de
emprestar o da banda — assim se revoga o acesso depois sem trocar a senha de
todo mundo.

Na aba **Advanced**, para o healthcheck não exigir senha e para o acervo não ser
indexado:

```nginx
location = /saude {
    auth_basic off;
    proxy_pass http://cifras:3000;
}
add_header X-Robots-Tag "noindex, nofollow" always;
```

## 5. Conferir depois de expor

```bash
curl -si https://louvor.integrasolutions.com.br/ | head -1              # 401
curl -si -u USUARIO:SENHA https://louvor.integrasolutions.com.br/ | head -1   # 200
curl -s  https://louvor.integrasolutions.com.br/saude                   # sem senha
```

O primeiro é o que importa: **sem senha tem que dar 401.** Se der 200, o acervo
está aberto na internet.

E confirme que não há atalho por fora do proxy — tem que falhar:

```bash
curl -s --max-time 5 http://143.95.215.221:3000/saude    # sem resposta
```

## Atualizar depois

Commit, push, e no Portainer → Stacks → `cifras` → **Update the stack**, com
*Re-pull image and redeploy* / *Prune* marcados. O `.dockerignore` mantém
`gerador/`, `tests/`, `bruto/`, `docs/` e `HCC/` fora da imagem.

## Diagnóstico

| Sintoma | Onde olhar |
|---|---|
| 502 no navegador | rede: `cifras` e o NPM na mesma? Forward Hostname é o nome do contêiner? |
| 401 onde não devia | Access List do NPM; o `location = /saude` da aba Advanced |
| Contêiner não sobe | Portainer → Containers → `cifras` → Logs |
| Biblioteca com 13 músicas | `CIFRAS_ACERVO` — o acervo não montou, só o JSON |
| Acorde fora da sílaba | não é deploy — é o núcleo; ver `docs/site.md` |

---

# Caminho B — nginx e certbot no host (histórico)

Escrito para uma VPS que **já tem** nginx e certbot instalados, com outros
sites na mesma instância. **Não se aplica a `143.95.215.221`** — está aqui
porque continua correto para uma VPS daquele feitio.

Nada aqui sobrescreve configuração existente: o serviço é um unit novo, o nginx
ganha um arquivo próprio em `sites-available`, e o certificado é só para este
subdomínio. Adapte caminhos, usuário e porta ao que já roda aí — isto é um
ponto de partida conferido, não um script para sair rodando às cegas.

Neste caminho o Node roda **no host**, então aí sim ele precisa ser `>= 23.6`
(ou `>= 22.18`, quando o type stripping da linha 22 serve — teste antes de
supor). O processo escuta em `127.0.0.1` e o gate de acesso é o basic auth do
nginx.

## 1. Código e dependências

```bash
sudo useradd --system --home /opt/cifras --shell /usr/sbin/nologin cifras
sudo mkdir -p /opt/cifras
sudo chown cifras:cifras /opt/cifras

# suba o repositório para /opt/cifras (git clone, rsync, o que já for o hábito)
cd /opt/cifras
sudo -u cifras npm ci --omit=dev      # só o fastify; não há build

cp .env.example .env
$EDITOR .env      # CIFRAS_PORTA, CIFRAS_REPERTORIO e CIFRAS_ACERVO
```

`CIFRAS_ACERVO` aponta para `musicas/` e é o que carrega as 343 cifras;
`CIFRAS_REPERTORIO` aponta para `dados/repertorio.json`, que traz os cultos já
tocados. As duas fontes convivem — ver `site/repertorio.ts`.

## 2. Serviço

```bash
sudo cp deploy/cifras.service /etc/systemd/system/cifras.service
sudo systemctl daemon-reload
sudo systemctl enable --now cifras
systemctl status cifras
curl -s localhost:3000/saude          # {"ok":true,"musicas":343,...}
```

Se não subir, o motivo está em `journalctl -u cifras -n 50`. O erro mais
provável é `CIFRAS_REPERTORIO` apontando para um caminho que não existe — o
serviço falha na subida de propósito, em vez de servir uma lista vazia.

## 3. Senha do basic auth

Um arquivo só para este site, para não interferir no de outros:

```bash
sudo apt install apache2-utils          # se ainda não tiver o htpasswd
sudo htpasswd -c /etc/nginx/.htpasswd-cifras banda      # -c só na PRIMEIRA vez
sudo htpasswd    /etc/nginx/.htpasswd-cifras caio       # demais usuários
sudo chown root:www-data /etc/nginx/.htpasswd-cifras
sudo chmod 640 /etc/nginx/.htpasswd-cifras
```

> `-c` **cria do zero**. Usar `-c` de novo apaga todo mundo que já estava lá.

## 4. nginx

```bash
sudo cp deploy/nginx-cifras.conf /etc/nginx/sites-available/cifras
sudo ln -s /etc/nginx/sites-available/cifras /etc/nginx/sites-enabled/cifras
sudo nginx -t                 # confere que nada colidiu com os outros sites
sudo systemctl reload nginx   # reload, não restart: não derruba os outros
```

Confira a porta do `proxy_pass` contra `CIFRAS_PORTA` do `.env` — são dois
lugares e é o erro mais fácil de cometer. E confira o `server_name`: o arquivo
ainda diz `cifras.integrasolutions.com.br`, e o subdomínio em uso é `louvor`.

## 5. Certificado

```bash
sudo certbot --nginx -d louvor.integrasolutions.com.br
```

`--nginx` edita **só** o bloco deste subdomínio, acrescentando o `listen 443
ssl`, os caminhos do certificado e o redirecionamento de 80 para 443. Os
outros sites não são tocados. Escolha a opção de redirecionar HTTP para HTTPS
quando ele perguntar.

Renovação é automática (timer do certbot). Para conferir:

```bash
sudo certbot renew --dry-run
sudo certbot certificates
```

> Se o certbot reclamar de validação, quase sempre é o basic auth barrando o
> `/.well-known/acme-challenge/`. O plugin `--nginx` costuma contornar
> sozinho; se não contornar, comente o `auth_basic` do bloco, rode o certbot,
> e descomente depois.

## 6. Conferir

O primeiro é o que importa: **sem senha tem que dar 401.** Se der 200, o
acervo está aberto.

```bash
curl -si https://louvor.integrasolutions.com.br/ | head -1        # 401
curl -si -u banda:SENHA https://louvor.integrasolutions.com.br/ | head -1   # 200
curl -s  https://louvor.integrasolutions.com.br/saude              # sem senha
```

## Atualizar depois

```bash
cd /opt/cifras && sudo -u cifras git pull && sudo -u cifras npm ci --omit=dev
sudo systemctl restart cifras
```

## Diagnóstico

| Sintoma | Onde olhar |
|---|---|
| 502 no navegador | `systemctl status cifras`; porta do `proxy_pass` × `.env` |
| 401 onde não devia | `/etc/nginx/.htpasswd-cifras` (dono, permissão, usuário) |
| Serviço não sobe | `journalctl -u cifras -n 50` — normalmente o caminho do repertório |
| Música faltando | `curl localhost:3000/saude` diz quantas foram carregadas |
| Acorde fora da sílaba | não é deploy — é o núcleo; ver `docs/site.md` |
