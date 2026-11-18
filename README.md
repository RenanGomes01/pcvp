# PCVP — site do time de vôlei de praia

Next.js 16 (App Router, TypeScript), Tailwind CSS v4, Motion (framer-motion), Lenis e shadcn/ui.

## Rodando

```bash
npm install
npm run dev
```

Abra <http://localhost:3000>. Para testar no celular (mesma rede Wi-Fi), rode `npm run dev -- -H 0.0.0.0` e acesse `http://<IP-do-computador>:3000`.

## Estrutura da landing page

O layout segue a estrutura de uma landing page SaaS moderna (referência: o template SaaS do React Bits Pro, analisado só pelo layout e comportamento). Todo o código foi escrito do zero para o PCVP.

| Arquivo | O que faz |
| --- | --- |
| `config/site.ts` | **Configuração central:** nome, menus, textos do hero, prancheta tática, grade de horários e planos, patrocinadores, seção de partículas, bento, treinos, CTA e footer. O conteúdo do site se edita aqui. Números e nomes atuais são placeholders. |
| `app/layout.tsx` | Metadados (a partir do config), fontes (Geist + Instrument Serif para a palavra de destaque), tema escuro e scroll suave. |
| `app/page.tsx` | Monta a página: Moldura + Notch → Hero (título, prancheta tática, marquee) → Manifesto → Bento (+ elenco) → **Horários** → **Planos** → **Partículas** → Treinos → **Galeria 3D** → **eBooks** → CTA → Footer. |
| `components/site/smooth-scroll.tsx` | Lenis global (`lenis/react`), com rolagem suave para links `#âncora` compensando o notch. Desligado com `prefers-reduced-motion`. |
| `components/site/navbar.tsx` | `ScreenFrame`: moldura fixa com cantos internos arredondados; o site rola "dentro" dela, como numa tela de celular. `Navbar`: **notch / Dynamic Island**, um bloco escuro preso ao topo com cantos inferiores arredondados e curvas côncavas nas laterais, por isso o conteúdo parece contornar a barra. Tem dropdowns, menu mobile que "cresce" o notch, o `CtaButton` (bloco laranja com seta) e a **logo** (`public/logo.png`, PNG sem fundo) com "Magnetic Hover" (segue o cursor com mola) e brilho laranja pulsante. |
| `components/site/hero.tsx` | Hero num frame com a base arredondada: textura abstrata 100% CSS em laranja/amarelo (`.hero-texture` + `.hero-dither`; creme no tema claro, escura com brasas no escuro), título com a palavra de destaque em serifa itálica laranja, **prancheta tática flutuante** (`TacticalBoard`, que levanta e endireita com o scroll), e **marquee infinito de patrocinadores** sobre o "chão" laranja (`animate-marquee`, bordas com `mask-image`, pausa no hover). |
| `components/site/sections.tsx` | Manifesto revelado palavra a palavra pelo scroll, **bento grid** (Elenco, Próximos jogos, Estatísticas, Conquistas + **perfis dos atletas**), **`ScheduleSection`** (grade de horários), **`ParticleShowcase`** (seção preta com o `<ParticleText />` como surpresa interativa), linha do tempo "Como treinamos" e footer. |
| `components/site/pricing-section.tsx` | **Planos** (`pricing` no config): 2 cards de alto contraste com preço em BRL, horários de cada plano e "Quero me inscrever". No hover, uma borda cônica laranja/amarela gira em volta do card e um halo acende atrás. |
| `components/site/athlete-sheet.tsx` | **Perfil do atleta** em painel lateral (shadcn `sheet`, baseado em Base UI). Tem citação em serifa itálica, bio longa com scroll próprio (`data-lenis-prevent`; o Lenis pausa enquanto o painel está aberto) e as listas "Principais Títulos" e "Prêmios Individuais". Abre ao clicar num atleta no Bento. Os dados ficam em `team.members[].profile` (**mock**, troque pela bio real). |
| `components/site/ebooks-section.tsx` | **eBooks** (`ebooks` no config): 2 cards com capa feita em CSS, tilt 3D seguindo o ponteiro e lift no hover (`motion`). |
| `components/site/cta-section.tsx` | CTA final "Bora pra areia?": card escuro com o `<ShaderCard>` e uma chama laranja subindo por trás do texto e dos botões. |
| `components/ui/interactive-schedule.tsx` | Grade de horários interativa por **turnos** (`shifts`: Manhã 6h–8h e Tarde/Noite 17h–20h; o intervalo vazio não aparece). CSS Grid com horários + segunda a sexta (treinos de 2h ocupam duas linhas, turmas simultâneas ficam lado a lado), pílulas coloridas por turma com brilho no hover, filtros e, no mobile, seletor de dia que abre no dia de hoje. Os dados vêm de `schedule` em `config/site.ts`: os horários reais, os mesmos dos planos. |
| `components/ui/tactical-board.tsx` | **Prancheta tática** em SVG + motion: quadra de areia 16 × 8 m vista de cima, pinos dos atletas e uma jogada em loop de 7 s (saque → recepção → levantamento → ataque na diagonal) com rastros da bola, setas de movimentação e passos destacados em sincronia. Tudo segue uma única linha do tempo de keyframes, sem estado em JS. Com "reduzir movimento", mostra a jogada parada. Os textos ficam em `tactical` no config. |
| `components/ui/shader-card.tsx` | Card com chama em GLSL, tilt e parallax (veja abaixo). |
| `components/site/gallery-section.tsx` | **Server Component.** Lê `public/gallery` com `fs.readdirSync`, gera `{ src, alt, title }` a partir do nome dos arquivos (`por-do-sol.jpg` vira "Por do sol") e renderiza o `<PassageGallery />` numa seção arredondada com uma faixa de instrução acima do túnel e altura reduzida (`70vh`, mín. 500px no desktop; `60svh` no mobile), para sempre sobrar área fora da galeria para rolar a página. |
| `components/ui/passage-gallery.tsx` | Túnel 3D de fotos com React Three Fiber (veja abaixo). |
| `components/ui/particle-text.tsx` | O efeito de partículas (veja abaixo). |

