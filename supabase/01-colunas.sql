-- Solo 01: cria owner_id e preenche com o dono certo. NAO liga RLS (o app antigo continua funcionando).
-- Placeholders __UUID_PEDRO__ e __UUID_ALINE__ sao trocados na copia local (.local/), nunca no repositorio.
begin;
alter table public.cardapio add column if not exists owner_id uuid default auth.uid() references auth.users(id);
alter table public.frequencia add column if not exists owner_id uuid default auth.uid() references auth.users(id);
alter table public.lista_hoje add column if not exists owner_id uuid default auth.uid() references auth.users(id);
alter table public.lista_permanente add column if not exists owner_id uuid default auth.uid() references auth.users(id);
alter table public.receitas add column if not exists owner_id uuid default auth.uid() references auth.users(id);
alter table public.sessoes_compra add column if not exists owner_id uuid default auth.uid() references auth.users(id);
alter table public.itens_compra add column if not exists owner_id uuid default auth.uid() references auth.users(id);
alter table public.ingredientes_receita add column if not exists owner_id uuid default auth.uid() references auth.users(id);

-- user_id antigo: 'aline' -> Aline; 'pedro' e vazio -> Pedro. frequencia (sem dono) -> Pedro.
update public.cardapio set owner_id = case when user_id = 'aline' then '__UUID_ALINE__'::uuid else '__UUID_PEDRO__'::uuid end where owner_id is null;
update public.lista_hoje set owner_id = case when user_id = 'aline' then '__UUID_ALINE__'::uuid else '__UUID_PEDRO__'::uuid end where owner_id is null;
update public.lista_permanente set owner_id = case when user_id = 'aline' then '__UUID_ALINE__'::uuid else '__UUID_PEDRO__'::uuid end where owner_id is null;
update public.receitas set owner_id = case when user_id = 'aline' then '__UUID_ALINE__'::uuid else '__UUID_PEDRO__'::uuid end where owner_id is null;
update public.sessoes_compra set owner_id = case when user_id = 'aline' then '__UUID_ALINE__'::uuid else '__UUID_PEDRO__'::uuid end where owner_id is null;
update public.frequencia set owner_id = '__UUID_PEDRO__'::uuid where owner_id is null;
update public.itens_compra i set owner_id = s.owner_id from public.sessoes_compra s where i.sessao_id = s.id and i.owner_id is null;
update public.ingredientes_receita i set owner_id = r.owner_id from public.receitas r where i.receita_id = r.id and i.owner_id is null;

-- frequencia: nome unico por pessoa, nao global
alter table public.frequencia drop constraint if exists frequencia_nome_key;
alter table public.frequencia add constraint frequencia_owner_nome_key unique (owner_id, nome);

-- conferencia: tudo deve mostrar 0 sem dono
select 'cardapio' as tabela, count(*) filter (where owner_id is null) as sem_dono, count(*) as total from public.cardapio
union all
select 'frequencia' as tabela, count(*) filter (where owner_id is null) as sem_dono, count(*) as total from public.frequencia
union all
select 'lista_hoje' as tabela, count(*) filter (where owner_id is null) as sem_dono, count(*) as total from public.lista_hoje
union all
select 'lista_permanente' as tabela, count(*) filter (where owner_id is null) as sem_dono, count(*) as total from public.lista_permanente
union all
select 'receitas' as tabela, count(*) filter (where owner_id is null) as sem_dono, count(*) as total from public.receitas
union all
select 'sessoes_compra' as tabela, count(*) filter (where owner_id is null) as sem_dono, count(*) as total from public.sessoes_compra
union all
select 'itens_compra' as tabela, count(*) filter (where owner_id is null) as sem_dono, count(*) as total from public.itens_compra
union all
select 'ingredientes_receita' as tabela, count(*) filter (where owner_id is null) as sem_dono, count(*) as total from public.ingredientes_receita;
commit;
