import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseMusica, serializarMusica, transporMusicaTexto } from '../src/index.ts';
import { obterCampo } from '../src/cabecalho.ts';
import { parseTom } from '../src/tom.ts';

/**
 * O acervo inteiro como critério de aceitação — a política do projeto
 * ("toda mudança no núcleo roda contra o repertório inteiro, não só contra
 * os casos sintéticos") aplicada aos `.cifra` que vieram do Drive.
 *
 * Os três bugs que passaram por teste sintético e só apareceram em música
 * real (a linha `~` no teste cruzado, o `\uN` fora do BMP, a colisão do
 * `colunaAbsoluta`) são o motivo de este arquivo existir. Ele não confere
 * se a cifra está musicalmente certa — isso é curadoria humana; confere
 * que nenhuma delas é indigesta para o núcleo.
 */
const DIRETORIO = 'musicas';
const TONS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

const arquivos = readdirSync(DIRETORIO).filter((n) => n.endsWith('.cifra')).sort();

test('o acervo não está vazio (senão os testes abaixo passariam sem testar nada)', () => {
  assert.ok(arquivos.length > 300, `só ${arquivos.length} arquivos em ${DIRETORIO}/`);
});

test('todo .cifra do acervo parseia e faz round-trip textual exato', () => {
  for (const nome of arquivos) {
    const texto = readFileSync(join(DIRETORIO, nome), 'utf8');
    const musica = parseMusica(texto, nome);
    assert.equal(serializarMusica(musica) + '\n', texto, `round-trip mudou o arquivo: ${nome}`);
  }
});

test('todo .cifra do acervo declara um tom que o transpositor sabe ler', () => {
  for (const nome of arquivos) {
    const musica = parseMusica(readFileSync(join(DIRETORIO, nome), 'utf8'), nome);
    const tom = obterCampo(musica.cabecalho, 'tom');
    assert.ok(tom, `sem tom: ${nome}`);
    assert.doesNotThrow(() => parseTom(tom!), `tom ilegível em ${nome}: "${tom}"`);
  }
});

test('todo .cifra do acervo transpõe para os 12 tons e o resultado ainda parseia', () => {
  for (const nome of arquivos) {
    const texto = readFileSync(join(DIRETORIO, nome), 'utf8');
    for (const destino of TONS) {
      const transposta = transporMusicaTexto(texto, destino, nome);
      assert.doesNotThrow(() => parseMusica(transposta, nome), `${nome} não reparseia em ${destino}`);
    }
  }
});

test('transpor para o próprio tom devolve o arquivo idêntico', () => {
  // Identidade é o teste mais barato que existe contra relayout que
  // "conserta" espaçamento sem precisar: se transpor de C para C mexe no
  // arquivo, alguma regra está agindo onde não devia.
  for (const nome of arquivos) {
    const texto = readFileSync(join(DIRETORIO, nome), 'utf8');
    const tom = obterCampo(parseMusica(texto, nome).cabecalho, 'tom')!;
    assert.equal(transporMusicaTexto(texto, tom, nome), texto, `identidade mudou o arquivo: ${nome}`);
  }
});
