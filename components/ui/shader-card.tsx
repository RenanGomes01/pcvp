"use client";
/* eslint-disable react-hooks/immutability -- o material/uniforms three.js são mutados imperativamente
   dentro do loop do R3F (useFrame), fora do render; o React Compiler não distingue isso. */

/**
 * ShaderCard — cartão com uma chama luminosa em GLSL subindo por trás do conteúdo.
 *
 * Implementação própria, escrita do zero a partir da API pública documentada do
 * "Shader Card" do React Bits (mesmos props e defaults). Nenhum código do
 * React Bits Pro foi copiado.
 *
 * Camadas:
 *  1. card (motion.div): fundo, cantos e inclinação 3D em direção ao ponteiro;
 *  2. chama (Canvas R3F): um plano de tela cheia com o fragment shader. A saída
 *     é pré-multiplicada (rgb > alpha = brilho aditivo), então a chama "acende"
 *     sobre qualquer cor de fundo do card;
 *  3. conteúdo (children): desloca-se contra a chama ao inclinar (parallax).
 */

import { useNearViewport } from "@/lib/use-near-viewport";
import { cn } from "@/lib/utils";
import { Canvas, useFrame } from "@react-three/fiber";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import {
  type CSSProperties,
  type ReactNode,
  type Ref,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import * as THREE from "three";

/* ------------------------------------------------------------------ tipos */

export type ShaderCardHandle = { replay: () => void };

export type ShaderCardProps = {
  width?: number | string;
  height?: number | string;
  borderRadius?: string;
  color?: string;
  highlightColor?: string;
  backgroundColor?: string;
  speed?: number;
  positionY?: number;
  scale?: number;
  effectRadius?: number;
  effectBoost?: number;
  edgeMin?: number;
  edgeMax?: number;
  falloffPower?: number;
  noiseScale?: number;
  widthFactor?: number;
  waveAmount?: number;
  branchIntensity?: number;
  verticalExtent?: number;
  horizontalExtent?: number;
  contours?: number;
  flash?: number;
  blur?: number;
  intensity?: number;
  bloom?: number;
  grain?: number;
  fade?: number;
  opacity?: number;
  interactive?: boolean;
  tiltStrength?: number;
  parallax?: number;
  hoverRise?: number;
  intro?: boolean;
  autoPlay?: boolean;
  paused?: boolean;
  dpr?: number;
  /** GLSL que substitui a chama. Recebe os mesmos uniforms (uTime, uRes, uColor, uHighlight, uHover, uPointer, uIntro…) e `varying vec2 vUv`. */
  fragmentShader?: string;
  ref?: Ref<ShaderCardHandle>;
  children?: ReactNode;
  className?: string;
  style?: CSSProperties;
};

type FlameConfig = Required<
  Omit<
    ShaderCardProps,
    | "width"
    | "height"
    | "borderRadius"
    | "backgroundColor"
    | "highlightColor"
    | "fragmentShader"
    | "ref"
    | "children"
    | "className"
    | "style"
    | "tiltStrength"
    | "parallax"
    | "dpr"
  >
> & { highlightColor?: string };

type Ctrl = {
  hover: boolean;
  hoverV: number;
  px: number;
  py: number;
  time: number;
  intro: number;
  introStarted: boolean;
  reduced: boolean;
};

/* ----------------------------------------------------------------- shaders */

const VERT = /* glsl */ `
  varying vec2 vUv;
  void main() {
    vUv = uv;
    gl_Position = vec4(position.xy, 0.0, 1.0);
  }
`;

const FLAME = /* glsl */ `
  precision highp float;
  uniform float uTime;
  uniform vec2 uRes;
  uniform vec3 uColor;
  uniform vec3 uHighlight;
  uniform float uPosY;
  uniform float uScale;
  uniform float uRadius;
  uniform float uBoost;
  uniform float uEdgeMin;
  uniform float uEdgeMax;
  uniform float uFalloff;
  uniform float uNoiseScale;
  uniform float uWidth;
  uniform float uWave;
  uniform float uBranch;
  uniform float uVExt;
  uniform float uHExt;
  uniform float uContours;
  uniform float uFlash;
  uniform float uSoft;
  uniform float uIntensity;
  uniform float uBloom;
  uniform float uGrain;
  uniform float uFade;
  uniform float uOpacity;
  uniform float uHover;
  uniform float uHoverRise;
  uniform float uIntro;
  uniform vec2 uPointer;
  varying vec2 vUv;

  float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
  }
  float noise(vec2 p) {
    vec2 i = floor(p), f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
               mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
  }
  float fbm(vec2 p) {
    float v = 0.0, a = 0.5;
    mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
    for (int i = 0; i < 5; i++) { v += a * noise(p); p = m * p; a *= 0.5; }
    return v;
  }

  void main() {
    vec2 uv = vUv;
    float aspect = uRes.x / max(uRes.y, 1.0);
    float t = uTime;

    // espaço da chama: x centrado, y a partir da base; "scale" = zoom
    vec2 p = vec2((uv.x - 0.5) * aspect, uv.y) * (uScale / 4.0);
    float rise = (uIntro - 1.0) * 1.3 + uPosY * 0.25 + uHover * uHoverRise * 0.035;
    p.y -= rise;

    // balanço (cresce com a altura) e inclinação em direção ao ponteiro
    float h = max(p.y, 0.0);
    p.x += sin(p.y * 3.0 - t * 1.7) * uWave * h;
    p.x -= uPointer.x * 0.15 * uHover * h;

    // domain warping + línguas de fogo subindo
    vec2 q = vec2(fbm(p * uNoiseScale + vec2(0.0, -t * 1.2)),
                  fbm(p * uNoiseScale * 1.3 + vec2(5.2, -t * 1.6)));
    float tongues = fbm(vec2(p.x * uBranch * 1.5, p.y * 0.9 - t * 1.1) + q * 1.5);

    // envelope: elipse ancorada na base
    vec2 e = vec2(p.x / (0.35 * uWidth * uHExt / 1.5), p.y / (0.9 * uVExt / 1.5));
    float env = 1.0 - length(e) / max(uRadius, 0.01);
    float field = env + (tongues - 0.5) * uBranch * 0.35 + (q.x - 0.5) * 0.6 + uBoost * 0.4 - 0.2;

    // limiar de borda: edgeMin na base → edgeMax na ponta
    float thr = mix(uEdgeMin, uEdgeMax, clamp(p.y / (uVExt * 0.9), 0.0, 1.0)) * 0.35;
    float soft = uSoft + 0.012;
    float mask = smoothstep(thr - soft, thr + soft, field);
    float x = clamp((field - thr) / 0.7, 0.0, 1.0);
    float body = 1.0 - pow(1.0 - x, max(uFalloff, 0.05));

    // bordas brilhantes + curvas de nível finas
    float edge = exp(-abs(field - thr) / (0.025 + soft)) * mask;
    float c = abs(fract(field * 5.0 - t * 0.4) - 0.5);
    float contour = (1.0 - smoothstep(0.0, 0.05 + soft * 2.0, c)) * uContours * mask * (1.0 - body * 0.5);

    // pulso periódico
    float fl = uFlash * pow(0.5 + 0.5 * sin(t * 0.9), 16.0);
    float gain = uIntensity * (1.0 + fl * 0.8 + uHover * uHoverRise * 0.2);

    vec3 col = (uColor * body * 0.9 + uHighlight * (edge * 0.9 + contour * 0.35)) * gain;
    float a = mask * max(body, 0.35);

    // bloom: halo que vaza das bordas mais claras
    float halo = exp(-max(thr - field, 0.0) * 5.0) * (1.0 - mask) * uBloom;
    col += mix(uColor, uHighlight, 0.5) * halo * 0.45 * gain;
    a = max(a, halo * 0.25);

    // grão
    col += (hash(uv * uRes + fract(t * 7.13) * 100.0) - 0.5) * uGrain * 0.3 * a;

    // some perto do topo (legibilidade do texto)
    float fadeMask = 1.0 - smoothstep(1.0 - uFade, 1.0 - uFade * 0.2, uv.y);
    float k = fadeMask * uOpacity * smoothstep(0.0, 0.25, uIntro);
    col = max(col, 0.0) * k;
    a = clamp(a * k, 0.0, 1.0);

    // saída pré-multiplicada (rgb > a = brilho aditivo)
    gl_FragColor = vec4(col, a);
  }
`;

/* ----------------------------------------------------------------- helpers */

const toCss = (v: number | string | undefined) => (typeof v === "number" ? `${v}px` : v);
const easeOutCubic = (t: number) => 1 - Math.pow(1 - t, 3);
const srgb = (c: THREE.Color, target: THREE.Vector3) => {
  const o = { r: 0, g: 0, b: 0 };
  c.getRGB(o, THREE.SRGBColorSpace);
  return target.set(o.r, o.g, o.b);
};

/* ------------------------------------------------------------------- chama */

function Flame({
  cfgRef,
  ctrlRef,
  fragment,
}: {
  cfgRef: { current: FlameConfig };
  ctrlRef: { current: Ctrl };
  fragment?: string;
}) {
  const material = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: VERT,
        fragmentShader: fragment ?? FLAME,
        transparent: true,
        premultipliedAlpha: true,
        depthTest: false,
        depthWrite: false,
        uniforms: {
          uTime: { value: 0 },
          uRes: { value: new THREE.Vector2(1, 1) },
          uColor: { value: new THREE.Vector3() },
          uHighlight: { value: new THREE.Vector3() },
          uPosY: { value: 0 },
          uScale: { value: 4 },
          uRadius: { value: 0.9 },
          uBoost: { value: 0.5 },
          uEdgeMin: { value: 0 },
          uEdgeMax: { value: 1 },
          uFalloff: { value: 2 },
          uNoiseScale: { value: 1.5 },
          uWidth: { value: 1.5 },
          uWave: { value: 0.15 },
          uBranch: { value: 2 },
          uVExt: { value: 1.5 },
          uHExt: { value: 1.5 },
          uContours: { value: 1 },
          uFlash: { value: 0.6 },
          uSoft: { value: 0 },
          uIntensity: { value: 1 },
          uBloom: { value: 0.8 },
          uGrain: { value: 0.25 },
          uFade: { value: 0.6 },
          uOpacity: { value: 1 },
          uHover: { value: 0 },
          uHoverRise: { value: 1 },
          uIntro: { value: 1 },
          uPointer: { value: new THREE.Vector2() },
        },
      }),
    [fragment]
  );
  useEffect(() => () => material.dispose(), [material]);

  const colorRef = useRef({ key: "", base: new THREE.Color(), hi: new THREE.Color() });

  useFrame((state, rawDt) => {
    const dt = Math.min(rawDt, 1 / 20);
    const cfg = cfgRef.current;
    const c = ctrlRef.current;
    const u = material.uniforms;

    // hover suave
    const hoverTarget = c.hover && cfg.interactive ? 1 : 0;
    c.hoverV += (hoverTarget - c.hoverV) * (1 - Math.exp(-dt * 4));

    // tempo (velocidade integrada, então mudar speed não "pula")
    const running = !cfg.paused && !c.reduced && (cfg.autoPlay || c.hoverV > 0.01);
    if (running) c.time += dt * cfg.speed * (1 + 0.8 * c.hoverV * cfg.hoverRise);
    if (c.reduced && c.time === 0) c.time = 2.4; // quadro estático bonito

    // intro: a chama sobe ao aparecer
    if (!cfg.intro || c.reduced) c.intro = 1;
    else if (c.introStarted && c.intro < 1) c.intro = Math.min(1, c.intro + dt / 1.8);

    // cores (só recalcula quando mudam)
    const key = `${cfg.color}|${cfg.highlightColor ?? ""}`;
    const cr = colorRef.current;
    if (cr.key !== key) {
      cr.key = key;
      cr.base.set(cfg.color);
      if (cfg.highlightColor) cr.hi.set(cfg.highlightColor);
      else cr.hi.copy(cr.base).lerp(new THREE.Color("#fff3c4"), 0.6); // mais claro e mais quente
      srgb(cr.base, u.uColor.value);
      srgb(cr.hi, u.uHighlight.value);
    }

    u.uTime.value = c.time;
    u.uRes.value.set(state.size.width, state.size.height);
    u.uPosY.value = cfg.positionY;
    u.uScale.value = cfg.scale;
    u.uRadius.value = cfg.effectRadius;
    u.uBoost.value = cfg.effectBoost;
    u.uEdgeMin.value = cfg.edgeMin;
    u.uEdgeMax.value = cfg.edgeMax;
    u.uFalloff.value = cfg.falloffPower;
    u.uNoiseScale.value = cfg.noiseScale;
    u.uWidth.value = cfg.widthFactor;
    u.uWave.value = cfg.waveAmount;
    u.uBranch.value = cfg.branchIntensity;
    u.uVExt.value = cfg.verticalExtent;
    u.uHExt.value = cfg.horizontalExtent;
    u.uContours.value = cfg.contours;
    u.uFlash.value = cfg.flash;
    u.uSoft.value = (cfg.blur / Math.max(state.size.height, 1)) * 3; // blur em px → suavidade no campo
    u.uIntensity.value = cfg.intensity;
    u.uBloom.value = cfg.bloom;
    u.uGrain.value = cfg.grain;
    u.uFade.value = cfg.fade;
    u.uOpacity.value = cfg.opacity;
    u.uHover.value = c.hoverV;
    u.uHoverRise.value = cfg.hoverRise;
    u.uIntro.value = easeOutCubic(c.intro);
    u.uPointer.value.set(c.px, c.py);
  });

  return (
    <mesh frustumCulled={false}>
      <planeGeometry args={[2, 2]} />
      <primitive attach="material" object={material} />
    </mesh>
  );
}