**Patrocinadores:** edite `siteConfig.sponsors`. Cada item tem um `name` e um `icon` (nome de um ícone do lucide-react) como placeholder. Para usar logos reais, coloque os SVGs em `public/` e troque o `<Icon />` por um `<img>` no `SponsorsMarquee` (`components/site/hero.tsx`).

Tokens em `app/globals.css`: `--color-brand` (laranja `#ff6600`: `bg-brand`, `text-brand`), `--color-brand-soft` (amarelo de apoio), `--color-on-brand` (texto escuro sobre o laranja: `text-on-brand`), `--color-shell` (fundo externo, moldura e notch: `bg-shell`) e `--animate-marquee`.

### Tema claro / escuro

- `next-themes` com a classe `.dark` no `<html>` (`components/site/theme-provider.tsx`). Segue o sistema (`defaultTheme="system"`): sem preferência escura no sistema, abre no **claro**. A escolha manual fica salva no navegador.
- Botão flutuante sol/lua no canto inferior direito: `components/site/theme-toggle.tsx`.
- **Como as cores trocam:** o layout usa classes do tema escuro (`text-white`, `bg-neutral-950`, `ring-white/10`…). No claro, `globals.css` **inverte a escala** de cada cor usada no nível das variáveis do Tailwind (`neutral-950↔50`, `900↔100`… `white↔quase preto`, idem para sky/amber/violet/pink/indigo/orange). Por isso textos, fundos, bordas e opacidades trocam juntos sem duplicar classes. Componentes novos podem continuar escrevendo as classes "do escuro".
- **Ilhas com visual fixo:** a classe `theme-fixed` restaura a paleta original. É usada no Hero (que tem variantes `dark:` próprias), no card de chama do CTA, no túnel 3D e no card laranja do Elenco.
- O `ParticleText` troca a cor dos glifos pelo tema (claros no escuro, escuros no claro, com laranja nos dois).

