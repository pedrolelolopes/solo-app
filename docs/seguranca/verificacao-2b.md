# Verificação — Parte 2b

Sem chaves nem dados reais.

- [x] SQL `04-produtos.sql` rodado pelo Pedro; `produtos` e `lotes` com RLS true e 1 política cada (2026-11-27)
- [x] Prévia da `parte2b` testada pelo Pedro no PC e no iPhone (voz, lista, compra); correções feitas em várias rodadas
- [x] Merge no `main` (parte2a + parte2b) a pedido do Pedro, em 2026-11-27; produção serve o código novo (`index.html`, `js/gastos.js`, `js/tela-lista-rapida.js`, `js/dicionario.js` respondem 200; pop-up `modal-essencial` presente)
- [x] `python scripts/verificar_anonimo.py` com a chave pública: `True` em todas as 12 tabelas (folhetos, lista_permanente, lista_hoje, frequencia, sessoes_compra, itens_compra, cardapio, receitas, ingredientes_receita, comparativos, produtos, lotes), saída 0
- [ ] Segunda conta (Aline ou conta de teste) não vê produtos, lotes nem lista da primeira: **pendente**, precisa de login da segunda conta
- [ ] Cupom por foto (cadastrar e conferir) em produção: **pendente** (a prévia bloqueia a IA por segurança; só testa em produção)
- Testes: node 220, pytest 36
- Fora desta entrega: ver `docs/superpowers/notas/futuro-2c.md`
