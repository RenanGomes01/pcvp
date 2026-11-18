"use client";
/* eslint-disable react-hooks/immutability -- o grafo three.js é mutado imperativamente dentro do
   loop do R3F (useFrame), fora do render; o React Compiler não distingue isso. */

/**
 * PassageGallery — túnel 3D de fotos (React Three Fiber).
 *
 * Implementação própria, escrita do zero a partir da API pública documentada
 * do componente "Passage Gallery" do React Bits (mesmos props e defaults).
 *
 * Arquitetura:
 * - O túnel é uma seção retangular: `lanes` células no chão/teto e, nas
 *   paredes, quantas couberem na proporção do viewport (1 unidade = 1 célula).
 * - As linhas da grade são desenhadas por shader em 4 planos longos que
 *   acompanham a câmera (as linhas usam coordenadas de mundo, então o grid é
 *   infinito "de graça").
 * - Os azulejos vivem num ring buffer de N fatias. Cada fatia `s` do túnel
 *   ocupa o slot `s mod N`; quando a câmera avança, o slot que ficou para trás
 *   é reatribuído à fatia nova lá na frente. O conteúdo de cada célula
 *   (foto / acento / vazio) é um hash determinístico de (seed, fatia, célula),
 *   então ida e volta mostram sempre as mesmas fotos.
 * - Neblina, cantos arredondados, recorte "cover", motion blur e hover são
 *   feitos no fragment shader.
 */