---

## Galeria 3D (`PassageGallery`)

**Para adicionar fotos:** coloque os arquivos (`.jpg`, `.png`, `.webp`, `.avif`, `.gif`, `.svg`) em `public/gallery/`. As 4 imagens atuais são placeholders gerados localmente. Em dev, basta recarregar a página. Em produção, a pasta é lida no build.

O componente é uma **implementação própria**. Ele segue a API pública documentada do "Passage Gallery" do React Bits (mesmos props e defaults), mas não copia código do React Bits Pro. Usa `three`, `@react-three/fiber` e `@react-three/drei` (`useTexture`).

**Controles:** rolar o mouse ou arrastar atravessa o túnel (no touch, arraste na horizontal; o vertical continua rolando a página). Mover o ponteiro olha em volta. Segurar o botão acelera (`boost`). Clicar numa foto traz a foto para a frente; clicar de novo ou apertar `Esc` devolve. Pelo teclado, `↑`/`↓` movem uma célula.

> Com `wheel` ligado (padrão), a roda do mouse sobre a galeria move o túnel, e não a página (a seção usa `data-lenis-prevent`). Por isso a seção não ocupa a tela inteira: sempre fica conteúdo visível acima e abaixo para o mouse escapar, e uma faixa acima do túnel explica os controles. Para manter a rolagem normal da página, passe `wheel={false}`.

| Prop | Padrão | Descrição |
| --- | --- | --- |
| `items` | `[]` | Fotos `{ src, alt, title? }`. `title` vira legenda ao abrir. |
| `colors` | `["#5227FF", "#FF9FFC"]` | Gradiente dos azulejos de acento (na seção: laranja → amarelo). |
| `backgroundColor` | `"#0a0a0a"` | Cor das paredes e da neblina. `"transparent"` mostra a página atrás. |
| `lanes` | `5` | Azulejos no chão/teto. As paredes recebem quantos couberem na proporção. |
| `gap` / `radius` | `0.1` / `0.06` | Espaço entre azulejos (fração da célula) e arredondamento (0 = quadrado, 1 = círculo). |
| `photoFill` / `accentFill` | `0.3` / `0.06` | Fração das células com foto e com acento. |
| `lineOpacity` | `0.12` | Visibilidade da grade. |
| `fog` | `1` | Velocidade com que o túnel some na neblina. |
| `speed` / `boost` | `0.6` / `10` | Cruzeiro em células/s (negativo inverte) e multiplicador ao segurar. |
| `blur` | `1` | Motion blur em alta velocidade (0 desliga). |
| `look` / `fov` | `1` / `72` | Quanto a câmera segue o ponteiro e campo de visão vertical. |
| `hover` | `1` | Brilho e elevação do azulejo sob o ponteiro. |
| `focusOnClick` / `captions` | `true` / `true` | Abrir foto no clique / legenda com título e posição. |
| `wheel` / `interactive` | `true` / `true` | Roda move o túnel / habilita look, arrastar, segurar e clicar. |
| `seed` | `0` | Muda a distribuição de fotos e acentos. |
| `paused` | `false` | Para o cruzeiro (arrastar e segurar continuam). Com `prefers-reduced-motion`, o túnel nunca anda sozinho. |
| `dpr` | `2` | DPR máximo do canvas. |
| `ariaLabel`, `onFocusChange(item, index)`, `ref` (`{ close, travel }`), `children`, `className`, `style` | | Acessibilidade, callback de foco, controle imperativo, conteúdo centralizado sobre o túnel e estilos do container (preenche o pai, mínimo de 420px). |

