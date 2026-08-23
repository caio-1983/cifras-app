# Sistema de Cifras

Guarda cada música uma vez e transpõe na hora de exibir.

## Estado

**Fase 0 concluída** — parser + transpositor no núcleo, com os testes golden-file
batendo com as transposições conferidas à mão. Nada de interface, servidor ou
banco ainda.

## Estrutura

```
musicas/          cifras, no tom original — a fonte da verdade
tests/esperado/   transposições conferidas à mão (critério de aceitação)
tests/*.test.ts   testes automatizados (golden-file + unitários)
src/              parser, transpositor e serializador (TypeScript)
docs/             especificação do formato e arquitetura
```

## Rodando

Requer **Node 23.6+** (ideal: a LTS atual, Node 24.x) — o próprio Node roda
`.ts` direto, sem passo de build.

```bash
npm install     # só devDependencies (typescript, @types/node) — nada em runtime
npm test        # roda os testes (node --test)
npm run typecheck   # checagem de tipos, opcional, só pra desenvolvimento
```

Para transpor uma música pelo código:

```ts
import { transporMusicaTexto } from './src/index.ts';

const cifraEmD = transporMusicaTexto(textoOriginalEmC, 'D');
```

## Continuando

```bash
claude
```

Veja `docs/arquitetura.md` para o que vem depois (Fase 1: importação das
músicas do Drive).