import { cn } from "@/lib/utils";
import { useTexture } from "@react-three/drei";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import {
  type CSSProperties,
  type ReactNode,
  type Ref,
  Suspense,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";

/* ------------------------------------------------------------------ tipos */

export type PassageItem = { src: string; alt: string; title?: string };

export type PassageGalleryHandle = {
  /** Devolve a foto aberta ao seu lugar. */
  close: () => void;
  /** Move a câmera um número de células (negativo = recua). */
  travel: (cells: number) => void;
};

export type PassageGalleryProps = {
  items?: PassageItem[];
  colors?: [string, string];
  backgroundColor?: string;
  lanes?: number;
  gap?: number;
  radius?: number;
  photoFill?: number;
  accentFill?: number;
  lineOpacity?: number;
  fog?: number;
  speed?: number;
  boost?: number;
  blur?: number;
  look?: number;
  fov?: number;
  hover?: number;
  focusOnClick?: boolean;
  captions?: boolean;
  wheel?: boolean;
  interactive?: boolean;
  seed?: number;
  paused?: boolean;
  dpr?: number;
  ariaLabel?: string;
  onFocusChange?: (item: PassageItem | null, index: number) => void;
  ref?: Ref<PassageGalleryHandle>;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
};

type Config = Required<
  Omit<PassageGalleryProps, "items" | "onFocusChange" | "ref" | "children" | "className" | "style" | "ariaLabel">
> & {
  onFocus: (index: number) => void;
  root: HTMLDivElement | null;
};

/** Estado de entrada compartilhado entre os eventos DOM e o loop do R3F. */
type Ctrl = {
  px: number; // ponteiro em NDC (-1..1)
  py: number;
  inside: boolean;
  pending: number; // deslocamento pendente (células) vindo de wheel/drag/teclado
  held: boolean; // segurando o ponteiro → boost
  dragging: boolean;
  click: { x: number; y: number } | null;
  close: boolean;
  reduced: boolean;
};

/* -------------------------------------------------------------- constantes */

const SLICES = 34; // fatias no ring buffer (profundidade visível)
const BEHIND = 2; // fatias mantidas atrás da câmera
const FOG_K = 0.06;
const FOCUS_DIST = 1.4;
const FOCUS_TIME = 0.75; // s

/* ----------------------------------------------------------------- shaders */

const tileVert = /* glsl */ `
  varying vec2 vUv;
  varying vec3 vWorld;
  void main() {
    vUv = uv;
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

const tileFrag = /* glsl */ `
  uniform sampler2D uMap;
  uniform float uMode;        // 0 = foto, 1 = acento
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  uniform vec3 uBg;
  uniform float uBgAlpha;
  uniform float uImgAspect;
  uniform float uTileAspect;
  uniform vec2 uSize;
  uniform float uRadius;
  uniform float uFog;
  uniform float uHover;
  uniform float uBlur;
  uniform vec2 uBlurDir;
  uniform float uFocus;
  uniform float uDim;
  uniform float uVariant;
  varying vec2 vUv;
  varying vec3 vWorld;

  float sdRoundBox(vec2 p, vec2 b, float r) {
    vec2 q = abs(p) - b + r;
    return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
  }

  void main() {
    vec2 p = (vUv - 0.5) * uSize;
    float r = uRadius * 0.5 * min(uSize.x, uSize.y);
    float d = sdRoundBox(p, uSize * 0.5, r);
    float aa = max(fwidth(d), 1e-4);
    float mask = 1.0 - smoothstep(-aa, aa, d);
    if (mask <= 0.0) discard;

    vec3 col;
    if (uMode < 0.5) {
      // recorte "cover" da imagem dentro do azulejo
      float ratio = uImgAspect / uTileAspect;
      vec2 uv = vUv - 0.5;
      if (ratio > 1.0) uv.x /= ratio; else uv.y *= ratio;
      uv += 0.5;
      // motion blur ao longo do eixo do túnel
      vec3 acc = vec3(0.0);
      for (int i = -2; i <= 2; i++) {
        acc += texture2D(uMap, uv + uBlurDir * uBlur * float(i) * 0.5).rgb;
      }
      col = acc / 5.0;
    } else {
      float a = uVariant * 6.2831853;
      float t = clamp(dot(vUv - 0.5, vec2(cos(a), sin(a))) + 0.5, 0.0, 1.0);
      col = mix(uColorA, uColorB, t);
    }

    col *= 1.0 + 0.35 * uHover;
    col *= 1.0 - 0.6 * uDim * (1.0 - uFocus);

    float dist = length(vWorld - cameraPosition);
    float f = (1.0 - exp(-pow(dist * ${FOG_K} * uFog, 2.0))) * (1.0 - uFocus);
    col = mix(col, uBg, f * uBgAlpha);
    float alpha = mask * mix(1.0, 1.0 - f, 1.0 - uBgAlpha);

    gl_FragColor = vec4(col, alpha);
    #include <colorspace_fragment>
  }
`;

const gridFrag = /* glsl */ `
  uniform vec3 uBg;
  uniform vec3 uLine;
  uniform float uBgAlpha;
  uniform float uOpacity;
  uniform float uFog;
  uniform float uDim;
  uniform float uMode;   // 0 = chão/teto (linhas em x), 1 = paredes (linhas em y)
  uniform vec2 uOffset;
  varying vec3 vWorld;

  float gridLine(float v) {
    float w = fwidth(v);
    float g = abs(fract(v - 0.5) - 0.5);
    return 1.0 - smoothstep(0.0, w * 0.85, g);
  }

  void main() {
    float a = uMode < 0.5 ? vWorld.x + uOffset.x : vWorld.y + uOffset.y;
    float l = max(gridLine(a), gridLine(vWorld.z)) * uOpacity * (1.0 - 0.6 * uDim);
    vec3 col = mix(uBg, uLine, l);
    float dist = length(vWorld - cameraPosition);
    float f = 1.0 - exp(-pow(dist * ${FOG_K} * uFog, 2.0));
    col = mix(col, uBg, f);
    float alpha = mix(1.0, l * (1.0 - f), 1.0 - uBgAlpha);
    gl_FragColor = vec4(col, alpha);
    #include <colorspace_fragment>
  }
`;

const gridVert = /* glsl */ `
  varying vec3 vWorld;
  void main() {
    vec4 w = modelMatrix * vec4(position, 1.0);
    vWorld = w.xyz;
    gl_Position = projectionMatrix * viewMatrix * w;
  }
`;

/* ----------------------------------------------------------------- helpers */

function hash(a: number, b: number, c: number, d: number) {
  let h = 2166136261;
  for (const v of [a, b, c, d]) {
    h ^= v | 0;
    h = Math.imul(h, 16777619);
    h ^= h >>> 13;
    h = Math.imul(h, 0x5bd1e995);
    h ^= h >>> 15;
  }
  return (h >>> 0) / 4294967296;
}

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));
const smoothstep = (a: number, b: number, v: number) => {
  const t = clamp((v - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
const easeInOutCubic = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

function parseBackground(value: string) {
  const v = value.trim().toLowerCase();
  const transparent = v === "transparent" || /^rgba?\(.*,\s*0(\.0+)?\s*\)$/.test(v) || /^#[0-9a-f]{6}00$/.test(v);
  const color = new THREE.Color();
  try {
    if (!transparent) color.setStyle(value);
  } catch {
    color.set("#0a0a0a");
  }
  return { color, alpha: transparent ? 0 : 1 };
}

/* ------------------------------------------------------------------- mundo */

type Cell = { x: number; y: number; n: THREE.Vector3; q: THREE.Quaternion; blur: THREE.Vector2 };

type TileData = {
  cell: Cell;
  kind: 0 | 1 | 2; // vazio | foto | acento
  item: number;
  hover: number;
  base: THREE.Vector3;
};

type TileMesh = THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial> & { userData: TileData };

function createWorld(lanes: number, rows: number) {
  const hw = lanes / 2;
  const hh = rows / 2;
  const group = new THREE.Group();

  const shared = {
    uBg: { value: new THREE.Color() },
    uBgAlpha: { value: 1 },
    uFog: { value: 1 },
    uBlur: { value: 0 },
    uDim: { value: 0 },
    uColorA: { value: new THREE.Color() },
    uColorB: { value: new THREE.Color() },
    uRadius: { value: 0.06 },
  };
  const gridShared = {
    uBg: shared.uBg,
    uBgAlpha: shared.uBgAlpha,
    uFog: shared.uFog,
    uDim: shared.uDim,
    uLine: { value: new THREE.Color(1, 1, 1) },
    uOpacity: { value: 0.12 },
  };

  // paredes com a grade
  const LEN = SLICES + BEHIND + 4;
  const planes: THREE.Mesh[] = [];
  const disposables: { dispose: () => void }[] = [];
  const wall = (w: number, h: number, mode: number, rx: number, ry: number, x: number, y: number) => {
    const geo = new THREE.PlaneGeometry(w, h);
    const mat = new THREE.ShaderMaterial({
      uniforms: { ...gridShared, uMode: { value: mode }, uOffset: { value: new THREE.Vector2(hw, hh) } },
      vertexShader: gridVert,
      fragmentShader: gridFrag,
      transparent: true,
      depthWrite: false,
    });
    const m = new THREE.Mesh(geo, mat);
    m.rotation.set(rx, ry, 0);
    m.position.set(x, y, 0);
    m.renderOrder = -1;
    group.add(m);
    planes.push(m);
    disposables.push(geo, mat);
  };
  wall(lanes, LEN, 0, -Math.PI / 2, 0, 0, -hh); // chão
  wall(lanes, LEN, 0, Math.PI / 2, 0, 0, hh); // teto
  wall(LEN, rows, 1, 0, Math.PI / 2, -hw, 0); // parede esquerda
  wall(LEN, rows, 1, 0, -Math.PI / 2, hw, 0); // parede direita

  // células do perímetro de uma fatia
  const cells: Cell[] = [];
  const add = (x: number, y: number, n: THREE.Vector3, up: THREE.Vector3, blur: THREE.Vector2) => {
    const right = new THREE.Vector3().crossVectors(up, n);
    const q = new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(right, up, n));
    cells.push({ x, y, n, q, blur });
  };
  const along = new THREE.Vector2(0, 1); // eixo do túnel no uv de chão/teto
  const side = new THREE.Vector2(1, 0); // eixo do túnel no uv das paredes
  const away = new THREE.Vector3(0, 0, -1);
  const upY = new THREE.Vector3(0, 1, 0);
  for (let i = 0; i < lanes; i++) {
    add(-hw + 0.5 + i, -hh, new THREE.Vector3(0, 1, 0), away, along);
    add(-hw + 0.5 + i, hh, new THREE.Vector3(0, -1, 0), away, along);
  }
  for (let j = 0; j < rows; j++) {
    add(-hw, -hh + 0.5 + j, new THREE.Vector3(1, 0, 0), upY, side);
    add(hw, -hh + 0.5 + j, new THREE.Vector3(-1, 0, 0), upY, side);
  }

  // pool de azulejos: SLICES × células
  const tileGeo = new THREE.PlaneGeometry(1, 1);
  disposables.push(tileGeo);
  const tiles: TileMesh[] = [];
  for (let k = 0; k < SLICES; k++) {
    for (const cell of cells) {
      const mat = new THREE.ShaderMaterial({
        uniforms: {
          ...shared,
          uMap: { value: null },
          uMode: { value: 0 },
          uImgAspect: { value: 1 },
          uTileAspect: { value: 1 },
          uSize: { value: new THREE.Vector2(1, 1) },
          uHover: { value: 0 },
          uFocus: { value: 0 },
          uVariant: { value: 0 },
          uBlurDir: { value: cell.blur },
        },
        vertexShader: tileVert,
        fragmentShader: tileFrag,
        transparent: true,
      });
      disposables.push(mat);
      const mesh = new THREE.Mesh(tileGeo, mat) as unknown as TileMesh;
      mesh.visible = false;
      mesh.userData = { cell, kind: 0, item: -1, hover: 0, base: new THREE.Vector3() };
      group.add(mesh);
      tiles.push(mesh);
    }
  }

  const slotSlice = new Float64Array(SLICES).fill(NaN);

  return {
    group,
    hw,
    hh,
    LEN,
    planes,
    tiles,
    cells,
    shared,
    gridShared,
    slotSlice,
    dispose: () => disposables.forEach((d) => d.dispose()),
  };
}

type World = ReturnType<typeof createWorld>;

/* ------------------------------------------------------------------- cena */

type Focus = { mesh: TileMesh; t: number; target: 0 | 1 };

function Scene({
  textures,
  lanes,
  cfgRef,
  ctrlRef,
}: {
  textures: THREE.Texture[];
  lanes: number;
  cfgRef: { current: Config };
  ctrlRef: { current: Ctrl };
}) {
  const size = useThree((s) => s.size);

  const rows = Math.max(2, Math.round((lanes * size.height) / Math.max(1, size.width)));
  const world = useMemo(() => createWorld(lanes, rows), [lanes, rows]);
  useEffect(() => () => world.dispose(), [world]);
  // o grafo three.js é imperativo: o loop acessa mundo/estado via refs
  const worldRef = useRef<World | null>(null);
  useLayoutEffect(() => {
    worldRef.current = world;
  }, [world]);

  // estado do movimento (sobrevive a rebuilds do mundo)
  const stRef = useRef({
    travel: 0,
    vel: 0,
    lookX: 0,
    lookY: 0,
    key: "",
    world: null as World | null,
    focus: null as Focus | null,
    cursor: "",
    bg: "",
    ndc: new THREE.Vector2(),
    tmpV: new THREE.Vector3(),
  });

  useFrame((three, rawDt) => {
    const w = worldRef.current;
    if (!w) return;
    const camera = three.camera as THREE.PerspectiveCamera;
    const { raycaster, gl } = three;
    const dt = Math.min(rawDt, 1 / 20);
    const cfg = cfgRef.current;
    const ctrl = ctrlRef.current;
    const st = stRef.current;
    const { tiles, cells, shared } = w;
    const P = cells.length;

    // mundo novo (mudou lanes/proporção): reatribui tudo
    if (st.world !== w) {
      st.world = w;
      st.key = "";
      st.bg = "";
      if (st.focus) {
        cfg.onFocus(-1);
        st.focus = null;
      }
    }

    /* uniforms globais */
    const bgKey = cfg.backgroundColor;
    if (st.bg !== bgKey) {
      st.bg = bgKey;
      const { color, alpha } = parseBackground(bgKey);
      gl.setClearColor(color, alpha);
      shared.uBg.value.copy(color);
      shared.uBgAlpha.value = alpha;
      const lum = color.r * 0.2126 + color.g * 0.7152 + color.b * 0.0722;
      w.gridShared.uLine.value.set(lum < 0.25 ? 0xffffff : 0x000000);
    }
    shared.uFog.value = cfg.fog;
    shared.uRadius.value = clamp(cfg.radius, 0, 1);
    shared.uColorA.value.set(cfg.colors[0]);
    shared.uColorB.value.set(cfg.colors[1]);
    w.gridShared.uOpacity.value = cfg.lineOpacity;

    /* movimento */
    const focused = st.focus !== null;
    const cruise = cfg.paused || ctrl.reduced || focused ? 0 : cfg.speed;
    const target = focused ? 0 : ctrl.held ? (cfg.speed || 0.6) * cfg.boost : cruise;
    st.vel += (target - st.vel) * (1 - Math.exp(-dt * (ctrl.held ? 3 : 2)));
    if (focused) ctrl.pending = 0;
    const move = ctrl.pending * (1 - Math.exp(-dt * 7));
    ctrl.pending -= move;
    st.travel += st.vel * dt + move;
    const effSpeed = Math.abs(st.vel + move / Math.max(dt, 1e-3));
    shared.uBlur.value = cfg.blur * 0.03 * smoothstep(2.5, 10, effSpeed);

    /* câmera + look */
    if (camera.fov !== cfg.fov) {
      camera.fov = cfg.fov;
      camera.updateProjectionMatrix();
    }
    const lookAmt = focused || !cfg.interactive ? 0 : cfg.look;
    const kLook = 1 - Math.exp(-dt * 4);
    st.lookX += (ctrl.px * lookAmt - st.lookX) * kLook;
    st.lookY += (ctrl.py * lookAmt - st.lookY) * kLook;
    camera.position.set(st.lookX * w.hw * 0.18, st.lookY * w.hh * 0.18, -st.travel);
    camera.rotation.set(st.lookY * 0.12, -st.lookX * 0.2, 0, "YXZ");
    camera.updateMatrixWorld();

    // a grade acompanha a câmera
    const planeZ = -st.travel - w.LEN / 2 + BEHIND + 1;
    w.planes.forEach((plane) => plane.position.setZ(planeZ));

    /* ring buffer: recicla fatias que ficaram para trás */
    const key = `${cfg.seed}|${cfg.photoFill}|${cfg.accentFill}|${textures.length}`;
    if (key !== st.key) {
      st.key = key;
      w.slotSlice.fill(NaN);
      if (st.focus) {
        st.focus.mesh.renderOrder = 0;
        st.focus.mesh.material.depthTest = true;
        st.focus = null;
        cfg.onFocus(-1);
      }
    }
    const base = Math.floor(st.travel) - BEHIND;
    for (let k = 0; k < SLICES; k++) {
      const s = base + ((((k - base) % SLICES) + SLICES) % SLICES);
      if (w.slotSlice[k] === s) continue;
      w.slotSlice[k] = s;
      for (let c = 0; c < P; c++) {
        const mesh = tiles[k * P + c];
        if (st.focus?.mesh === mesh) continue;
        const ud = mesh.userData;
        const u = mesh.material.uniforms;
        const r = hash(cfg.seed, s, c, 0);
        let kind: 0 | 1 | 2 = 0;
        if (textures.length && r < cfg.photoFill) kind = 1;
        else if (r >= cfg.photoFill && r < cfg.photoFill + cfg.accentFill) kind = 2;
        ud.kind = kind;
        ud.hover = 0;
        mesh.visible = kind !== 0;
        mesh.position.set(ud.cell.x, ud.cell.y, -(s + 0.5));
        ud.base.copy(mesh.position).addScaledVector(ud.cell.n, 0.003);
        mesh.quaternion.copy(ud.cell.q);
        if (kind === 1) {
          const idx = Math.floor(hash(cfg.seed, s, c, 1) * textures.length);
          const tex = textures[idx];
          const img = tex.image as { width?: number; height?: number } | undefined;
          ud.item = idx;
          u.uMode.value = 0;
          u.uMap.value = tex;
          u.uImgAspect.value = img?.width && img?.height ? img.width / img.height : 1;
        } else if (kind === 2) {
          ud.item = -1;
          u.uMode.value = 1;
          u.uMap.value = null;
          u.uVariant.value = hash(cfg.seed, s, c, 2);
        }
      }
    }

    /* hover (raycast) */
    let hovered: TileMesh | null = null;
    if (ctrl.inside && cfg.interactive && !ctrl.dragging && !focused && cfg.hover > 0) {
      st.ndc.set(ctrl.px, ctrl.py);
      raycaster.setFromCamera(st.ndc, camera);
      const visible = tiles.filter((t) => t.visible);
      hovered = (raycaster.intersectObjects(visible, false)[0]?.object as TileMesh | undefined) ?? null;
    }

    /* clique / fechar */
    const openFocus = (mesh: TileMesh) => {
      st.focus = { mesh, t: 0, target: 1 };
      mesh.renderOrder = 10;
      mesh.material.depthTest = false;
      cfg.onFocus(mesh.userData.item);
    };
    const closeFocus = () => {
      if (st.focus && st.focus.target === 1) {
        st.focus.target = 0;
        cfg.onFocus(-1);
      }
    };
    if (ctrl.click) {
      const c = ctrl.click;
      ctrl.click = null;
      if (st.focus) closeFocus();
      else if (cfg.focusOnClick && cfg.interactive) {
        st.ndc.set(c.x, c.y);
        raycaster.setFromCamera(st.ndc, camera);
        const photos = tiles.filter((t) => t.visible && t.userData.kind === 1);
        const hit = raycaster.intersectObjects(photos, false)[0]?.object as TileMesh | undefined;
        if (hit) openFocus(hit);
      }
    }
    if (ctrl.close) {
      ctrl.close = false;
      closeFocus();
    }

    /* atualização por azulejo (hover, escala, lift) */
    const g = clamp(1 - cfg.gap, 0.05, 1);
    const kHover = 1 - Math.exp(-dt * 10);
    for (const mesh of tiles) {
      if (!mesh.visible || st.focus?.mesh === mesh) continue;
      const ud = mesh.userData;
      ud.hover += ((mesh === hovered ? cfg.hover : 0) - ud.hover) * kHover;
      const u = mesh.material.uniforms;
      u.uHover.value = ud.hover;
      u.uFocus.value = 0;
      u.uTileAspect.value = 1;
      u.uSize.value.set(g, g);
      mesh.scale.set(g, g, 1);
      mesh.position.copy(ud.base).addScaledVector(ud.cell.n, 0.08 * ud.hover);
    }

    /* animação de foco: voa até a frente da câmera e volta */
    let dim = 0;
    if (st.focus) {
      const f = st.focus;
      f.t = clamp(f.t + ((f.target ? 1 : -1) * dt) / FOCUS_TIME, 0, 1);
      const e = easeInOutCubic(f.t);
      dim = e;
      const { mesh } = f;
      const ud = mesh.userData;
      const u = mesh.material.uniforms;
      const ia = u.uImgAspect.value as number;
      const vh = 2 * FOCUS_DIST * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2);
      const vw = vh * camera.aspect;
      const h = Math.min(vh * 0.72, (vw * 0.86) / ia);
      const tgt = st.tmpV.set(0, 0, -FOCUS_DIST).applyQuaternion(camera.quaternion).add(camera.position);
      mesh.position.lerpVectors(ud.base, tgt, e);
      mesh.quaternion.slerpQuaternions(ud.cell.q, camera.quaternion, e);
      const sx = THREE.MathUtils.lerp(g, h * ia, e);
      const sy = THREE.MathUtils.lerp(g, h, e);
      mesh.scale.set(sx, sy, 1);
      u.uSize.value.set(sx, sy);
      u.uTileAspect.value = sx / sy;
      u.uFocus.value = e;
      u.uHover.value = 0;
      if (f.target === 0 && f.t === 0) {
        mesh.renderOrder = 0;
        mesh.material.depthTest = true;
        st.focus = null;
      }
    }
    shared.uDim.value = dim;

    /* cursor */
    const cursor = st.focus
      ? "zoom-out"
      : !cfg.interactive
        ? "default"
        : ctrl.dragging
          ? "grabbing"
          : hovered?.userData.kind === 1 && cfg.focusOnClick
            ? "pointer"
            : "grab";
    if (cfg.root && st.cursor !== cursor) {
      st.cursor = cursor;
      cfg.root.style.cursor = cursor;
    }
  });

  return <primitive object={world.group} />;
}

function TexturedScene({ urls, ...rest }: { urls: string[] } & Omit<Parameters<typeof Scene>[0], "textures">) {
  const loaded = useTexture(urls, (textures) => {
    for (const t of Array.isArray(textures) ? textures : [textures]) {
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      t.needsUpdate = true;
    }
  }) as THREE.Texture[];
  return <Scene textures={loaded} {...rest} />;
}

/* --------------------------------------------------------------- componente */

const NO_TEXTURES: THREE.Texture[] = [];

export default function PassageGallery({
  items = [],
  colors = ["#5227FF", "#FF9FFC"],
  backgroundColor = "#0a0a0a",
  lanes = 5,
  gap = 0.1,
  radius = 0.06,
  photoFill = 0.3,
  accentFill = 0.06,
  lineOpacity = 0.12,
  fog = 1,
  speed = 0.6,
  boost = 10,
  blur = 1,
  look = 1,
  fov = 72,
  hover = 1,
  focusOnClick = true,
  captions = true,
  wheel = true,
  interactive = true,
  seed = 0,
  paused = false,
  dpr = 2,
  ariaLabel = "Túnel de fotos. Role ou arraste para navegar, segure para acelerar e clique numa foto para abri-la.",
  onFocusChange,
  ref,
  children,
  className,
  style,
}: PassageGalleryProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const ctrlRef = useRef<Ctrl>({
    px: 0,
    py: 0,
    inside: false,
    pending: 0,
    held: false,
    dragging: false,
    click: null,
    close: false,
    reduced: false,
  });
  const [focusIdx, setFocusIdx] = useState(-1);
  const [inView, setInView] = useState(true);

  const cfgRef = useRef<Config>(null as unknown as Config);
  useLayoutEffect(() => {
    cfgRef.current = {
      colors,
      backgroundColor,
      lanes,
      gap,
      radius,
      photoFill,
      accentFill,
      lineOpacity,
      fog,
      speed,
      boost,
      blur,
      look,
      fov,
      hover,
      focusOnClick,
      captions,
      wheel,
      interactive,
      seed,
      paused,
      dpr,
      root: rootRef.current,
      onFocus: (i) => {
        setFocusIdx(i);
        onFocusChange?.(i >= 0 ? (items[i] ?? null) : null, i);
      },
    };
  });

  useImperativeHandle(
    ref,
    () => ({
      close: () => {
        ctrlRef.current.close = true;
      },
      travel: (cells: number) => {
        ctrlRef.current.pending += cells;
      },
    }),
    []
  );

  // prefers-reduced-motion: nunca navega sozinho
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      ctrlRef.current.reduced = mq.matches;
    };
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // pausa o render fora da tela
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setInView(e.isIntersecting), { rootMargin: "100px" });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // ponteiro: look, arrastar, segurar (boost) e clicar
  useEffect(() => {
    const el = rootRef.current;
    if (!el || !interactive) return;
    const ctrl = ctrlRef.current;
    let down: { x: number; y: number; t: number; id: number } | null = null;
    let last = { x: 0, y: 0 };
    let holdTimer = 0;

    const toNdc = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      ctrl.px = clamp(((e.clientX - r.left) / r.width) * 2 - 1, -1, 1);
      ctrl.py = clamp(-(((e.clientY - r.top) / r.height) * 2 - 1), -1, 1);
      return r;
    };
    const reset = () => {
      window.clearTimeout(holdTimer);
      down = null;
      ctrl.held = false;
      ctrl.dragging = false;
    };
    const onDown = (e: PointerEvent) => {
      if (e.pointerType === "mouse" && e.button !== 0) return;
      toNdc(e);
      ctrl.inside = true;
      down = { x: e.clientX, y: e.clientY, t: performance.now(), id: e.pointerId };
      last = { x: e.clientX, y: e.clientY };
      try {
        el.setPointerCapture(e.pointerId);
      } catch {}
      holdTimer = window.setTimeout(() => {
        if (down && !ctrl.dragging) ctrl.held = true;
      }, 170);
    };
    const onMove = (e: PointerEvent) => {
      const r = toNdc(e);
      ctrl.inside = true;
      if (!down || e.pointerId !== down.id) return;
      if (!ctrl.dragging && Math.hypot(e.clientX - down.x, e.clientY - down.y) > 6) {
        ctrl.dragging = true;
        ctrl.held = false;
        window.clearTimeout(holdTimer);
      }
      if (ctrl.dragging) {
        // mouse: puxar para baixo avança · touch: arrastar para a esquerda avança
        // (no touch o eixo vertical fica livre para rolar a página)
        const delta = e.pointerType === "touch" ? last.x - e.clientX : e.clientY - last.y;
        ctrl.pending += (delta * 4) / Math.max(1, r.height);
      }
      last = { x: e.clientX, y: e.clientY };
    };
    const onUp = (e: PointerEvent) => {
      if (!down || e.pointerId !== down.id) return;
      const quick = performance.now() - down.t < 300;
      if (!ctrl.dragging && quick) ctrl.click = { x: ctrl.px, y: ctrl.py };
      reset();
    };
    const onLeave = () => {
      if (down) return;
      ctrl.inside = false;
      ctrl.px = 0;
      ctrl.py = 0;
    };
    const onWheel = (e: WheelEvent) => {
      if (!wheel) return;
      e.preventDefault();
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? el.clientHeight : 1;
      ctrl.pending += e.deltaY * unit * 0.005;
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") ctrl.close = true;
      if (e.target !== el) return;
      if (e.key === "ArrowDown" || e.key === "PageDown") {
        ctrl.pending += 1;
        e.preventDefault();
      } else if (e.key === "ArrowUp" || e.key === "PageUp") {
        ctrl.pending -= 1;
        e.preventDefault();
      }
    };

    el.addEventListener("pointerdown", onDown);
    el.addEventListener("pointermove", onMove);
    el.addEventListener("pointerup", onUp);
    el.addEventListener("pointercancel", reset);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKey);
    return () => {
      reset();
      el.removeEventListener("pointerdown", onDown);
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerup", onUp);
      el.removeEventListener("pointercancel", reset);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKey);
    };
  }, [interactive, wheel]);

  const urls = useMemo(() => items.map((i) => i.src), [items]);
  const laneCount = Math.max(1, Math.round(lanes));
  const focused = focusIdx >= 0 ? items[focusIdx] : null;

  return (
    <div
      aria-label={ariaLabel}
      aria-roledescription="galeria 3D"
      className={cn(
        "relative h-full min-h-[420px] w-full touch-pan-y overflow-hidden outline-none select-none focus-visible:ring-2 focus-visible:ring-white/40",
        className
      )}
      data-lenis-prevent={wheel && interactive ? "" : undefined}
      ref={rootRef}
      role="region"
      style={{ background: backgroundColor, ...style }}
      tabIndex={interactive ? 0 : -1}
    >
      <Canvas
        camera={{ fov, near: 0.05, far: 120, position: [0, 0, 0] }}
        dpr={[1, dpr]}
        flat
        frameloop={inView ? "always" : "never"}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ position: "absolute", inset: 0 }}
      >
        <Suspense fallback={null}>
          {urls.length ? (
            <TexturedScene cfgRef={cfgRef} ctrlRef={ctrlRef} lanes={laneCount} urls={urls} />
          ) : (
            <Scene cfgRef={cfgRef} ctrlRef={ctrlRef} lanes={laneCount} textures={NO_TEXTURES} />
          )}
        </Suspense>
      </Canvas>

      {children && (
        <div
          className={cn(
            "pointer-events-none absolute inset-0 grid place-items-center transition-opacity duration-500",
            focused && "opacity-0"
          )}
        >
          {children}
        </div>
      )}

      {captions && (
        <div
          aria-live="polite"
          className={cn(
            "pointer-events-none absolute inset-x-0 bottom-6 flex flex-col items-center gap-1 text-center transition-all duration-500",
            focused ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
          )}
        >
          {focused && (
            <>
              <p className="text-sm font-medium text-white">{focused.title ?? focused.alt}</p>
              <p className="font-mono text-xs text-white/50">
                {String(focusIdx + 1).padStart(2, "0")} / {String(items.length).padStart(2, "0")}
              </p>
            </>
          )}
        </div>
      )}
    </div>
  );
}
