-- Solo 99b: desfaz o 03. Apaga folhetos e comparativos (e os dados deles) e volta owner_id a aceitar nulo.
begin;
drop table if exists public.comparativos, public.folhetos;
alter table public.cardapio alter column owner_id drop not null;
alter table public.frequencia alter column owner_id drop not null;
alter table public.lista_hoje alter column owner_id drop not null;
alter table public.lista_permanente alter column owner_id drop not null;
alter table public.receitas alter column owner_id drop not null;
alter table public.sessoes_compra alter column owner_id drop not null;
alter table public.itens_compra alter column owner_id drop not null;
alter table public.ingredientes_receita alter column owner_id drop not null;
commit;
