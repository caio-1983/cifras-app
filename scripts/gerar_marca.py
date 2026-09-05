"""
Gera os assets da marca a partir da arte original.

    python scripts/gerar_marca.py [arte.png]      (padrão: IntegraMusic.png)

Produz `site/estatico/marca.png` (o símbolo, para a lateral) e
`site/estatico/icone.png` (quadrado 192px: favicon hoje, ícone do PWA quando
o offline primeiro chegar — decisão 1 do `docs/rumo.md`).

Por que um script e não um comando avulso: trocar a logo tem que ser trocar
a arte e rodar isto. Um recorte feito à mão uma vez não é reproduzível, e a
marca vai mudar de novo.

O que ele faz, e por quê:

- **Descarta o wordmark.** Na lateral o nome do produto já aparece em texto
  ao lado da marca; a 34px de altura o wordmark seria ilegível e repetido.
  As bandas de conteúdo são detectadas por varredura de linhas claras, não
  por fração fixa da altura — arte nova tem proporção diferente.
- **Recorta o fundo por luminância.** A arte vem sobre fundo escuro chapado
  (medido: V<=33 no fundo, V>=248 no símbolo). A rampa entre PISO e TETO
  preserva o halo da borda em vez de serrilhar.
- **Não deixa margem.** O respiro é do CSS. Margem embutida faz a marca
  parecer menor que os ícones vizinhos.
"""

import sys
from pathlib import Path
from PIL import Image

PISO, TETO = 55, 130       # rampa de alfa sobre o canal V
ALTURA_MARCA = 102         # 3x o slot de 34px da lateral
LADO_ICONE = 192
RESPIRO_ICONE = 0.08


def bandas_de_conteudo(v, largura, altura, minimo=12):
    """Faixas verticais com pixel claro: o símbolo é uma, o wordmark é outra."""
    faixas, inicio = [], None
    for y in range(altura):
        tem_claro = any(v.getpixel((x, y)) > 90 for x in range(0, largura, 3))
        if tem_claro and inicio is None:
            inicio = y
        elif not tem_claro and inicio is not None:
            if y - inicio > minimo:
                faixas.append((inicio, y))
            inicio = None
    if inicio is not None:
        faixas.append((inicio, altura))
    return faixas


def recortar_simbolo(arte):
    v = arte.convert('RGB').convert('HSV').getchannel('V')
    faixas = bandas_de_conteudo(v, arte.width, arte.height)
    if not faixas:
        raise SystemExit('nenhum conteúdo claro encontrado — a arte tem fundo escuro?')
    topo, base = faixas[0]          # a primeira banda é o símbolo
    simbolo = arte.crop((0, topo, arte.width, base))

    canal = simbolo.convert('RGB').convert('HSV').getchannel('V')
    alfa = canal.point(
        lambda x: 0 if x <= PISO else (255 if x >= TETO else int((x - PISO) * 255 / (TETO - PISO)))
    )
    simbolo.putalpha(alfa)
    return simbolo.crop(simbolo.getbbox()), faixas


def main():
    origem = Path(sys.argv[1] if len(sys.argv) > 1 else 'IntegraMusic.png')
    destino = Path('site/estatico')
    destino.mkdir(parents=True, exist_ok=True)

    arte = Image.open(origem).convert('RGBA')
    marca, faixas = recortar_simbolo(arte)
    print(f'{origem}: {arte.size} · bandas {faixas} · símbolo {marca.size}')

    escala = ALTURA_MARCA / marca.height
    marca = marca.resize((round(marca.width * escala), ALTURA_MARCA), Image.LANCZOS)
    marca.save(destino / 'marca.png', optimize=True)

    margem = round(LADO_ICONE * RESPIRO_ICONE)
    util = LADO_ICONE - margem * 2
    prop = min(util / marca.width, util / marca.height)
    reduzida = marca.resize((round(marca.width * prop), round(marca.height * prop)), Image.LANCZOS)
    icone = Image.new('RGBA', (LADO_ICONE, LADO_ICONE), (0, 0, 0, 0))
    icone.paste(reduzida, ((LADO_ICONE - reduzida.width) // 2, (LADO_ICONE - reduzida.height) // 2), reduzida)
    icone.save(destino / 'icone.png', optimize=True)

    print(f'marca.png {marca.size}  ·  icone.png {icone.size}')


if __name__ == '__main__':
    main()
