-- Conteúdo editável da Home do PCVP (Bento Grid, Elenco e Comissão Técnica).
-- Um único registro (id = 'main') com o documento inteiro em JSON.
-- Rode uma vez no SQL Editor do Supabase. O site cria o registro 'main'
-- sozinho (a partir de config/site.ts) na primeira leitura, se ele não existir.

create table if not exists public.pcvp_bento_state (
  id         text        primary key,
  data       jsonb       not null,
  updated_at timestamptz not null default now()
);

-- RLS ligado e nenhuma policy: as chaves anon/authenticated (públicas) não
-- conseguem ler nem gravar. Só o servidor do site, com a service_role, acessa.
alter table public.pcvp_bento_state enable row level security;

-- Garante acesso da service_role pela API REST (projetos novos podem não
-- expor tabelas automaticamente).
grant select, insert, update on table public.pcvp_bento_state to service_role;