/* --------------------------------------------------------------- componente */

export default function ShaderCard({
  width = 400,
  height = 500,
  borderRadius = "12px",
  color = "#5227FF",
  highlightColor,
  backgroundColor = "var(--card, #171717)",
  speed = 0.5,
  positionY = 0,
  scale = 4,
  effectRadius = 0.9,
  effectBoost = 0.5,
  edgeMin = 0,
  edgeMax = 1,
  falloffPower = 2,
  noiseScale = 1.5,
  widthFactor = 1.5,
  waveAmount = 0.15,
  branchIntensity = 2,
  verticalExtent = 1.5,
  horizontalExtent = 1.5,
  contours = 1,
  flash = 0.6,
  blur = 4,
  intensity = 1,
  bloom = 0.8,
  grain = 0.25,
  fade = 0.6,
  opacity = 1,
  interactive = true,
  tiltStrength = 8,
  parallax = 1,
  hoverRise = 1,
  intro = true,
  autoPlay = true,
  paused = false,
  dpr = 2,
  fragmentShader,
  ref,
  children,
  className,
  style,
}: ShaderCardProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  // o contexto WebGL só existe perto da tela (ver lib/use-near-viewport)
  const nearView = useNearViewport(cardRef);
  const ctrlRef = useRef<Ctrl>({
    hover: false,
    hoverV: 0,
    px: 0,
    py: 0,
    time: 0,
    intro: 0,
    introStarted: false,
    reduced: false,
  });

  const cfgRef = useRef<FlameConfig>(null as unknown as FlameConfig);
  useLayoutEffect(() => {
    cfgRef.current = {
      color,
      highlightColor,
      speed,
      positionY,
      scale,
      effectRadius,
      effectBoost,
      edgeMin,
      edgeMax,
      falloffPower,
      noiseScale,
      widthFactor,
      waveAmount,
      branchIntensity,
      verticalExtent,
      horizontalExtent,
      contours,
      flash,
      blur,
      intensity,
      bloom,
      grain,
      fade,
      opacity,
      interactive,
      hoverRise,
      intro,
      autoPlay,
      paused,
    };
  });

  useImperativeHandle(ref, () => ({
    replay: () => {
      ctrlRef.current.intro = 0;
      ctrlRef.current.introStarted = true;
    },
  }), []);

  // reduced motion → chama estática
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => {
      ctrlRef.current.reduced = mq.matches;
    };
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // só renderiza (e só começa a intro) quando o card aparece
  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        setInView(e.isIntersecting);
        if (e.isIntersecting && e.intersectionRatio > 0.25) ctrlRef.current.introStarted = true;
      },
      { threshold: [0, 0.25] }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // tilt + parallax (molas do motion)
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const spring = { stiffness: 160, damping: 20, mass: 0.6 };
  const sx = useSpring(mx, spring);
  const sy = useSpring(my, spring);
  const rotateY = useTransform(sx, (v) => v * tiltStrength);
  const rotateX = useTransform(sy, (v) => -v * tiltStrength);
  const contentX = useTransform(sx, (v) => v * 14 * parallax);
  const contentY = useTransform(sy, (v) => -v * 10 * parallax);
  const flameX = useTransform(sx, (v) => -v * 10 * parallax);
  const flameY = useTransform(sy, (v) => v * 6 * parallax);

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!interactive || e.pointerType === "touch") return;
    const r = e.currentTarget.getBoundingClientRect();
    const nx = ((e.clientX - r.left) / r.width) * 2 - 1;
    const ny = -(((e.clientY - r.top) / r.height) * 2 - 1);
    mx.set(nx);
    my.set(ny);
    ctrlRef.current.px = nx;
    ctrlRef.current.py = ny;
    ctrlRef.current.hover = true;
  };
  const onLeave = () => {
    mx.set(0);
    my.set(0);
    ctrlRef.current.hover = false;
  };

  return (
    <div className="[perspective:1400px]" style={{ width: toCss(width) }}>
      <motion.div
        className={cn("relative isolate overflow-hidden", className)}
        onPointerLeave={onLeave}
        onPointerMove={onMove}
        ref={cardRef}
        style={{
          height: toCss(height),
          borderRadius,
          background: backgroundColor,
          rotateX: interactive ? rotateX : 0,
          rotateY: interactive ? rotateY : 0,
          ...style,
        }}
      >
        {/* chama (um pouco maior que o card para o parallax não mostrar bordas) */}
        <motion.div
          aria-hidden
          className="pointer-events-none absolute -inset-[4%]"
          style={{ x: flameX, y: flameY }}
        >
          {nearView && (
            <Canvas
              dpr={[1, dpr]}
              flat
              frameloop={inView ? "always" : "never"}
              gl={{ alpha: true, antialias: false, premultipliedAlpha: true, powerPreference: "high-performance" }}
              onCreated={({ gl }) => gl.setClearColor(0x000000, 0)}
              style={{ position: "absolute", inset: 0 }}
            >
              <Flame cfgRef={cfgRef} ctrlRef={ctrlRef} fragment={fragmentShader} />
            </Canvas>
          )}
        </motion.div>

        {/* conteúdo com parallax */}
        <motion.div className="relative z-10 h-full" style={{ x: contentX, y: contentY }}>
          {children}
        </motion.div>
      </motion.div>
    </div>
  );
}