**Como funciona:** cada fatia `s` do túnel tem `2·lanes + 2·linhas` células. Um *ring buffer* de 34 fatias reaproveita os azulejos: quando a câmera avança, o slot `s mod 34` que ficou para trás é reatribuído à fatia nova lá na frente. O conteúdo de cada célula vem de um hash de `(seed, fatia, célula)`, então ir e voltar mostra sempre as mesmas fotos. A grade é desenhada por shader com coordenadas de mundo em 4 planos que seguem a câmera. Neblina, cantos arredondados, recorte *cover*, motion blur e hover ficam no fragment shader. O render pausa fora da tela (`IntersectionObserver`).

## Card com chama (`ShaderCard`)

`components/ui/shader-card.tsx` é uma **implementação própria**. Segue a API pública documentada do "Shader Card" do React Bits (mesmos props e defaults), mas não copia código do React Bits Pro. Usa `@react-three/fiber` para o canvas e `motion/react` (o atual framer-motion) para o tilt e o parallax.

```tsx
<ShaderCard color="#ff6600" width="100%" height="auto" borderRadius="2rem" tiltStrength={4}>
  …conteúdo…
</ShaderCard>
```

- **Shader:** um plano de tela cheia. A chama é um envelope elíptico ancorado na base, deformado por *fbm* com *domain warping* e "línguas" que sobem com o tempo. Tem bordas brilhantes (`highlightColor`, que por padrão é um tom mais claro e quente da `color`), curvas de nível (`contours`), pulso (`flash`), halo (`bloom`), grão (`grain`) e fade no topo (`fade`) para não brigar com o texto. A saída é pré-multiplicada, então a chama brilha sobre qualquer fundo.
- **Props da chama:** `speed`, `positionY`, `scale`, `effectRadius`, `effectBoost`, `edgeMin`/`edgeMax`, `falloffPower`, `noiseScale`, `widthFactor`, `waveAmount`, `branchIntensity`, `verticalExtent`/`horizontalExtent`, `contours`, `flash`, `blur` (em px, suaviza as bordas), `intensity`, `bloom`, `grain`, `fade`, `opacity`. Também aceita `fragmentShader` para trocar a chama por outro GLSL.
- **Interação:** `tiltStrength` (graus) inclina o card em direção ao ponteiro com molas. Com `parallax`, o conteúdo e a chama se deslocam em sentidos opostos. Com `hoverRise`, a chama sobe um pouco, brilha mais e acelera no hover. `interactive={false}` desliga tudo isso. No touch não há tilt.
- **Ciclo de vida:** `intro` faz a chama subir quando o card aparece, e `ref.replay()` repete a animação. `autoPlay={false}` só anima no hover. `paused` congela a chama, e com `prefers-reduced-motion` ela fica estática. O render pausa fora da tela. `dpr` limita a resolução.

## Componente `ParticleText`

`components/ui/particle-text.tsx`

Um único `<canvas>` HTML5, sem dependências, em que a palavra é desenhada por centenas de glifos minúsculos (letras, números e símbolos). O efeito é **"Gravity / Sand"**: o mouse ou o dedo funciona como uma faca.
- As letrinhas cortadas são **arremessadas na direção e na velocidade do corte**.
- **Integridade estrutural:** enquanto houver ao menos uma letrinha ligando uma parte ao topo da letra, ela fica de pé. Se a ligação for rompida por completo, a parte isolada **cai inteira**. Nenhuma ilha de partículas fica flutuando.
- As partículas **quicam nas paredes** e se amontoam no chão.
- Depois de 1,5 a 3 segundos, flutuam de volta e a palavra se recompõe.

### Uso

```tsx
"use client";
import ParticleText from "@/components/ui/particle-text";

export default function Hero() {
  return <ParticleText text="PCVP" className="h-[70svh] bg-neutral-950" />;
}
```

Personalizado:

