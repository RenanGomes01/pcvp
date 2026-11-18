# Fotos do túnel 3D (galeria)

Solte as fotos nesta pasta. O componente `components/site/gallery-section.tsx`
lê a pasta sozinho, sem precisar editar código.

## Nomes dos arquivos

O nome do arquivo vira a legenda da foto:

| Arquivo                     | Legenda no túnel        |
| --------------------------- | ----------------------- |
| `por-do-sol.jpg`            | Por do sol              |
| `final-estadual-2025.jpg`   | Final estadual 2025     |
| `treino_cedo.webp`          | Treino cedo             |

- Use letras minúsculas, sem espaços, com `-` (ou `_`) separando as palavras.
- Evite acentos e `ç` no nome do arquivo (escreva `por-do-sol`, não `pôr-do-sol`).
- A ordem no túnel é alfabética. Para controlar a ordem, use um prefixo
  numérico: `01-abertura.jpg`, `02-treino.jpg`, … (o número aparece na legenda).
- Formatos aceitos: `.jpg`, `.jpeg`, `.png`, `.webp`, `.avif`, `.gif`, `.svg`.
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
