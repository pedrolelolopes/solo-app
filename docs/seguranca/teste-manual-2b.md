# Teste manual — Parte 2b

Marque cada item depois de testar. Dados de teste inventados; nada de dados reais aqui.

## Task 5 — Nota rápida (precisa do SQL 04 rodado)
- [ ] Digitar "papel higiênico, filtro de café e sabonete" → Conferir → Adicionar à lista → os 3 aparecem na lista Hoje.
- [ ] Repetir a mesma nota → não duplica ("Nada novo").
- [ ] "leite 0" com "Leite sem lactose" já cadastrado → pergunta "É o mesmo que…?"; Sim guarda o apelido.
- [ ] iPhone: tocar o microfone do teclado e ditar. Botão 🎤 Falar no Safari: se não tiver voz, aparece o aviso e o campo de texto continua funcionando.

## Task 7 — Compra com peso, essencial/supérfluo e resumo (precisa do SQL 04 rodado)
- [ ] Comprar 2 itens da lista Hoje (trazer pela fila) + 1 item fora da lista (responder Essencial) + 1 tomate por peso (18/kg, 634 g = R$ 11,41).
- [ ] No modal "Confirmar compra": resumo "Planejado / Esquecido essencial / Impulso" aparece; Salvar compra fica desligado até responder Essencial ou Supérfluo.
- [ ] Item por peso grava `preco_kg` e `peso_g` (ver no Histórico: "634 g · R$ 18,00/kg").
- [ ] Histórico mostra o resumo por classe, etiquetas por item e o local (Farmácia etc.).
- [ ] "Leite 0" novo com "Leite sem lactose" já cadastrado: pergunta "É o mesmo que…?".

## Task 9 — Aba Produtos, lotes e sugeridos (precisa do SQL 04 rodado)
- [ ] Comprar "Desodorante X" (R$ 24); na aba Produtos escolher estimativa de 45 dias → aparece "Acaba em ~45 dias" e custo por dia.
- [ ] Comprar outro desodorante (mesmo produto) → o lote anterior fecha, "Ver compras" mostra dias e custo por dia.
- [ ] Tocar **Acabou** em um produto → fim gravado, botão some.
- [ ] Produto com urgência "Até amanhã" perto do fim previsto → entra na lista Hoje com selo **Sugerido**; remover com X e recarregar → não volta até nova compra.

## Task 7b — Cupom: cadastrar e conferir (precisa do SQL 04 rodado)
- [ ] **Cadastrar compra do cupom:** foto de cupom de farmácia → conferir itens (editar nome/preço/qtd), escolher Local = Farmácia, data → responder Essencial/Supérfluo nos itens novos → Salvar. Ver a compra no Histórico (com o local) e os lotes na aba Produtos.
- [ ] **Conferir compra:** montar um carrinho com 1 preço errado de propósito, fotografar o cupom → ver "Preço diferente", "Só no cupom", "Só no app" e a diferença total; **Corrigir pelo cupom** (pede confirmação para remover). Repetir escolhendo uma compra do Histórico.
- [ ] No iPhone: o total do carrinho fica visível ao rolar a aba Comprar (barra fixa embaixo das abas). Se cobrir algo, avisar.
