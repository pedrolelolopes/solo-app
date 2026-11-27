-- Solo 04: produtos e lotes (RLS por dono) + colunas novas em lista_hoje, itens_compra e sessoes_compra.
-- Idempotente: pode rodar mais de uma vez. Sem UUID, senha ou chave aqui.
-- Desfazer: 99c-rollback-produtos.sql
begin;

create table if not exists public.produtos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null check (char_length(nome) between 1 and 80),
  chave text not null,
  apelidos text[] not null default '{}',
  essencial boolean not null default false,
  urgencia text not null default 'sem_pressa' check (urgencia in ('amanha', 'semana', 'sem_pressa')),
  duracao_estimada_dias int null check (duracao_estimada_dias > 0),
  criado_em timestamptz not null default now(),
  unique (owner_id, chave)
);

create table if not exists public.lotes (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  produto_id uuid not null references public.produtos(id) on delete cascade,
  comprado_em date not null,
  inicio date not null,
  fim date null,
  preco_total numeric not null check (preco_total >= 0),
  qtd numeric not null default 1 check (qtd > 0),
  local_tipo text not null default 'mercado',
  criado_em timestamptz default now()
);
create index if not exists lotes_owner_produto_inicio_idx on public.lotes (owner_id, produto_id, inicio desc);

-- colunas novas nas tabelas antigas
alter table public.lista_hoje add column if not exists produto_id uuid null references public.produtos(id) on delete set null;
alter table public.lista_hoje add column if not exists origem text not null default 'anotada';
alter table public.itens_compra add column if not exists produto_id uuid null references public.produtos(id) on delete set null;
alter table public.itens_compra add column if not exists classe text null;
alter table public.itens_compra add column if not exists preco_kg numeric null;
alter table public.itens_compra add column if not exists peso_g numeric null;
alter table public.sessoes_compra add column if not exists local_tipo text not null default 'mercado';

-- regras de valores (so criam se ainda nao existem)
do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'lista_hoje_origem_check') then
    alter table public.lista_hoje add constraint lista_hoje_origem_check check (origem in ('anotada', 'sugerida'));
  end if;
  if not exists (select 1 from pg_constraint where conname = 'itens_compra_classe_check') then
    alter table public.itens_compra add constraint itens_compra_classe_check check (classe in ('planejado', 'esquecido_essencial', 'impulso'));
  end if;
end $$;

-- RLS: cada pessoa so ve e grava o que e dela
alter table public.produtos enable row level security;
drop policy if exists produtos_dono on public.produtos;
create policy produtos_dono on public.produtos for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
alter table public.lotes enable row level security;
drop policy if exists lotes_dono on public.lotes;
create policy lotes_dono on public.lotes for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- conferencia: esperado produtos e lotes com RLS true e 1 politica
select t.tablename as tabela,
       t.rowsecurity as rls_ligado,
       (select count(*) from pg_policies p where p.schemaname = t.schemaname and p.tablename = t.tablename) as politicas
from pg_tables t
where t.schemaname = 'public' and t.tablename in ('produtos', 'lotes')
order by t.tablename;
commit;
