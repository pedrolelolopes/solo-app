-- Solo 99c: desfaz o 04. Apaga produtos e lotes (e os dados deles) e remove as colunas novas.
begin;
alter table public.lista_hoje drop constraint if exists lista_hoje_origem_check;
alter table public.itens_compra drop constraint if exists itens_compra_classe_check;
alter table public.lista_hoje drop column if exists produto_id, drop column if exists origem;
alter table public.itens_compra drop column if exists produto_id, drop column if exists classe, drop column if exists preco_kg, drop column if exists peso_g;
alter table public.sessoes_compra drop column if exists local_tipo;
drop table if exists public.lotes, public.produtos;
commit;
