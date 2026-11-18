import { cn } from "@/lib/utils";

/**
 * Fundo padrão dos retratos (comissão técnica, painéis de perfil): degradê
 * laranja → preto, grãos de areia pontilhados, sol de fim de tarde e linhas
 * da quadra. Cores fixas (theme-fixed). O anel 3D do elenco reproduz o mesmo
 * fundo no shader de `components/ui/spin-shutter.tsx`.
 *
 * Renderize como primeiro filho de um container `relative overflow-hidden`;
 * o conteúdo (foto PNG sem fundo, selos) vai por cima.
 */
export default function PortraitBackdrop({ lines = true, className }: { lines?: boolean; className?: string }) {
  return (
    <span aria-hidden className={cn("theme-fixed pointer-events-none absolute inset-0 bg-gradient-to-br from-[#ff6600] via-[#c2410c] to-[#3b1600]", className)}>
      {/* grãos de areia */}
      <span className="absolute inset-0 bg-[radial-gradient(circle,rgb(255_255_255/0.22)_0.8px,transparent_1.3px)] bg-[length:7px_7px] [mask-image:linear-gradient(to_top,black,transparent_85%)]" />
      {/* sol de fim de tarde */}
      <span className="absolute -top-1/4 -right-1/4 size-3/4 rounded-full bg-[radial-gradient(circle,rgb(255_183_3/0.55),transparent_65%)]" />
      {/* linhas da quadra em perspectiva */}
      {lines && (
        <svg className="absolute inset-x-0 bottom-0 h-1/2 w-full text-white/25" fill="none" preserveAspectRatio="none" viewBox="0 0 100 50">
          <path d="M18 2 H82 L98 48 H2 Z" stroke="currentColor" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
          <path d="M10 22 H90" stroke="currentColor" strokeDasharray="2 1.5" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
        </svg>
      )}
    </span>
  );
}
