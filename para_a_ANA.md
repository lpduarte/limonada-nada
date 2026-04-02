# Notas para integração — Limonada Nada

## URLs a ajustar

- **OG/Twitter image**: `index.html` L11/L15 — os URLs estão hardcoded como `https://h3.com/limonada-nada/img/3_copos.webp`. Ajustar para o URL final do deploy.
- **`og:url`**: Falta. Adicionar `<meta property="og:url" content="https://...">` com o URL final.

## Cores dos produtos

As cores estão definidas em **3 sítios** — manter sincronizados se alterarem:
1. `css/styles.css` — `#limao-layer`, `#morango-layer`, `#maracuja-layer` (background)
2. `css/styles.css` — `#limao-kcal`, `#morango-kcal`, `#maracuja-kcal` (cor do texto do badge)
3. `js/main.js` — array `products[]` (transição de background do body)

## Badge "Todo o sabor"

O HTML do badge está **repetido 3x** (um por produto, dentro de cada `product-text-layer`). Se o texto ou o SVG mudar, actualizar nos 3: `#limao-badge`, `#morango-badge`, `#maracuja-badge`.

## Posicionamento do badge em desktop

O badge é posicionado via JS (`main.js`, dentro de `buildProductBlock`) relativo ao centro da imagem do copo usando `getBoundingClientRect()`. Os offsets são:
- Horizontal: `rect.width * 0.05` à direita do centro
- Vertical: `rect.height * 0.08` abaixo do centro

Ajustar estes valores se as imagens mudarem de proporção.

## Safari

- `text-wrap: balance` **não é suportado** em Safari. Os textos simplesmente não ficam balanceados — degradação graceful, não quebra layout.
- A transição de `font-weight` no hover do link "Stevia" (fonte variável) pode ter micro-stutter em Safari. Testar.

## Mobile

- O breakpoint mobile é `768px`. Tablets (ex: iPad Pro a 1024px) usam o layout desktop. Se necessário, adicionar breakpoint intermédio.
- O threshold de swipe é `30px` (`main.js` L124-127). Se houver problemas de toques acidentais, aumentar para 50px.
- `touch-action: manipulation` está no body — remove delay de 300ms no double-tap.

## Session persistence

O bloco actual é guardado em `sessionStorage` (`lastPlayedBlock`). Ao fazer refresh, o site re-anima o último bloco visto. Limpar sessionStorage se o comportamento for indesejado em produção.

## Fontes

- **Josefin Sans** — variável (100-700), carregada via Google Fonts
- **Caveat** — usada apenas no "saber mais" (handwritten hint)

Ambas com `display=swap`. Se houver FOIT, considerar `font-display: optional` ou preload dos ficheiros `.woff2`.

## Imagens

Todas as imagens de produto são **6825x2880px** (WebP). Se forem substituídas, manter a mesma proporção (~2.37:1) — o posicionamento do copo e os cálculos de offset (`getCupOffset`) dependem desta proporção.

## GSAP

O GSAP 3.12.7 é carregado via CDN (`cdn.jsdelivr.net`). Se houver requisitos de disponibilidade, considerar bundlar localmente ou adicionar atributo `integrity` (SRI) ao script tag.

## Acessibilidade

Já implementado: `aria-hidden` em elementos decorativos, `aria-label` no botão voltar Stevia. Falta:
- Considerar `role="region"` na secção reconheça
- Testar navegação com teclado (actualmente não há suporte — só scroll/swipe)
