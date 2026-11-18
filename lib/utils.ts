export { cn } from "cn"

/** Links externos (http/https, ex.: WhatsApp) abrem em nova aba, com rel seguro. */
export function externalLinkProps(href: string) {
  return /^https?:\/\//.test(href) ? ({ target: "_blank", rel: "noopener noreferrer" } as const) : {};
}
