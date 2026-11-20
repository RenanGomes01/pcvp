# Fotos do túnel 3D (galeria)

Solte as fotos nesta pasta. O componente `components/site/gallery-section.tsx`
lê a pasta sozinho, sem precisar editar código.

## Nomes dos arquivos

O nome do arquivo vira a legenda da foto:

| Arquivo                     | Legenda no túnel        |
| --------------------------- | ----------------------- |
| `brendow-paulo.png`         | Brendow e Paulo         |
| `brendow-yuri-barrao.png`   | Brendow, Yuri e Barrão  |
| `lippe.png`                 | Lippe                   |

Arquivos que não são só nomes de pessoas (ex.: `podio-cbi.png`) ganham a
legenda certa em `config/site.ts` → `gallery.labels`; acentos e apelidos
(ex.: `barrao` → Barrão) ficam em `gallery.names`. O texto alternativo
(`alt`) é a legenda + " - PCVP".

- Use letras minúsculas, sem espaços, com `-` (ou `_`) separando as palavras.
- Evite acentos e `ç` no nome do arquivo (escreva `por-do-sol`, não `pôr-do-sol`).
- A ordem no túnel é sorteada a cada visita.
- Formatos aceitos: `.jpg`, `.jpeg`, `.png`, `.webp`.
  Outros arquivos (como este LEIA-ME) são ignorados.

## Tamanho (importante para a GPU)

Cada foto vira uma textura na placa de vídeo. Antes de colocar aqui:

- no máximo **1600 px** no lado maior;
- de preferência `.jpg` ou `.webp`, com até ~300 KB cada.

Fotos direto da câmera ou do celular (4000 px+, vários MB) podem travar o
WebGL, como aconteceu com as fotos dos atletas.

## Quando as fotos aparecem

- `npm run dev`: recarregue a página.
- Produção: rode `npm run build` de novo (a lista é gerada no build).
