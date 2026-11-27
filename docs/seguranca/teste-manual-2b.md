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

## Voz na nota rápida (ajuste pedido pelo Pedro)
- [ ] Tocar **🎤 Falar** sem clicar na caixa: aparece "Ouvindo..."; falar "preciso comprar café, manteiga, desodorante" → itens entram sozinhos na lista; o botão vira **⏹ Parar** e o microfone continua ligado (até 5 min) mesmo com pausas.
- [ ] Falar "papel manteiga" → 1 item só. Falar "café manteiga desodorante" sem pausa → 3 itens.
- [ ] Item errado: ✕ remove; 🎤 ao lado do item e falar o nome certo corrige.
- [ ] iPhone/Safari: se o microfone parar sozinho, anotar quanto tempo durou e se pediu permissão de novo.

## Voz — rodada 2 (sem perguntas, aprende nomes)
- [ ] Falar "preciso comprar filtro de papel" (pausa) "para café" → 1 item: "Filtro de papel para café" (frase que termina em "para/de" espera o resto).
- [ ] Falar um remédio que o app errou (ex.: "Dexa"): tocar **✏️**, digitar o nome certo; falar de novo → já entra certo (o que foi ouvido vira apelido).
- [ ] Nenhuma pergunta "Mesmo que...?" aparece na nota rápida.

## Voz — rodada 3 (prévia só vira lista ao tocar Adicionar)
- [ ] Falar vários itens: aparecem numa **prévia** (com ✏️ 🎤 ✕); a lista Hoje de baixo só muda quando tocar **Adicionar à lista**, e a prévia some.
- [ ] "Chá pro Manuel" → item "Chá" com "(pro Manuel)"; depois "chá de cidreira, né" → pergunta "é o mesmo que Chá?"; Sim junta, ficando "Chá de cidreira (pro Manuel)".
- [ ] "Leite" (segura) "sem lactose" → 1 item "Leite sem lactose" (sem "leites" repetido).
- [ ] "né" no fim da frase é ignorado.

## Voz — rodada 4
- [ ] "Leite sem" (pausa) "quero dizer leite integral" → só "Leite integral".
- [ ] "Tomate" (pausa) "aquele tomate pequenininho" (pausa) "tomate cereja" → só "Tomate cereja".
- [ ] "Leite de magnésio", depois "leite" (pausa) "sem lactose" → não pergunta nada sobre magnésio; responder Não numa pergunta não repete.

## Final da 2b — tudo no mesmo lugar
- [ ] **Comprar:** adicionar um item que não estava na lista (ex.: chocolate) → aparece na hora "Não estava na lista. Essencial / Supérfluo"; ao responder Supérfluo, ganha a etiqueta vermelha **Impulso**; Essencial ganha **Esquecido essencial**; item que veio da lista ganha **Planejado**.
- [ ] Ao tocar Salvar, o que já foi respondido no carrinho não é perguntado de novo.
- [ ] **Lista → Hoje:** cada item tem Essencial?/Supérfluo, urgência (Sem pressa / Até uma semana / Até amanhã) e **Acabou** (aparece quando há compra em uso). Mudar ali vale para o produto; a aba Produtos serve só para ver/editar.

## Rodada final (lista com caixa única)
- [ ] Aba Lista: só uma caixa de texto, com ➕ e 🎤 ao lado. Digitar "leite 0, sabonete" e tocar ➕ → aparece a prévia; "Leite 0" oferece "Usar “Leite sem lactose”" se já existir; **Adicionar à lista** só aparece embaixo da prévia.
- [ ] Falando: tocar ➕ ou **Adicionar à lista** desliga o microfone sozinho.
- [ ] Fim da lista tem **Limpar lista**; não existem mais **Recarregar** nem **Limpar comprados** (comprado sai da lista sozinho ao salvar a compra).
- [ ] Fila "Da lista de hoje": uma seta só, cartão inteiro clicável; ao tocar, o teclado de números já abre no preço (iPhone).
- [ ] Adicionar item que não estava na lista abre o pop-up Essencial/Supérfluo, **toda vez** (mesmo produto já marcado antes).
- [ ] Confirmar compra: a caixinha marca e fica marcada ao tocar.