```tsx
<ParticleText
  text={"MADE\nTO MOVE"}       // "\n" força quebra de linha
  glyphs="pcvp01"              // caracteres usados como partículas
  colors={["#fff", "#a3a3a3"]}
  gap={5}                      // mais denso
  cutRadius={20}               // lâmina mais larga
  inertia={0.5}                // arremesso mais forte
  anchorRows={1}               // só a 1ª linha do topo sustenta
  gravity={0.6}
  restMin={1000}
  restMax={2500}
  returnEase={0.04}
/>
```

### Props

| Prop | Tipo | Padrão | Descrição |
| --- | --- | --- | --- |
| `text` | `string` | — (obrigatória) | Texto principal. Acentos são suportados. Use `\n` para quebrar linha. Sem `\n`, o componente usa uma palavra por linha quando isso deixa o texto bem maior (por exemplo, no mobile). |
| `className` | `string` | — | Classes do wrapper. **Defina aqui a altura e o fundo** (padrão `h-[60svh] min-h-72 bg-neutral-950`). |
| `glyphs` | `string` | `a-z 0-9 #$%&*+=?!<>/` | Caracteres sorteados para cada partícula. |
| `colors` | `string[]` | `["#ffffff", "#e4e4e7", "#a1a1aa"]` | Cores dos glifos (branco e cinzas). Cada partícula recebe uma. |
| `gap` | `number` | `6` | Distância em px entre pixels amostrados. Menor = mais partículas. |
| `glyphScale` | `number` | `1.25` | Tamanho do glifo em relação ao `gap`. |
| `maxParticles` | `number` | `4500` | Limite de desempenho. Se for ultrapassado, o `gap` aumenta automaticamente. |
| `fontWeight` | `number \| string` | `900` | Peso da fonte do texto-máscara. |
| `fontFamily` | `string` | fonte herdada | Família da fonte do texto-máscara (padrão: a fonte CSS do wrapper, Geist). |
| `cutRadius` | `number` | `14` | Largura da "lâmina": distância em px do caminho do ponteiro que solta uma partícula. |
| `inertia` | `number` | `0.35` | Fração da velocidade do ponteiro injetada em `vx`/`vy` da partícula cortada. |
| `maxThrow` | `number` | `22` | Limite da velocidade de arremesso herdada (px/frame). |
| `airFriction` | `number` | `0.985` | Atrito do ar: `vx *= airFriction` a cada frame (1 = sem atrito). |
| `wallBounce` | `number` | `0.6` | Energia mantida ao bater numa parede lateral (`vx = -vx * wallBounce`). |
| `anchorRows` | `number` | `2` | Quantas linhas da grade, a partir do topo de cada peça (letra ou acento), são âncoras de sustentação. |
| `gravity` | `number` | `0.45` | Quanto `vy` aumenta por frame durante a queda (px/frame², a 60 fps). |
| `maxFallSpeed` | `number` | `16` | Velocidade máxima de queda (px/frame). |
| `restMin` | `number` (ms) | `1500` | Tempo mínimo parada no chão antes de voltar. |
| `restMax` | `number` (ms) | `3000` | Tempo máximo parada no chão. Cada partícula sorteia um valor entre `restMin` e `restMax`. |
| `returnEase` | `number` | `0.03` | Easing da flutuação de volta: `x += (targetX - x) * returnEase`. |
| `intro` | `boolean` | `true` | As partículas começam espalhadas e flutuam até formar a palavra ao montar. |

Todas as props de física (`cutRadius`, `inertia`, `maxThrow`, `gravity`, `maxFallSpeed`, `airFriction`, `wallBounce`, `restMin`, `restMax`, `returnEase`) podem mudar em tempo real sem recriar as partículas.

### Como funciona

