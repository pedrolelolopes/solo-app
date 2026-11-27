-- Solo 05a: PREVIA da limpeza dos dados de teste (26/11/2026 em diante, horario do Amazonas). So le, nao apaga nada.
-- Mostra quantas linhas cada tabela teria apagadas, por dono (owner_id). Confira antes de rodar o 05b.
-- Nao mexe em: receitas, cardapio, lista_permanente, ingredientes_receita, frequencia.
select 'itens_compra' as tabela, owner_id, count(*) as linhas, min(created_at) as mais_antiga, max(created_at) as mais_nova
  from public.itens_compra where created_at >= timestamptz '2026-11-26 00:00:00-04' group by owner_id
union all
select 'sessoes_compra', owner_id, count(*), min(created_at), max(created_at)
  from public.sessoes_compra where created_at >= timestamptz '2026-11-26 00:00:00-04' group by owner_id
union all
select 'lista_hoje', owner_id, count(*), min(created_at), max(created_at)
  from public.lista_hoje where created_at >= timestamptz '2026-11-26 00:00:00-04' group by owner_id
union all
select 'lotes', owner_id, count(*), min(criado_em), max(criado_em)
  from public.lotes where criado_em >= timestamptz '2026-11-26 00:00:00-04' group by owner_id
union all
select 'produtos', owner_id, count(*), min(criado_em), max(criado_em)
  from public.produtos where criado_em >= timestamptz '2026-11-26 00:00:00-04' group by owner_id
union all
select 'folhetos', owner_id, count(*), min(criado_em), max(criado_em)
  from public.folhetos where criado_em >= timestamptz '2026-11-26 00:00:00-04' group by owner_id
union all
select 'comparativos', owner_id, count(*), min(criado_em), max(criado_em)
  from public.comparativos where criado_em >= timestamptz '2026-11-26 00:00:00-04' group by owner_id
order by 1, 2;

-- Para comparar: quantas compras REAIS (antes de 26/11) ficam intactas.
select 'sessoes_compra antes de 26/11 (ficam)' as tabela, count(*) as linhas
  from public.sessoes_compra where created_at < timestamptz '2026-11-26 00:00:00-04';
