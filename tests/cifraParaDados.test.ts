import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { parseMusica } from '../src/index.ts';
import { cifraParaDados } from '../site/cifraParaDados.ts';
import { validar } from '../gerador-ts/modelo.ts';

function converter(texto: string) {
  return cifraParaDados(parseMusica(texto, 'teste.cifra'));
}

const CABECALHO = 'titulo: X\ntom: C\n---\n';

test('cada tipo de linha vira a tupla que o emissor espera', () => {
  const dados = converter(
    CABECALHO +
      ['[Intro] | C | G |', '', '[Verso 1]', '| C | Am |', '>Eu canto', '~C        G', '>sílaba tônica'].join('\n'),
  );
  assert.deepEqual(dados.corpo, [
    ['labc', ['[Intro]', '| C | G |']],
    ['b', null],
    ['lab', '[Verso 1]'],
    ['cif', '| C | Am |'],
    ['let', 'Eu canto'],
    ['pos', 'C        G'],
    ['let', 'sílaba tônica'],
  ]);
});

test('a linha posicional perde o "~" e MANTÉM a coluna do acorde', () => {
  // O `~` é marcador, não conteúdo: ele ocupa a coluna 0 e o acorde que
  // vem logo depois soa na coluna 0. Se a conversão só tirasse o `~` sem
  // pensar, tudo bem; se ela trimasse a linha, o acorde sairia de cima da
  // sílaba — que é o erro que este formato existe para evitar.
  const dados = converter(CABECALHO + ['~C        G', '>Eu vou cantar'].join('\n'));
  assert.equal(dados.corpo[0]![1], 'C        G');
  assert.equal(dados.corpo[1]![1], 'Eu vou cantar');
});

test('rótulo separado do corpo por uma linha em branco é colado ao corpo', () => {
  // Herança do documento de origem: 53 seções em 28 arquivos do acervo têm
  // uma branca entre o rótulo e a primeira linha da seção. Para o emissor
  // isso é "seção só com rótulo" e derruba a música inteira — e a branca
  // não significa nada para quem lê, o rótulo pertence ao bloco abaixo.
  const dados = converter(CABECALHO + ['[Refrão]', '', '| C | G |', '>Santo'].join('\n'));
  assert.deepEqual(dados.corpo, [
    ['lab', '[Refrão]'],
    ['cif', '| C | G |'],
    ['let', 'Santo'],
  ]);
  assert.doesNotThrow(() => validar(dados));
});

test('a branca que separa DUAS seções continua lá', () => {
  // A regra acima não pode virar "toda branca depois de rótulo some": a
  // branca entre o fim de uma seção e o rótulo da próxima é o respiro que
  // separa os blocos na página.
  const dados = converter(CABECALHO + ['[Verso 1]', '| C |', '>Eu canto', '', '[Refrão]', '| G |', '>Santo'].join('\n'));
  assert.deepEqual(dados.corpo, [
    ['lab', '[Verso 1]'],
    ['cif', '| C |'],
    ['let', 'Eu canto'],
    ['b', null],
    ['lab', '[Refrão]'],
    ['cif', '| G |'],
    ['let', 'Santo'],
  ]);
});

test('rótulo que não tem corpo nenhum não é maquiado', () => {
  // Aqui a branca não é ruído de formatação: a seção está vazia mesmo. O
  // conversor não pode esconder isso colando o rótulo no que vier depois —
  // é pendência de curadoria, e o emissor tem que continuar reclamando.
  const dados = converter(CABECALHO + ['[Intro]', '', '[Verso 1]', '| C |', '>Eu canto'].join('\n'));
  assert.deepEqual(dados.corpo[0], ['lab', '[Intro]']);
  assert.deepEqual(dados.corpo[1], ['b', null], 'a branca depois de seção vazia tem que sobreviver');
  assert.throws(() => validar(dados), /só com rótulo/);
});

test('sem artista o campo fica vazio, não ausente; momento some quando não há', () => {
  // Vazio e não ausente porque o site inteiro trata `artista` como texto —
  // e quem decide não imprimir a linha é o emissor, que omite quando vazio.
  const sem = converter(CABECALHO + '| C |');
  assert.equal(sem.artista, '');
  assert.equal(sem.momento, undefined);

  const com = cifraParaDados(
    parseMusica('titulo: X\nartista: Fulano\ntom: C\nmomento: Ofertório\n---\n| C |\n', 'x.cifra'),
  );
  assert.equal(com.artista, 'Fulano');
  assert.equal(com.momento, 'Ofertório');
});

test('o acervo inteiro converte, e o que não passa no emissor é contado, não escondido', () => {
  const arquivos = readdirSync('musicas').filter((n) => n.endsWith('.cifra'));
  assert.ok(arquivos.length > 300);

  const recusados: string[] = [];
  for (const nome of arquivos) {
    const dados = cifraParaDados(parseMusica(readFileSync(`musicas/${nome}`, 'utf8'), nome));
    try {
      validar(dados);
    } catch {
      recusados.push(nome);
    }
  }
  // Os que sobram são seção com rótulo e sem corpo nenhum — pendência de
  // curadoria, listada em docs/rumo.md. O número trava para que ele só
  // possa cair: se subir, alguma conversão regrediu.
  assert.ok(recusados.length <= 7, `emissor recusa ${recusados.length}: ${recusados.join(', ')}`);
});
