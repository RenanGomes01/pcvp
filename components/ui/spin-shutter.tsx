"use client";
/* eslint-disable react-hooks/immutability -- uniforms, refs de controle e motion values são
   mutados imperativamente no useFrame (loop do R3F, fora do ciclo de render do React). */

/**
 * SpinShutter — órbita 3D de fotografias (React Three Fiber).
 *
 * Visual: cada card é a foto PNG sem fundo (cover) composta pelo alfa sobre o
 * fundo padrão dos retratos (degradê laranja → preto, pontilhado de areia, sol
 * e linhas da quadra — o mesmo do PortraitBackdrop da comissão técnica), com
 * cantos arredondados (`radius`) recortados no shader. Sem foto, só o fundo. Nenhum texto no 3D:
 * o nome do card em foco aparece em HTML, abaixo do canvas.
 *
 * Geometria (Rz · Rx · Ry): o anel fica no plano XZ e gira em Y; um grupo
 * interno o inclina em X (`tilt`, vemos o anel "de cima") e um externo o gira
 * no plano da tela (`roll`), então a órbita atravessa a tela na diagonal. A
 * câmera fica a `distance` raios do centro.
 *
 * Contra-rotação (billboard): só as POSIÇÕES seguem a órbita. A cada frame,
 * cada card recebe como rotação local o inverso da rotação acumulada dos pais
 * (Rz·Rx·Ry)⁻¹, ficando com rotação zero no mundo: sempre de pé e de frente
 * para a câmera, não importa o tilt, o roll ou o giro.
 *
 * Movimento:
 *  - Intro "fan-out": todas as cartas começam empilhadas no ângulo 0 (frente)
 *    e o ângulo de cada uma desliza de 0 até (i / n)·2π (mola), num único
 *    sentido, como um leque se abrindo até fechar o anel.
 *  - Giro lento automático (`speed`). Hover pausa e destaca; `isPaused`
 *    (ex.: painel de perfil aberto) congela o ângulo.
 *  - Arrastar na horizontal gira (com inércia); na transversal inclina o anel
 *    (tilt) e o giro rápido o faz "deitar" para o lado (roll). Ao soltar, uma
 *    mola (`animate` do motion) faz o anel quicar de volta à inclinação
 *    original; depois de uma pausa curta, o giro automático volta.
 *
 * Profundidade de campo + névoa (sem pós-processamento): a cada frame mede-se
 * a profundidade Z real de cada card até a câmera, e o desfoque cresce com a
 * distância até o card da FRENTE: só 1–3 cards ficam nítidos, o resto borra
 * forte. O card sob o mouse — e só ele — fica 100% nítido (transição suave);
 * os demais continuam na regra de distância. O hover não atravessa cards
 * (stopPropagation no over/out/click), então o de trás não reage junto:
 *  - a foto é amostrada num disco de 12 pontos (ângulo áureo) sobre um mipmap
 *    mais baixo → bokeh suave, não pixelado;
 *  - a borda do card se espalha (o plano tem uma margem extra para isso), então
 *    até o fundo vira uma mancha (pontilhado e linhas somem com o desfoque);
 *  - névoa: cards do fundo escurecem e ficam translúcidos.
 * `aperture` escala tudo isso (0 = tudo nítido).
 */