1. **Máscara:** o texto é escrito em branco num canvas offscreen. O tamanho da fonte é calculado para caber no container, deixando uma faixa livre embaixo para o monte.
2. **Amostragem:** `getImageData` lê os pixels. A cada `gap` px, todo pixel com alpha acima de 128 vira uma partícula (com um leve deslocamento aleatório, para não parecer uma grade).
3. **Particle:** cada uma guarda `id, state, x, y, vx, vy, targetX, targetY, isAnchor, restUntil, char` e é desenhada com `ctx.fillText()` em fonte monoespaçada.
4. **Máquina de estados** (a cada `requestAnimationFrame`):

   ```
   idle ──corte | sem sustentação──▶ falling ──chão──▶ resting ──timer──▶ returning ──chegou──▶ idle
                                        ▲                                     │
                                        └────────corte | sem sustentação──────┘
   ```

   - **Corte:** uma partícula `idle` ou `returning` a menos de `cutRadius` do caminho do ponteiro vira `falling`. O corte usa o **segmento** entre a posição do ponteiro no frame anterior e a atual, então um movimento rápido não pula partículas.
   - **Inércia:** a velocidade do ponteiro (posição atual menos a anterior, suavizada) vezes `inertia` é injetada em `vx`/`vy`. Um corte rápido para a direita arremessa as letras para a direita.
   - **`falling`:** `vy += gravity` (até `maxFallSpeed`), `vx *= airFriction`, depois `x += vx; y += vy`. Nas paredes laterais, a partícula quica com `vx = -vx * wallBounce`.
   - **Chão / monte:** o chão é `canvas.height` menos a altura do monte daquela coluna. Cada glifo que pousa soma uma altura aleatória à sua coluna, então as letras se acumulam como areia.
   - **`resting`:** `vx = vy = 0` e um temporizador aleatório entre `restMin` e `restMax`.
   - **`returning`:** `x += (targetX - x) * returnEase` (o mesmo para `y`). A menos de 0,6 px do alvo, volta a `idle`.

5. **Integridade estrutural (grafo):**
   - **Malha:** na criação, cada partícula liga-se às vizinhas diretas na grade de amostragem: horizontais, verticais e diagonais (vizinhança 8-conexa, distância de até `gap·√2`). O grafo é guardado em formato CSR, em arrays tipados.
   - **Âncoras:** as `anchorRows` linhas do topo de **cada peça conexa** (cada letra e cada acento, como o `^` do Ô) têm `isAnchor = true`. Calcular por peça garante que letras de linhas mais baixas e acentos tenham sustentação própria.
   - **Flood fill:** no frame em que alguma partícula é cortada, roda uma BFS a partir de todas as âncoras ainda presas (`idle` ou `returning`), andando só por partículas presas.
   - **Regra da ilha:** toda partícula presa que a BFS **não alcançou** perdeu toda conexão com a sustentação e vira `falling` no mesmo instante. A ilha inteira recebe a mesma velocidade inicial (com um resquício da inércia do corte), então despenca como um bloco e se esfarela ao bater no chão. Uma única partícula ligando as partes basta para manter a estrutura.
   - **Custo:** a verificação é O(partículas + arestas), cerca de 4,5 mil nós e 30 mil arestas no máximo, e só roda nos frames em que houve corte. A marcação de visitados usa um carimbo de geração, então não é preciso limpar arrays entre buscas.

**Responsivo e desempenho:**
- A física é normalizada para 60 fps, então se comporta igual em telas de 60 ou 120 Hz.
- Um `ResizeObserver` recalcula as partículas quando o container muda de tamanho. As que estavam fora do lugar flutuam até o novo alvo.
- O canvas respeita o `devicePixelRatio` (limitado a 2×).
- A animação pausa quando o canvas sai da tela (`IntersectionObserver`).
- As cores ficam agrupadas, para trocar `fillStyle` poucas vezes por frame.
- **Touch (Touch Events):** o dedo corta igual ao mouse, em qualquer direção. Se o toque começa **sobre as letras** (caixa das letras + 28px de folga), o gesto inteiro é de corte e a rolagem desse gesto é cancelada. Se começa **fora** delas, a página rola normalmente, então a seção nunca prende o usuário no celular. Mouse e caneta continuam usando Pointer Events.
