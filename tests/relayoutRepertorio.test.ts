/**
 * A correção da colisão do `colunaAbsoluta` contra MÚSICA REAL, não contra
 * caso sintético — regra do projeto, depois de três bugs que passaram por
 * teste sintético e só apareceram no repertório (a linha `~` no teste
 * cruzado, o `\uN` fora do BMP, e esta colisão).
 *
 * Duas massas, porque são os dois domínios de `colunaAbsoluta`:
 *
 * - `gerador/repertorio/` (via `gerador-ts/dados-repertorio.ts`): 13 músicas
 *   tocadas em culto, linhas `pos` tokenizadas de texto cru — o domínio do
 *   gerador, onde adjacência de origem não existe e toda colisão é real.
 * - `musicas/*.cifra`: o acervo do parser, onde o marcador `~` cria
 *   adjacência de origem em toda linha posicional.
 *
 * Tudo em 12 tons: a colisão acontece ao SUBIR de tom (o acorde alarga), então
 * um tom só não prova nada.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { REPERTORIO } from '../gerador-ts/dados-repertorio.ts';
import { passosESemitons, transporLinha } from '../gerador-ts/transpor.ts';
import { parseMusica, transporMusicaTexto } from '../src/index.ts';

const TONS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

function tokens(linha: string): string[] {
  return linha.split(/\s+/).filter(Boolean);
}

/** Toda linha `pos` do repertório, com o tom de origem da música. */
function linhasPosicionais(): { slug: string; tom: string; linha: string }[] {
  const saida: { slug: string; tom: string; linha: string }[] = [];
  for (const [slug, mus] of Object.entries(REPERTORIO)) {
    for (const [tipo, dado] of mus.corpo) {
      if (tipo === 'pos') saida.push({ slug, tom: mus.tom, linha: dado as string });
    }
  }
  return saida;
}

test('repertório inteiro × 12 tons: nenhuma linha posicional funde dois tokens', () => {
  const linhas = linhasPosicionais();
  assert.ok(linhas.length > 100, `esperava massa real de linhas posicionais, veio ${linhas.length}`);

  let colisoes = 0;
  for (const { slug, tom, linha } of linhas) {
    const nOrig = tokens(linha).length;
    for (const destino of TONS) {
      const { deltaLetra, deltaSemitom } = passosESemitons(tom, destino);
      const saida = transporLinha(linha, deltaLetra, deltaSemitom);
      assert.equal(
        tokens(saida).length,
        nOrig,
        `${slug} ${tom}->${destino}: tokens fundidos\n  orig: ${JSON.stringify(linha)}\n  saída: ${JSON.stringify(saida)}`,
      );
      // Uma colisão se manifesta como a saída ficando mais longa que a coluna
      // final que a origem previa; contamos só pra garantir que a massa
      // EXERCITA o caminho corrigido, em vez de passar por vacuidade.
      if (saida.length > linha.length) colisoes++;
    }
  }
  assert.ok(colisoes > 0, 'a massa não exercitou nenhuma colisão — o teste passaria por vacuidade');
});

test('VITORIOSO ÉS: a música onde a divergência apareceu, nos 12 tons, sempre com separador', () => {
  const vitorioso = REPERTORIO['vitorioso-es'];
  assert.ok(vitorioso, 'VITORIOSO ÉS sumiu do repertório');

  // A linha exata do achado, e o resultado que o núcleo dava antes (colado).
  const linha = '                  | C | Am |';
  const esperado: Record<string, string> = {
    Db: '                  | Gb | Ebm |',
    Eb: '                  | Ab | Fm |',
    E: '                  | A | F#m |',
    F: '                  | Bb | Gm |',
    Gb: '                  | Cb | Abm |',
  };
  for (const [destino, alvo] of Object.entries(esperado)) {
    const { deltaLetra, deltaSemitom } = passosESemitons(vitorioso.tom, destino);
    assert.equal(transporLinha(linha, deltaLetra, deltaSemitom), alvo, `${vitorioso.tom}->${destino}`);
  }

  // E, nos 12 tons, nenhuma linha da música inteira cola dois tokens.
  for (const [tipo, dado] of vitorioso.corpo) {
    if (tipo !== 'pos') continue;
    const l = dado as string;
    for (const destino of TONS) {
      const { deltaLetra, deltaSemitom } = passosESemitons(vitorioso.tom, destino);
      assert.equal(tokens(transporLinha(l, deltaLetra, deltaSemitom)).length, tokens(l).length, `${destino}: ${JSON.stringify(l)}`);
    }
  }
});