import { Canvas, type ThreeEvent, useFrame, useThree } from "@react-three/fiber";
import { useNearViewport } from "@/lib/use-near-viewport";
import { cn } from "@/lib/utils";
import { animate, AnimatePresence, motion, type MotionValue, motionValue } from "motion/react";
import { type PointerEvent as ReactPointerEvent, useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

export type SpinShutterItem = {
  /** Nome exibido na legenda abaixo da órbita. */
  title: string;
  /** Linha secundária da legenda. */
  subtitle?: string;
  /** Foto (PNG sem fundo). Sem ela, o card mostra só o fundo laranja padrão. */
  src?: string;
};

export interface SpinShutterProps {
  items: readonly SpinShutterItem[];
  /** Recebe o índice em `items` do card clicado (ou da legenda). */
  onSelect?: (index: number) => void;
  /** Inclinação do anel em X, em graus (positivo = vemos o anel de cima). */
  tilt?: number;
  /** Rotação diagonal do anel no plano da tela, em graus (negativo = desce para a direita). */
  roll?: number;
  /** Distância da câmera ao centro do anel, em raios da órbita. Em telas estreitas aumenta sozinha. */
  distance?: number;
  /** Intensidade do desfoque/névoa dos cards de trás (0 = tudo nítido, 1–1.5 = forte). */
  aperture?: number;
  /** Congela o giro (ex.: enquanto o painel de perfil está aberto). */
  isPaused?: boolean;
  /** Raio dos cantos do card, em fração da largura (0–0.5). */
  radius?: number;
  /** Velocidade do giro automático (rad/s; 0.05 ≈ uma volta a cada 2 min). Negativo inverte. */
  speed?: number;
  /** Animação de entrada em leque. */
  intro?: boolean;
  /** Repete os itens até ter pelo menos esta quantidade de cards no anel. */
  minCards?: number;
  /** Classes do wrapper (órbita + legenda). */
  className?: string;
  /** Classes da área do canvas (defina a altura aqui). */
  canvasClassName?: string;
  ariaLabel?: string;
}

const CARD_W = 1.5;
const CARD_H = 2.1;
/** Margem do plano ao redor do card, onde a borda desfocada se espalha. */
const PAD = 0.2;
const FOV = 32;
/** Raio mínimo da órbita (cresce com a quantidade de cards). */
const MIN_ORBIT = 4.8;
/** Espaço de cada card no perímetro, em larguras de card (1 = encostados). */
const SPACING = 1.35;
const DRAG_THRESHOLD = 6; // px: acima disso o gesto é arraste, não clique
const RESUME_DELAY = 1100; // ms parado depois de soltar, antes de voltar a girar
const MAX_TILT = THREE.MathUtils.degToRad(28);
const MAX_ROLL = THREE.MathUtils.degToRad(16);
/** Mola do "quique" de volta à inclinação original. */
const BOUNCE = { type: "spring", stiffness: 210, damping: 9, mass: 1 } as const;
/** Mola da abertura em leque. */
const FAN = { type: "spring", stiffness: 42, damping: 11, mass: 1 } as const;

const TAU = Math.PI * 2;

/* -------------------------------------------------------------------------- */
/*                                   shader                                   */
/* -------------------------------------------------------------------------- */

const vertexShader = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform sampler2D map;
  uniform float uHasMap;
  uniform float uImageAspect; // largura / altura da foto
  uniform float uCardAspect;  // largura / altura do card
  uniform vec2 uPadScale;     // tamanho do plano / tamanho do card
  uniform float uRadius;      // raio do canto (fração da largura)
  uniform float uBlur;        // desfoque do card (0 = nítido; calculado no useFrame)
  uniform float uHaze;        // névoa 0..1
  uniform float uHover;
  varying vec2 vUv;

  float roundedBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  float segDist(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a, ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
  }

  /**
   * Fundo padrão dos retratos (espelha o PortraitBackdrop em HTML):
   * degradê laranja → preto na diagonal, sol no canto superior direito,
   * grãos de areia pontilhados (somem para cima) e linhas da quadra.
   * uv: 0..1 no card, y para cima. Os detalhes finos somem com o desfoque.
   */
  vec3 backdrop(vec2 uv, float blur) {
    vec2 tl = vec2(uv.x, 1.0 - uv.y); // y para baixo, como no CSS
    float detail = 1.0 - clamp(blur * 1.6, 0.0, 1.0);

    // bg-gradient-to-br from-[#ff6600] via-[#c2410c] to-[#3b1600]
    float g = clamp((tl.x * uCardAspect + tl.y) / (uCardAspect + 1.0), 0.0, 1.0);
    vec3 c0 = vec3(1.0, 0.4, 0.0);
    vec3 c1 = vec3(0.761, 0.255, 0.047);
    vec3 c2 = vec3(0.231, 0.086, 0.0);
    vec3 col = g < 0.5 ? mix(c0, c1, g * 2.0) : mix(c1, c2, g * 2.0 - 1.0);

    // sol de fim de tarde (rgb(255 183 3 / 0.55))
    vec2 sd = (tl - vec2(0.875, 0.125)) / vec2(0.375, 0.375 / uCardAspect);
    float sun = 1.0 - smoothstep(0.0, 0.92, length(sd));
    col = mix(col, vec3(1.0, 0.718, 0.012), 0.55 * sun);

    // grãos de areia: grade de pontos em coordenadas do card
    vec2 gp = vec2(tl.x * uCardAspect, tl.y) * 30.0;
    vec2 cell = fract(gp) - 0.5;
    float dd = length(cell);
    float aa = fwidth(dd) * 0.8 + 0.02;
    float grain = 1.0 - smoothstep(0.12, 0.12 + aa, dd);
    float fade = smoothstep(0.15, 1.0, tl.y); // mask: forte embaixo, some no topo
    col = mix(col, vec3(1.0), 0.22 * grain * fade * detail);

    // linhas da quadra (metade de baixo; viewBox 100x50)
    if (tl.y > 0.5) {
      vec2 q = vec2(tl.x * 100.0, (tl.y - 0.5) * 100.0);
      float ld = min(min(segDist(q, vec2(18.0, 2.0), vec2(82.0, 2.0)), segDist(q, vec2(82.0, 2.0), vec2(98.0, 48.0))),
                     min(segDist(q, vec2(98.0, 48.0), vec2(2.0, 48.0)), segDist(q, vec2(2.0, 48.0), vec2(18.0, 2.0))));
      float dash = step(fract((q.x - 10.0) / 3.5), 2.0 / 3.5) * step(10.0, q.x) * step(q.x, 90.0);
      ld = min(ld, mix(1e3, abs(q.y - 22.0), dash));
      float lw = fwidth(q.y) * 0.9;
      float line = 1.0 - smoothstep(lw * 0.5, lw * 1.5, ld);
      col = mix(col, vec3(1.0), 0.25 * line * detail);
    }
    return col;
  }

  void main() {
    float blur = uBlur;

    // coordenadas em "alturas de card", centradas; o plano tem margem (uPadScale)
    vec2 cardSize = vec2(uCardAspect, 1.0);
    vec2 p = (vUv - 0.5) * cardSize * uPadScale;

    // borda: cantos arredondados + espalhamento proporcional ao blur
    float feather = min(blur * 0.07, 0.085);
    float d = roundedBox(p, cardSize * 0.5, uRadius * uCardAspect);
    float aa = fwidth(d) * 1.2;
    float mask = 1.0 - smoothstep(-aa - feather, aa + feather, d);
    if (mask <= 0.002) discard;

    vec2 uv = clamp(p / cardSize + 0.5, 0.0, 1.0);

    // fundo padrão dos retratos (igual ao PortraitBackdrop da comissão técnica)
    vec3 color = backdrop(uv, blur);

    if (uHasMap > 0.5) {
      // "object-fit: cover"
      vec2 st = uv - 0.5;
      if (uImageAspect > uCardAspect) st.x *= uCardAspect / uImageAspect;
      else st.y *= uImageAspect / uCardAspect;
      st += 0.5;
      // bokeh: disco de 12 amostras (ângulo áureo) sobre um mipmap mais baixo.
      // Acumula em alfa pré-multiplicado: o PNG sem fundo guarda uma cor
      // qualquer nos pixels transparentes, que não pode vazar para o card.
      float rad = blur * 0.11;
      float bias = blur * 5.0;
      vec4 t0 = texture2D(map, st, bias);
      vec4 acc = vec4(t0.rgb * t0.a, t0.a);
      for (int i = 0; i < 12; i++) {
        float fi = float(i);
        float ang = fi * 2.39996;
        float rr = sqrt((fi + 0.5) / 12.0) * rad;
        vec4 ts = texture2D(map, st + vec2(cos(ang), sin(ang) * uCardAspect) * rr, bias);
        acc += vec4(ts.rgb * ts.a, ts.a);
      }
      acc /= 13.0;
      color = color * (1.0 - acc.a) + acc.rgb;
    }

    // névoa: fora de foco escurece e fica translúcido
    color *= mix(1.0, 0.42, uHaze);
    color *= mix(1.0, 1.06, uHover);
    gl_FragColor = vec4(color, mask * mix(1.0, 0.38, uHaze));
  }
`;

/* -------------------------------------------------------------------------- */
/*                                  texturas                                  */
/* -------------------------------------------------------------------------- */

type Photo = { texture: THREE.Texture; aspect: number } | null;

/** Carrega as fotos (sem Suspense: o card mostra só o fundo até a foto chegar). */
function usePhotos(items: readonly SpinShutterItem[]): Photo[] {
  const [bySrc, setBySrc] = useState<Record<string, Photo>>({});
  const srcKey = items.map((i) => i.src ?? "").join("|");
  useEffect(() => {
    let alive = true;
    const loaded: THREE.Texture[] = [];
    const loader = new THREE.TextureLoader();
    for (const src of new Set(srcKey.split("|").filter(Boolean))) {
      loader.load(src, (tex) => {
        if (!alive) return tex.dispose();
        tex.generateMipmaps = true;
        tex.minFilter = THREE.LinearMipmapLinearFilter;
        tex.anisotropy = 4;
        loaded.push(tex);
        const img = tex.image as { width: number; height: number };
        setBySrc((prev) => ({ ...prev, [src]: { texture: tex, aspect: img.width / Math.max(1, img.height) } }));
      });
    }
    return () => {
      alive = false;
      loaded.forEach((t) => t.dispose());
    };
  }, [srcKey]);
  return items.map((i) => (i.src ? (bySrc[i.src] ?? null) : null));
}

/* -------------------------------------------------------------------------- */
/*                                    cena                                    */
/* -------------------------------------------------------------------------- */

type Ctrl = {
  /** rotação acumulada do anel */
  angle: number;
  /** velocidade extra vinda do arraste (rad/s) */
  dragVel: number;
  dragging: boolean;
  /** distância percorrida no gesto atual (px) — distingue clique de arraste */
  moved: number;
  hovered: number | null;
  /** giro automático só volta depois deste instante (performance.now) */
  resumeAt: number;
  /** slot em foco (o da frente ou o sob o mouse) → legenda */
  focus: number;
  /** meshes por slot (registrados pelos Cards; transformados pela Orbit) */
  meshes: (THREE.Mesh | null)[];
};

type Springs = { intro: MotionValue<number>; tiltOff: MotionValue<number>; rollOff: MotionValue<number> };

const EMPTY_TEXTURE = new THREE.Texture();

function Card({
  slot,
  itemIndex,
  corner,
  photo,
  ctrl,
  onHover,
  onPick,
}: {
  slot: number;
  itemIndex: number;
  corner: number;
  photo: Photo;
  ctrl: React.RefObject<Ctrl>;
  onHover: (slot: number | null) => void;
  onPick: (itemIndex: number) => void;
}) {
  const mesh = useRef<THREE.Mesh>(null);
  const uniforms = useMemo(
    () => ({
      map: { value: EMPTY_TEXTURE as THREE.Texture },
      uHasMap: { value: 0 },
      uImageAspect: { value: 1 },
      uCardAspect: { value: CARD_W / CARD_H },
      uPadScale: { value: new THREE.Vector2((CARD_W + PAD * 2) / CARD_W, (CARD_H + PAD * 2) / CARD_H) },
      uRadius: { value: corner },
      uBlur: { value: 0 },
      uHaze: { value: 0 },
      uHover: { value: 0 },
    }),
    // valores dinâmicos são atualizados no useFrame
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [slot]
  );

  // a Orbit posiciona, contra-rotaciona e desfoca este mesh a cada frame
  useEffect(() => {
    const c = ctrl.current;
    c.meshes[slot] = mesh.current;
    return () => {
      c.meshes[slot] = null;
    };
  }, [ctrl, slot]);

  useFrame(() => {
    const m = mesh.current;
    if (!m) return;
    // lê do material (não do useMemo): no StrictMode o memo roda duas vezes e o
    // material pode ter ficado com a outra cópia dos uniforms
    const u = (m.material as THREE.ShaderMaterial).uniforms as typeof uniforms;
    u.map.value = photo?.texture ?? EMPTY_TEXTURE;
    u.uHasMap.value = photo ? 1 : 0;
    u.uImageAspect.value = photo?.aspect ?? 1;
    u.uRadius.value = corner;
  });

  return (
    <mesh
      onClick={(e: ThreeEvent<MouseEvent>) => {
        e.stopPropagation();
        if (ctrl.current.moved < DRAG_THRESHOLD) onPick(itemIndex);
      }}
      onPointerOut={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        if (ctrl.current.hovered === slot) onHover(null);
      }}
      onPointerOver={(e: ThreeEvent<PointerEvent>) => {
        e.stopPropagation();
        if (e.pointerType === "mouse") onHover(slot);
      }}
      ref={mesh}
    >
      <planeGeometry args={[CARD_W + PAD * 2, CARD_H + PAD * 2]} />
      <shaderMaterial
        depthWrite={false}
        fragmentShader={fragmentShader}
        transparent
        uniforms={uniforms}
        vertexShader={vertexShader}
      />
    </mesh>
  );
}

/** Rotação da pilha inicial (fixa por slot), em radianos. */
const scatterOf = (slot: number) => ((Math.sin(slot * 12.9898) * 43758.5453) % 1) * 0.35;

// temporários reaproveitados no useFrame (sem alocação por frame)
const _parentQ = new THREE.Quaternion();
const _invQ = new THREE.Quaternion();
const _scatterQ = new THREE.Quaternion();
const _zAxis = new THREE.Vector3(0, 0, 1);
const _world = new THREE.Vector3();

function Orbit({
  slots,
  photos,
  orbitRadius,
  corner,
  tilt,
  roll,
  distance,
  speed,
  aperture,
  isPaused,
  ctrl,
  springs,
  onHover,
  onPick,
  onFocus,
}: {
  slots: number[];
  photos: Photo[];
  orbitRadius: number;
  corner: number;
  tilt: number;
  roll: number;
  distance: number;
  speed: number;
  aperture: number;
  isPaused: boolean;
  ctrl: React.RefObject<Ctrl>;
  springs: Springs;
  onHover: (slot: number | null) => void;
  onPick: (itemIndex: number) => void;
  onFocus: (slot: number) => void;
}) {
  const rollGroup = useRef<THREE.Group>(null);
  const tiltGroup = useRef<THREE.Group>(null);
  const spin = useRef<THREE.Group>(null);
  const autoSpeed = useRef(0);
  const { camera, size } = useThree();

  // ângulos finais (i / n)·2π: o slot 0 fica na frente e o leque abre num só sentido
  const angles = useMemo(() => slots.map((_, i) => (i / slots.length) * TAU), [slots]);
  const depths = useMemo(() => new Float32Array(slots.length), [slots]);

  const tiltRad = THREE.MathUtils.degToRad(tilt);
  const rollRad = THREE.MathUtils.degToRad(roll);

  // câmera a `distance` raios; em telas estreitas recua para a diagonal caber
  const aspect = size.width / Math.max(1, size.height);
  const camZ = distance * orbitRadius * Math.max(1, 1.5 / aspect);
  // desfoque pela distância (em Z da câmera) além do card da frente:
  // nítido até `sharp` (o card da frente e, no máximo, os vizinhos imediatos),
  // blur máximo a `sharp + range` (~±60°) e dali para trás
  const sharp = orbitRadius * 0.07;
  const range = orbitRadius * 0.38;
  // com o tilt, a metade da frente (maior e mais perto) desce na tela: sobe o
  // anel para a órbita ficar centrada verticalmente no canvas
  const lift = orbitRadius * Math.sin(tiltRad) * 0.45;

  useEffect(() => {
    camera.position.set(0, 0, camZ);
    camera.lookAt(0, 0, 0);
    camera.updateProjectionMatrix();
  }, [camera, camZ]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const c = ctrl.current;
    const now = performance.now();
    const introDone = springs.intro.get() > 0.98;

    if (isPaused) {
      // painel aberto: ângulo congelado; ao fechar, o giro volta acelerando do zero
      autoSpeed.current = 0;
      c.dragVel = 0;
    } else {
      // giro automático: parado na intro, no hover, no arraste e na pausa após soltar
      const paused = !introDone || c.hovered !== null || c.dragging || now < c.resumeAt;
      autoSpeed.current += ((paused ? 0 : speed) - autoSpeed.current) * (1 - Math.exp(-dt * 2.5));
      if (!c.dragging) c.dragVel *= Math.exp(-dt * 3.5); // inércia do arraste
      c.angle += (autoSpeed.current + c.dragVel) * dt;
    }

    // Ry (giro) dentro de Rx (tilt) dentro de Rz (roll diagonal)
    const sp = spin.current;
    if (!sp) return;
    sp.rotation.y = c.angle;
    if (tiltGroup.current) tiltGroup.current.rotation.x = tiltRad + springs.tiltOff.get();
    if (rollGroup.current) rollGroup.current.rotation.z = rollRad + springs.rollOff.get();

    // rotação acumulada dos pais (atualiza as matrizes) e seu inverso
    sp.getWorldQuaternion(_parentQ);
    _invQ.copy(_parentQ).invert();

    const p = springs.intro.get();
    const stack = 1 - Math.min(1, Math.max(0, p));
    const n = slots.length;

    // 1) posição na órbita (fan-out) + contra-rotação + profundidade real
    let front = 0;
    let frontDepth = Infinity;
    for (let i = 0; i < n; i++) {
      const m = c.meshes[i];
      if (!m) continue;
      const a = angles[i] * p;
      m.position.set(Math.sin(a) * orbitRadius, 0, Math.cos(a) * orbitRadius - i * 0.012 * stack);
      // local = (rotação dos pais)⁻¹ · (leve giro da pilha, só na intro)
      _scatterQ.setFromAxisAngle(_zAxis, scatterOf(i) * stack);
      m.quaternion.copy(_invQ).multiply(_scatterQ);
      // profundidade = distância em Z até a câmera (câmera em z = camZ, olhando -Z)
      _world.copy(m.position).applyMatrix4(sp.matrixWorld);
      depths[i] = camZ - _world.z;
      if (depths[i] < frontDepth) {
        frontDepth = depths[i];
        front = i;
      }
    }

    // 2) desfoque + névoa: distância até o card da frente; o card sob o mouse
    //    (e só ele) zera o desfoque via `h`, os outros seguem a regra
    const hoverK = 1 - Math.exp(-dt * 10);
    for (let i = 0; i < n; i++) {
      const m = c.meshes[i];
      if (!m) continue;
      const u = (m.material as THREE.ShaderMaterial).uniforms;
      const h = u.uHover.value + ((c.hovered === i ? 1 : 0) - u.uHover.value) * hoverK;
      u.uHover.value = h;
      const k = THREE.MathUtils.smoothstep(depths[i] - frontDepth, sharp, sharp + range) * (1 - h);
      u.uBlur.value = k * aperture;
      u.uHaze.value = Math.min(1, k * aperture);
      const s = 1 + h * 0.07;
      m.scale.set(s, s, 1);
    }

    // legenda: o card sob o mouse; senão, o da frente
    const target = c.hovered !== null && c.meshes[c.hovered] ? c.hovered : front;

    // legenda: o card em foco
    if (target !== c.focus) {
      c.focus = target;
      onFocus(target);
    }
  });

  return (
    <group position={[0, lift, 0]}>
      <group ref={rollGroup}>
        <group ref={tiltGroup}>
          <group ref={spin}>
            {slots.map((itemIndex, slot) => (
              <Card
                corner={corner}
                ctrl={ctrl}
                itemIndex={itemIndex}
                key={slot}
                onHover={onHover}
                onPick={onPick}
                photo={photos[itemIndex] ?? null}
                slot={slot}
              />
            ))}
          </group>
        </group>
      </group>
    </group>
  );
}

/* -------------------------------------------------------------------------- */
/*                                  wrapper                                   */
/* -------------------------------------------------------------------------- */

export default function SpinShutter({
  items,
  onSelect,
  tilt = 16,
  roll = -24,
  distance = 2.7,
  aperture = 1.2,
  isPaused = false,
  radius = 0.08,
  speed = 0.05,
  intro = true,
  minCards = 16,
  className,
  canvasClassName,
  ariaLabel = "Órbita 3D de fotos",
}: SpinShutterProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const ctrl = useRef<Ctrl>({
    angle: 0,
    dragVel: 0,
    dragging: false,
    moved: 0,
    hovered: null,
    resumeAt: 0,
    focus: 0,
    meshes: [],
  });
  const springs = useMemo<Springs>(
    () => ({ intro: motionValue(intro ? 0 : 1), tiltOff: motionValue(0), rollOff: motionValue(0) }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );
  const drag = useRef({ x: 0, y: 0, t: 0, id: -1 });
  const [hovered, setHovered] = useState<number | null>(null);
  const [focusSlot, setFocusSlot] = useState(0);
  const [inView, setInView] = useState(false);
  const [reduced, setReduced] = useState(false);
  const photos = usePhotos(items);
  // o contexto WebGL só existe perto da tela; estado e texturas ficam aqui no pai
  const nearView = useNearViewport(rootRef);

  // slots do anel: repete os itens até `minCards` (passe 0 para nunca repetir)
  const slots = useMemo(() => {
    if (!items.length) return [];
    const n = Math.max(items.length, minCards);
    return Array.from({ length: n }, (_, i) => i % items.length);
  }, [items.length, minCards]);

  // raio mínimo para os cards não se sobreporem
  // anel grande em relação ao card → a órbita vira uma faixa fina na diagonal
  const r = Math.max(MIN_ORBIT, (slots.length * CARD_W * SPACING) / TAU);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: "80px" });
    io.observe(el);
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
    return () => io.disconnect();
  }, []);

  // intro: abre o leque quando a órbita aparece na tela. Se o efeito for
  // desmontado no meio (StrictMode, saiu da tela), a mola continua de onde parou.
  useEffect(() => {
    if (!inView || springs.intro.get() >= 1) return;
    if (reduced || !intro) {
      springs.intro.set(1);
      return;
    }
    const controls = animate(springs.intro, 1, { ...FAN, delay: springs.intro.get() === 0 ? 0.25 : 0 });
    return () => controls.stop();
  }, [inView, intro, reduced, springs]);

  const hover = (slot: number | null) => {
    ctrl.current.hovered = slot;
    setHovered(slot);
  };

  /* ---------- arraste: horizontal gira, transversal inclina ---------- */
  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    drag.current = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
    const c = ctrl.current;
    c.moved = 0;
    c.dragging = true;
    c.dragVel = 0;
    springs.tiltOff.stop();
    springs.rollOff.stop();
  };
  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const c = ctrl.current;
    if (!c.dragging || e.pointerId !== drag.current.id) return;
    const now = performance.now();
    const dx = e.clientX - drag.current.x;
    const dy = e.clientY - drag.current.y;
    const dt = Math.max(1, now - drag.current.t) / 1000;
    c.moved += Math.abs(dx) + Math.abs(dy);
    const width = rootRef.current?.clientWidth ?? 800;

    const dAngle = (dx / width) * Math.PI * 1.4;
    c.angle += dAngle;
    c.dragVel = c.dragVel * 0.5 + (dAngle / dt) * 0.5;

    // tilt segue o arraste vertical; roll "deita" o anel na direção do giro
    springs.tiltOff.set(THREE.MathUtils.clamp(springs.tiltOff.get() + dy * 0.004, -MAX_TILT, MAX_TILT));
    const rollTarget = THREE.MathUtils.clamp(-c.dragVel * 0.06, -MAX_ROLL, MAX_ROLL);
    springs.rollOff.set(springs.rollOff.get() + (rollTarget - springs.rollOff.get()) * 0.25);

    drag.current.x = e.clientX;
    drag.current.y = e.clientY;
    drag.current.t = now;
    if (c.moved > DRAG_THRESHOLD && !e.currentTarget.hasPointerCapture(e.pointerId)) {
      e.currentTarget.setPointerCapture(e.pointerId);
    }
  };
  const endDrag = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.pointerId !== drag.current.id) return;
    const c = ctrl.current;
    c.dragging = false;
    c.dragVel = THREE.MathUtils.clamp(c.dragVel, -4, 4);
    if (c.moved > DRAG_THRESHOLD) c.resumeAt = performance.now() + RESUME_DELAY;
    // quique de volta à inclinação original
    animate(springs.tiltOff, 0, BOUNCE);
    animate(springs.rollOff, 0, BOUNCE);
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };

  const focusItem = slots.length ? slots[focusSlot] : -1;
  const focused = focusItem >= 0 ? items[focusItem] : null;

  return (
    <div className={cn("relative w-full", className)} ref={rootRef}>
      <div
        aria-label={ariaLabel}
        aria-roledescription="carrossel 3D"
        className={cn(
          "relative h-[460px] w-full touch-pan-y select-none [mask-image:linear-gradient(90deg,transparent,#000_8%,#000_92%,transparent)]",
          hovered !== null ? "cursor-pointer" : "cursor-grab active:cursor-grabbing",
          canvasClassName
        )}
        onPointerCancel={endDrag}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        role="region"
      >
        {nearView && (
          <Canvas
            camera={{ fov: FOV, near: 0.1, far: 100, position: [0, 0, 16] }}
            dpr={[1, 1.75]}
            flat
            frameloop={inView ? "always" : "never"}
            gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
            style={{ position: "absolute", inset: 0 }}
          >
            <Orbit
              aperture={aperture}
              corner={THREE.MathUtils.clamp(radius, 0, 0.5)}
              ctrl={ctrl}
              onFocus={setFocusSlot}
              onHover={hover}
              onPick={(i) => onSelect?.(i)}
              distance={distance}
              isPaused={isPaused}
              orbitRadius={r}
              photos={photos}
              roll={roll}
              slots={slots}
              speed={reduced ? 0 : speed}
              springs={springs}
              tilt={tilt}
            />
          </Canvas>
        )}
      </div>

      {/* legenda do card em foco (HTML, fora do canvas) */}
      <div aria-live="polite" className="relative mt-2 flex h-16 flex-col items-center justify-start text-center">
        <AnimatePresence initial={false} mode="wait">
          {focused && (
            <motion.button
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              className="group flex flex-col items-center rounded-xl px-4 py-1 outline-none focus-visible:ring-2 focus-visible:ring-brand"
              exit={{ opacity: 0, y: -6, filter: "blur(4px)" }}
              initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
              key={focusItem}
              onClick={() => onSelect?.(focusItem)}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              type="button"
            >
              <span className="text-xl font-semibold tracking-tight text-white transition-colors group-hover:text-brand sm:text-2xl">
                {focused.title}
              </span>
              {focused.subtitle && <span className="text-sm text-neutral-400">{focused.subtitle}</span>}
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      {/* acesso por teclado / leitor de tela: os mesmos itens como botões */}
      <ul className="sr-only">
        {items.map((item, i) => (
          <li key={i}>
            <button onClick={() => onSelect?.(i)} type="button">
              {item.title}
              {item.subtitle ? `, ${item.subtitle}` : ""}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
