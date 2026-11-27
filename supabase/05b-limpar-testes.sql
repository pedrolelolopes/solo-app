-- Solo 05b: APAGA os dados de teste de 26/11/2026 em diante (horario do Amazonas).
-- Rode o 05a primeiro e confira os numeros. NAO tem volta: faca so depois de conferir.
-- Nao mexe em: receitas, cardapio, lista_permanente, ingredientes_receita, frequencia, nem em compras antes de 26/11.
begin;

with sessoes as (
  select id from public.sessoes_compra where created_at >= timestamptz '2026-11-26 00:00:00-04'
), del_itens as (
  delete from public.itens_compra
   where created_at >= timestamptz '2026-11-26 00:00:00-04' or sessao_id in (select id from sessoes)
  returning 1
), del_sessoes as (
  delete from public.sessoes_compra where id in (select id from sessoes) returning 1
), del_lista as (
  delete from public.lista_hoje where created_at >= timestamptz '2026-11-26 00:00:00-04' returning 1
), del_lotes as (
  delete from public.lotes where criado_em >= timestamptz '2026-11-26 00:00:00-04' returning 1
), del_folhetos as (
  delete from public.folhetos where criado_em >= timestamptz '2026-11-26 00:00:00-04' returning 1
), del_comparativos as (
  delete from public.comparativos where criado_em >= timestamptz '2026-11-26 00:00:00-04' returning 1
)
select (select count(*) from del_itens) as itens_compra,
       (select count(*) from del_sessoes) as sessoes_compra,
       (select count(*) from del_lista) as lista_hoje,
       (select count(*) from del_lotes) as lotes,
       (select count(*) from del_folhetos) as folhetos,
       (select count(*) from del_comparativos) as comparativos;

-- produtos por ultimo (as outras tabelas ja nao apontam para eles)
delete from public.produtos where criado_em >= timestamptz '2026-11-26 00:00:00-04';

commit;

-- Conferencia: tudo deve dar 0, e a compra real (antes de 26/11) continua la.
select (select count(*) from public.produtos) as produtos,
       (select count(*) from public.lotes) as lotes,
       (select count(*) from public.sessoes_compra where created_at >= timestamptz '2026-11-26 00:00:00-04') as sessoes_de_teste_restantes,
       (select count(*) from public.sessoes_compra) as sessoes_total;
