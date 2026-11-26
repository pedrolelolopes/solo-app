-- Solo 02: liga a protecao. Rode SO DEPOIS de o app novo estar no ar.
-- Placeholders trocados na copia local (.local/).
begin;
-- linhas criadas pelo app antigo entre as etapas
update public.cardapio set owner_id = case when user_id = 'aline' then '__UUID_ALINE__'::uuid else '__UUID_PEDRO__'::uuid end where owner_id is null;
update public.lista_hoje set owner_id = case when user_id = 'aline' then '__UUID_ALINE__'::uuid else '__UUID_PEDRO__'::uuid end where owner_id is null;
update public.lista_permanente set owner_id = case when user_id = 'aline' then '__UUID_ALINE__'::uuid else '__UUID_PEDRO__'::uuid end where owner_id is null;
update public.receitas set owner_id = case when user_id = 'aline' then '__UUID_ALINE__'::uuid else '__UUID_PEDRO__'::uuid end where owner_id is null;
update public.sessoes_compra set owner_id = case when user_id = 'aline' then '__UUID_ALINE__'::uuid else '__UUID_PEDRO__'::uuid end where owner_id is null;
update public.frequencia set owner_id = '__UUID_PEDRO__'::uuid where owner_id is null;
update public.itens_compra i set owner_id = s.owner_id from public.sessoes_compra s where i.sessao_id = s.id and i.owner_id is null;
update public.ingredientes_receita i set owner_id = r.owner_id from public.receitas r where i.receita_id = r.id and i.owner_id is null;

-- fecha a porta aberta (politica acesso_total) nas 9 tabelas
drop policy if exists acesso_total on public.cardapio;
drop policy if exists acesso_total on public.frequencia;
drop policy if exists acesso_total on public.lista_hoje;
drop policy if exists acesso_total on public.lista_permanente;
drop policy if exists acesso_total on public.receitas;
drop policy if exists acesso_total on public.sessoes_compra;
drop policy if exists acesso_total on public.itens_compra;
drop policy if exists acesso_total on public.ingredientes_receita;
drop policy if exists acesso_total on public.folhetos;

-- cada pessoa so ve e grava o que e dela
alter table public.cardapio enable row level security;
drop policy if exists cardapio_dono on public.cardapio;
create policy cardapio_dono on public.cardapio for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
alter table public.frequencia enable row level security;
drop policy if exists frequencia_dono on public.frequencia;
create policy frequencia_dono on public.frequencia for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
alter table public.lista_hoje enable row level security;
drop policy if exists lista_hoje_dono on public.lista_hoje;
create policy lista_hoje_dono on public.lista_hoje for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
alter table public.lista_permanente enable row level security;
drop policy if exists lista_permanente_dono on public.lista_permanente;
create policy lista_permanente_dono on public.lista_permanente for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
alter table public.receitas enable row level security;
drop policy if exists receitas_dono on public.receitas;
create policy receitas_dono on public.receitas for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
alter table public.sessoes_compra enable row level security;
drop policy if exists sessoes_compra_dono on public.sessoes_compra;
create policy sessoes_compra_dono on public.sessoes_compra for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
alter table public.itens_compra enable row level security;
drop policy if exists itens_compra_dono on public.itens_compra;
create policy itens_compra_dono on public.itens_compra for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
alter table public.ingredientes_receita enable row level security;
drop policy if exists ingredientes_receita_dono on public.ingredientes_receita;
create policy ingredientes_receita_dono on public.ingredientes_receita for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
-- folhetos (nao usada pelo app): RLS ligada e sem politica = ninguem acessa
alter table public.folhetos enable row level security;

-- conferencia: sem_dono deve ser 0 em todas
select 'cardapio' as tabela, count(*) filter (where owner_id is null) as sem_dono from public.cardapio
union all
select 'frequencia' as tabela, count(*) filter (where owner_id is null) as sem_dono from public.frequencia
union all
select 'lista_hoje' as tabela, count(*) filter (where owner_id is null) as sem_dono from public.lista_hoje
union all
select 'lista_permanente' as tabela, count(*) filter (where owner_id is null) as sem_dono from public.lista_permanente
union all
select 'receitas' as tabela, count(*) filter (where owner_id is null) as sem_dono from public.receitas
union all
select 'sessoes_compra' as tabela, count(*) filter (where owner_id is null) as sem_dono from public.sessoes_compra
union all
select 'itens_compra' as tabela, count(*) filter (where owner_id is null) as sem_dono from public.itens_compra
union all
select 'ingredientes_receita' as tabela, count(*) filter (where owner_id is null) as sem_dono from public.ingredientes_receita;
commit;
