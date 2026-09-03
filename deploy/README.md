# Deploy — cifras.integrasolutions.com.br

Escrito para uma VPS que **já tem** nginx e certbot instalados, com outros
sites na mesma instância. Nada aqui sobrescreve configuração existente: o
serviço é um unit novo, o nginx ganha um arquivo próprio em `sites-available`,
e o certificado é só para este subdomínio.

Adapte caminhos, usuário e porta ao que já roda aí — isto é um ponto de
partida conferido, não um script para sair rodando às cegas.

## O que vai no ar

Um processo Node lendo `dados/repertorio.json` e devolvendo HTML pronto.
Sem banco, sem build, sem estado — reiniciar não perde nada.

| | |
|---|---|
| Processo | `node site/servidor.ts`, escutando em `127.0.0.1` |
| Gate de acesso | HTTP basic auth **no nginx** — o Node não tem login |
| TLS | certbot, só para este subdomínio |
| Healthcheck | `GET /saude`, fora do basic auth |

## Antes de começar

```bash
node --version     # precisa ser >= 23.6 (o servidor é TS rodando direto)
dig +short cifras.integrasolutions.com.br   # tem que apontar para esta VPS
```

O DNS precisa estar resolvendo **antes** do certbot — ele valida por HTTP.

## 1. Código e dependências

```bash
sudo useradd --system --home /opt/cifras --shell /usr/sbin/nologin cifras
sudo mkdir -p /opt/cifras
sudo chown cifras:cifras /opt/cifras

# suba o repositório para /opt/cifras (git clone, rsync, o que já for o hábito)
cd /opt/cifras
sudo -u cifras npm ci --omit=dev      # só o fastify; não há build

cp .env.example .env
$EDITOR .env                          # confira CIFRAS_PORTA e CIFRAS_REPERTORIO
```

`dados/repertorio.json` é commitado, então já vem junto. Se algum dia o
repertório mudar, regenere e refaça o deploy:

```bash
python gerador/scripts/exportar_repertorio_json.py
```

## 2. Serviço

```bash
sudo cp deploy/cifras.service /etc/systemd/system/cifras.service
sudo systemctl daemon-reload
sudo systemctl enable --now cifras
systemctl status cifras
curl -s localhost:3000/saude          # {"ok":true,"musicas":13,...}
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
lugares e é o erro mais fácil de cometer.

## 5. Certificado

```bash
sudo certbot --nginx -d cifras.integrasolutions.com.br
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

```bash
curl -si https://cifras.integrasolutions.com.br/ | head -1        # 401
curl -si -u banda:SENHA https://cifras.integrasolutions.com.br/ | head -1   # 200
curl -s  https://cifras.integrasolutions.com.br/saude              # sem senha
curl -s  -u banda:SENHA https://cifras.integrasolutions.com.br/robots.txt
```

O primeiro é o que importa: **sem senha tem que dar 401.** Se der 200, o
acervo está aberto.

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
