"""Gera os arquivos do logo do site a partir do logo oficial do CRM 21Go.

Uso: python3 -I scripts/logo-21go.py CAMINHO/logo21go.png
(baixado de https://crm21go.site/logo21go.png)

Saídas:
- public/brand/logo-21go.png: logo inteiro (símbolo + "21 Go! Proteção Veicular"), só a área
  desenhada, fundo transparente. O texto é branco: usar em fundo escuro.
- public/brand/simbolo-21go.png: só o símbolo (círculo e alfinete), quadrado, fundo transparente.
- src/app/icon.png: o símbolo como ícone da aba do navegador.
"""
import sys
from PIL import Image

MARGEM = 6


def recortar(im, caixa):
    x0, y0, x1, y1 = caixa
    return im.crop((max(0, x0 - MARGEM), max(0, y0 - MARGEM), min(im.width, x1 + MARGEM), min(im.height, y1 + MARGEM)))


def quadrado(im, lado):
    m = max(im.size)
    q = Image.new('RGBA', (m, m), (0, 0, 0, 0))
    q.paste(im, ((m - im.width) // 2, (m - im.height) // 2))
    return q.resize((lado, lado), Image.LANCZOS)


def main(origem):
    im = Image.open(origem).convert('RGBA')
    alfa = im.split()[3].point(lambda v: 255 if v > 20 else 0)
    caixa = alfa.getbbox()
    if not caixa:
        sys.exit('logo vazio')
    recortar(im, caixa).save('public/brand/logo-21go.png', optimize=True)

    # Símbolo: as colunas desenhadas antes do primeiro vão vertical (o texto vem depois dele).
    colunas = [any(alfa.getpixel((x, y)) for y in range(im.height)) for x in range(im.width)]
    inicio = colunas.index(True)
    fim = inicio
    while fim + 1 < im.width and colunas[fim + 1]:
        fim += 1
    simbolo = im.crop((inicio, 0, fim + 1, im.height))
    simbolo = simbolo.crop(simbolo.split()[3].point(lambda v: 255 if v > 20 else 0).getbbox())
    quadrado(simbolo, 256).save('public/brand/simbolo-21go.png', optimize=True)
    quadrado(simbolo, 256).save('src/app/icon.png', optimize=True)
    print('logo', recortar(im, caixa).size, 'simbolo', simbolo.size)


if __name__ == '__main__':
    main(sys.argv[1])
