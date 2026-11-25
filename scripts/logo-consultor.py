"""Logo do site com a linha "CONSULTOR AUTORIZADO" (pedido do Clebson, 25/11/2026).

Uso: python3 -I scripts/logo-consultor.py

Lê public/brand/logo-21go.png (o logo oficial do CRM 21Go, gerado por scripts/logo-21go.py) e
escreve, embaixo de "PROTEÇÃO VEICULAR", a linha CONSULTOR AUTORIZADO na cor lima da marca, com a
mesma altura das letras e a mesma largura da linha de cima. O símbolo e o "21 Go! Proteção
Veicular" não mudam. A posição é medida na própria imagem.

Saída: public/brand/logo-21go-consultor.png (mesmo tamanho do logo; texto claro, fundo escuro).
"""
from PIL import Image, ImageFont

ORIGEM = 'public/brand/logo-21go.png'
DESTINO = 'public/brand/logo-21go-consultor.png'
FONTE = 'public/fonts/inter/inter-700.woff'
TEXTO = 'CONSULTOR AUTORIZADO'
LIMA = (199, 211, 1, 255)  # #C7D301, a cor do alfinete


def faixas(mascara, x0):
    """Faixas de linhas com desenho à direita de x0: [(y0, y1), ...]."""
    w, h = mascara.size
    linhas = [any(mascara.getpixel((x, y)) for x in range(x0, w)) for y in range(h)]
    r, y = [], 0
    while y < h:
        if linhas[y]:
            i = y
            while y < h and linhas[y]:
                y += 1
            r.append((i, y - 1))
        else:
            y += 1
    return r


def main():
    im = Image.open(ORIGEM).convert('RGBA')
    w, h = im.size
    alfa = im.split()[3].point(lambda v: 255 if v > 120 else 0)

    # Fim do símbolo: o primeiro vão vertical depois do desenho.
    colunas = [any(alfa.getpixel((x, y)) for y in range(h)) for x in range(w)]
    x = colunas.index(True)
    while colunas[x]:
        x += 1

    # Última faixa de texto = "PROTEÇÃO VEICULAR"; a altura das letras é a do "P" (sem acentos).
    y0, y1 = faixas(alfa, x)[-1]
    caixa = alfa.crop((x, y0, w, y1 + 1)).getbbox()
    esquerda, direita = x + caixa[0], x + caixa[2]
    p = alfa.crop((esquerda, y0, esquerda + 12, y1 + 1)).getbbox()
    topo_p, base_p = y0 + p[1], y0 + p[3]
    altura = base_p - topo_p
    largura = direita - esquerda

    # Texto em alta resolução, recortado nas letras e reduzido para a mesma altura e largura.
    fonte = ImageFont.truetype(FONTE, 200)
    grande = Image.new('L', (fonte.getbbox(TEXTO)[2] + 40, 300), 0)
    from PIL import ImageDraw
    ImageDraw.Draw(grande).text((20, 20), TEXTO, font=fonte, fill=255)
    grande = grande.crop(grande.getbbox())
    letras = grande.resize((largura, altura), Image.LANCZOS)

    # Linha nova: abaixo da faixa de cima (que inclui o til e a cedilha), com o mesmo vão do logo.
    vao = topo_p - (faixas(alfa, x)[-2][1] if len(faixas(alfa, x)) > 1 else topo_p - altura)
    topo = y1 + max(6, min(vao, altura // 2 + 2))
    if topo + altura > h:
        raise SystemExit(f'a linha nova não cabe no logo ({topo + altura} > {h})')
    cor = Image.new('RGBA', letras.size, LIMA)
    saida = im.copy()
    saida.paste(cor, (esquerda, topo), letras)
    saida.save(DESTINO, optimize=True)
    print(f'{DESTINO}: {w}x{h}, linha em x={esquerda} y={topo}, {largura}x{altura} px')


if __name__ == '__main__':
    main()
