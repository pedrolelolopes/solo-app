-- Solo: inspecao do banco (SOMENTE LEITURA). Rode tudo de uma vez no SQL Editor.
-- Resultado em varias abas: use as abas "Results" do editor (a ultima consulta aparece primeiro).
-- Para juntar tudo numa saida so, este script devolve UMA tabela com secao/detalhe.

with t(nome) as (values ('usuarios'),('lista_permanente'),('lista_hoje'),('frequencia'),
  ('sessoes_compra'),('itens_compra'),('cardapio'),('receitas'),('ingredientes_receita'))
select '1-colunas' as secao, c.table_name || '.' || c.column_name || ' : ' || c.data_type
       || coalesce(' default ' || c.column_default, '') as detalhe
from information_schema.columns c join t on t.nome = c.table_name
where c.table_schema = 'public'
union all
select '2-restricoes', tc.table_name || ' : ' || tc.constraint_type || ' ' || tc.constraint_name
       || ' (' || coalesce((select string_agg(k.column_name, ',' order by k.ordinal_position)
          from information_schema.key_column_usage k
          where k.constraint_name = tc.constraint_name and k.table_schema = tc.table_schema), '') || ')'
from information_schema.table_constraints tc join t on t.nome = tc.table_name
where tc.table_schema = 'public' and tc.constraint_type in ('UNIQUE','FOREIGN KEY','PRIMARY KEY')
union all
select '3-rls', tablename || ' : rls=' || rowsecurity
from pg_tables where schemaname = 'public'
union all
select '4-politicas', tablename || ' : ' || policyname || ' (' || cmd || ')'
from pg_policies where schemaname = 'public'
union all
select '5-usuarios (APAGUE antes de colar no repo)', nome_key || ' / ' || coalesce(nome, '')
from public.usuarios
order by 1, 2;

-- Contagem de linhas (rode separado, se quiser):
-- select 'usuarios' t, count(*) from public.usuarios union all select 'lista_permanente', count(*) from public.lista_permanente
-- union all select 'lista_hoje', count(*) from public.lista_hoje union all select 'frequencia', count(*) from public.frequencia
-- union all select 'sessoes_compra', count(*) from public.sessoes_compra union all select 'itens_compra', count(*) from public.itens_compra
-- union all select 'cardapio', count(*) from public.cardapio union all select 'receitas', count(*) from public.receitas
-- union all select 'ingredientes_receita', count(*) from public.ingredientes_receita;