test('PAI DE MULTIDÕES: acorde continua sobre a sílaba nos 12 tons (coluna preservada onde não há colisão)', () => {
  const pdm = REPERTORIO['pai-de-multidoes'];
  assert.ok(pdm, 'PAI DE MULTIDÕES sumiu do repertório');

  for (const [tipo, dado] of pdm.corpo) {
    if (tipo !== 'pos') continue;
    const linha = dado as string;
    const colunasOrig = [...linha.matchAll(/\S+/g)].map((m) => m.index);
    for (const destino of TONS) {
      const { deltaLetra, deltaSemitom } = passosESemitons(pdm.tom, destino);
      const saida = transporLinha(linha, deltaLetra, deltaSemitom);
      const colunasNovas = [...saida.matchAll(/\S+/g)].map((m) => m.index);
      assert.equal(colunasNovas.length, colunasOrig.length, `${destino}: ${JSON.stringify(linha)}`);
      // Nenhum item pode ANTECIPAR a coluna de origem — sair antes da sílaba é
      // o erro que a linha posicional existe pra evitar. Atrasar acontece, e é
      // o custo declarado da colisão.
      for (const [i, col] of colunasNovas.entries()) {
        assert.ok(
          col >= colunasOrig[i]!,
          `${destino}: item ${i} recuou de ${colunasOrig[i]} para ${col}\n  orig: ${JSON.stringify(linha)}\n  saída: ${JSON.stringify(saida)}`,
        );
      }
    }
  }
});

test('acervo .cifra × 12 tons: adjacência do marcador "~" preservada, nenhum token fundido', () => {
  const dir = new URL('../musicas/', import.meta.url);
  const arquivos = readdirSync(dir).filter((f) => f.endsWith('.cifra'));
  assert.ok(arquivos.length > 0, 'nenhum .cifra encontrado');

  let linhasVistas = 0;
  for (const arquivo of arquivos) {
    const texto = readFileSync(new URL(arquivo, dir), 'utf8');
    const original = parseMusica(texto, arquivo);
    const posicionaisOrig = original.corpo.filter((l) => l.tipo === 'posicional');

    for (const destino of TONS) {
      const saida = transporMusicaTexto(texto, destino, arquivo);
      const posicionaisNovas = saida.split('\n').filter((l) => l.startsWith('~'));
      assert.equal(posicionaisNovas.length, posicionaisOrig.length, `${arquivo} -> ${destino}: sumiu linha posicional`);

      for (const [i, linha] of posicionaisNovas.entries()) {
        linhasVistas++;
        const itensOrig = posicionaisOrig[i]!.itens;
        // O "~" é o item 0 e está colado no primeiro acorde na origem; separar
        // deslocaria toda a linha. Só vale checar onde a origem era colada.
        const marcadorColado = itensOrig.length > 1 && itensOrig[1]!.coluna === itensOrig[0]!.coluna + 1;
        if (marcadorColado) {
          assert.ok(
            !/^~\s/.test(linha),
            `${arquivo} -> ${destino}: entrou espaço depois do "~", que era colado na origem: ${JSON.stringify(linha)}`,
          );
        }
        // itensOrig inclui o "~" como item 0. Tirando o marcador dos dois
        // lados, a contagem de itens tem que bater exatamente: transpor nunca
        // pode fundir dois itens num só (nem criar um do nada).
        const itensNovos = [...linha.slice(1).matchAll(/\{[^{}]*\}|\S+/g)].length;
        assert.equal(
          itensNovos,
          itensOrig.length - 1,
          `${arquivo} -> ${destino}: contagem de itens mudou\n  saída: ${JSON.stringify(linha)}`,
        );
      }
    }
  }
  assert.ok(linhasVistas > 100, `esperava massa real, vi ${linhasVistas} linhas`);
});
