-- Solo 03: tabelas folhetos e comparativos (RLS por dono) + owner_id obrigatorio nas 8 tabelas antigas.
-- Idempotente: pode rodar mais de uma vez. Sem UUID, senha ou chave aqui.
-- Desfazer: 99b-rollback-folhetos.sql
begin;

-- (a) folhetos antiga: vazia e nunca usada pelo app. So some se tiver 0 linhas.
-- Se ja tem as colunas itens (jsonb) e owner_id, este script ja rodou: pula.
do $$
declare
  n bigint;
  ja_nova boolean;
begin
  if to_regclass('public.folhetos') is not null then
    select exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'folhetos'
        and column_name = 'itens' and data_type = 'jsonb'
    ) and exists (
      select 1 from information_schema.columns
      where table_schema = 'public' and table_name = 'folhetos'
        and column_name = 'owner_id'
    ) into ja_nova;
    if not ja_nova then
      execute 'select count(*) from public.folhetos' into n;
      if n > 0 then
        raise exception 'folhetos tem dados; pare e avise';
      end if;
      drop table public.folhetos;
    end if;
  end if;
end $$;

-- (b) tabelas novas
create table if not exists public.folhetos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  mercado text not null check (char_length(mercado) between 1 and 80),
  itens jsonb not null default '[]' check (case when jsonb_typeof(itens) = 'array' then jsonb_array_length(itens) <= 500 else false end),
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);
create table if not exists public.comparativos (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  criado_em timestamptz not null default now(),
  folheto_ids uuid[] not null,
  resultado jsonb not null,
  nota text not null
);
create index if not exists folhetos_owner_criado_idx on public.folhetos (owner_id, criado_em desc);
create index if not exists comparativos_owner_criado_idx on public.comparativos (owner_id, criado_em desc);

-- (c) RLS: cada pessoa so ve e grava o que e dela
alter table public.folhetos enable row level security;
drop policy if exists folhetos_dono on public.folhetos;
create policy folhetos_dono on public.folhetos for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
alter table public.comparativos enable row level security;
drop policy if exists comparativos_dono on public.comparativos;
create policy comparativos_dono on public.comparativos for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- (d) owner_id obrigatorio nas 8 tabelas antigas (so se nao houver linha sem dono)
do $$
begin
  if exists (select 1 from public.cardapio where owner_id is null) then
    raise notice 'cardapio tem owner_id nulo; nao foi alterada';
  else
    alter table public.cardapio alter column owner_id set not null;
  end if;
end $$;
do $$
begin
  if exists (select 1 from public.frequencia where owner_id is null) then
    raise notice 'frequencia tem owner_id nulo; nao foi alterada';
  else
    alter table public.frequencia alter column owner_id set not null;
  end if;
end $$;
do $$
begin
  if exists (select 1 from public.lista_hoje where owner_id is null) then
    raise notice 'lista_hoje tem owner_id nulo; nao foi alterada';
  else
    alter table public.lista_hoje alter column owner_id set not null;
  end if;
end $$;
do $$
begin
  if exists (select 1 from public.lista_permanente where owner_id is null) then
    raise notice 'lista_permanente tem owner_id nulo; nao foi alterada';
  else
    alter table public.lista_permanente alter column owner_id set not null;
  end if;
end $$;
do $$
begin
  if exists (select 1 from public.receitas where owner_id is null) then
    raise notice 'receitas tem owner_id nulo; nao foi alterada';
  else
    alter table public.receitas alter column owner_id set not null;
  end if;
end $$;
do $$
begin
  if exists (select 1 from public.sessoes_compra where owner_id is null) then
    raise notice 'sessoes_compra tem owner_id nulo; nao foi alterada';
  else
    alter table public.sessoes_compra alter column owner_id set not null;
  end if;
end $$;
do $$
begin
  if exists (select 1 from public.itens_compra where owner_id is null) then
    raise notice 'itens_compra tem owner_id nulo; nao foi alterada';
  else
    alter table public.itens_compra alter column owner_id set not null;
  end if;
end $$;
do $$
begin
  if exists (select 1 from public.ingredientes_receita where owner_id is null) then
    raise notice 'ingredientes_receita tem owner_id nulo; nao foi alterada';
  else
    alter table public.ingredientes_receita alter column owner_id set not null;
  end if;
end $$;

-- (e) conferencia: esperado folhetos = RLS true e 1 politica; comparativos idem
select t.tablename as tabela,
       t.rowsecurity as rls_ligado,
       (select count(*) from pg_policies p where p.schemaname = t.schemaname and p.tablename = t.tablename) as politicas
from pg_tables t
where t.schemaname = 'public' and t.tablename in ('folhetos', 'comparativos')
order by t.tablename;
commit;
