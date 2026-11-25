# Solo — Fase 1 (design)

Data: 2026-11-25. Dono: Pedro. App: Solo — Assistente de Compras (https://solo-app-nu.vercel.app/, repositório `pedrolelolopes/solo-app`).

## Intenção e porquê
Hoje o app exige muito preenchimento no mercado (nome, marca, unidade, porção). O Pedro não preenche e acaba gastando mais tempo e anotando nomes diferentes para o mesmo produto ("leite", "Leite", "leite 0", "leite sem lactose"). Ele também esquece o que falta em casa, não sabe quanto tempo cada produto dura, e não sabe quanto gasta fora do que planejou.

Fase 1 quer: anotar mais rápido (texto e voz), nunca esquecer o que é urgente (aviso no iPhone), saber quanto dura cada produto e quanto custa por dia, e separar o gasto planejado do impulsivo.

## Objetivos da fase 1
1. **Entrada rápida de itens na lista**, por texto e por voz. Exemplo: andando em casa, o Pedro fala "papel higiênico" e o item entra na lista.
2. **Lista única de próxima compra**, com itens de duas origens: *anotada* (o Pedro disse) e *sugerida* (o app previu que acaba). O Pedro pode tirar um item ou adiar para a próxima ida ao mercado.
3. **Produto com dados mínimos**, marcados uma vez por produto: *urgência* (prazo: até amanhã, até uma semana ou sem pressa; padrão sem pressa) e *essencial* (sim ou não).
4. **Aviso diário por notificação no iPhone, por volta das 16h**, só com os itens urgentes. "Sem pressa" nunca notifica.
5. **Duração por produto.** Cada compra é um lote com data de início. O lote fecha quando o Pedro toca "acabou" (a compra inteira, não unidade por unidade). O app calcula dias de duração e custo por dia. Até haver dados reais, vale uma estimativa dada pelo Pedro.
6. **Planejado x comprado.** Ao entrar no mercado, o que está na lista é *planejado*. O que o Pedro adiciona lá dentro e é essencial é *esquecido essencial*. O que adiciona lá dentro e não é essencial é *impulso*. No fim da compra o app mostra quanto foi gasto em cada um.
7. **Nomes de produto.** Ao digitar, o app sugere o produto que já existe (ignora maiúscula e acento) e o Pedro toca para confirmar. Só na primeira vez de um nome novo o app pergunta "é o mesmo que X?" e depois lembra.
8. **Compra rápida no mercado:** só nome, preço e quantidade são necessários; marca, unidade e porção são opcionais. Item de peso variável: o Pedro informa preço por kg e peso em gramas e o app calcula o valor (ex.: tomate R$ 18/kg, 634 g).

## Fora da fase 1 (não fazer agora)
- Leitura por câmera (foto do preço) e leitura do QR Code do mercado.
- Integração com o app de finanças (gasto diário x gasto do mercado, relatório diário). Fica para a fase 2.
- Relatório de gasto por categoria (% leite, carne, chocolate). Fase 2. O campo *essencial* já é guardado agora para ele.
- Controle por unidade consumida (marcar cada refrigerante tomado).
- Lista "falta em casa" separada. Compras para a casa da mãe: o Pedro não registra.

## O que seria fracasso (anti-objetivos)
- Qualquer mudança que deixe a compra no mercado mais lenta ou exija catálogo completo para anotar.
- Notificações em excesso, ou que avisem item "sem pressa".
- Perda dos dados atuais (listas, histórico, receitas, cardápio).

## Restrições
- **Custo zero.** Vercel Hobby, Supabase plano gratuito, notificações Web Push (gratuito).
- Vercel Hobby só roda tarefa agendada **1 vez por dia, com até 1 hora de imprecisão**. Por isso o aviso é diário "por volta das 16h" e não em tempo real.
- **iPhone só recebe notificação com o app instalado na tela inicial** (PWA). O Pedro instala pelo Compartilhar → Adicionar à Tela de Início.
- Supabase gratuito pausa o projeto após 1 semana com pouca atividade. A tarefa diária deve manter atividade (a confirmar).
- Hoje o login é só por nome digitado e a chave pública do Supabase está no código. **Não se sabe se o Row Level Security está ativo.** A função `/api/claude` aceita pedidos de qualquer origem, sem autenticação. A fase 1 não pode aumentar esse risco, e a entrada por atalho precisa de um código secreto.
- Uso pessoal (a Vercel Hobby é para uso não comercial).

## Abordagens consideradas e escolhas do Pedro
- **Estrutura do app:** A) evoluir o `index.html` único (rápido, arquivo cresce e quebra fácil); **B) reorganizar em arquivos por tela, manter Supabase e Vercel (escolhida)**; C) reescrever com servidor Python próprio (mais controle, mas servidor pago ou que dorme; descartada por ora). Migrar B para C depois exige reescrever só o "envelope" das funções de servidor; telas e dados não mudam.
- **Linguagem do servidor:** Python, nas funções da Vercel. Telas continuam em HTML e JavaScript.
- **Entrada por voz:** atalho do iPhone ("Ditar texto" envia ao app; botão na Tela de Bloqueio, widget ou Botão de Ação, conforme o iOS) **e** microfone dentro do app como complemento.
- **Aviso:** notificação no iPhone desde a fase 1 (não só dentro do app).
- **"Acabou":** por compra inteira.
- **Nomes:** o app sugere, o Pedro confirma.

## Escolhas minhas (o Pedro pode mudar)
- A urgência vira um **prazo por item**, e o item sugerido entra na lista na data prevista de fim **menos** o prazo (urgente: 1 dia antes; uma semana: 7 dias antes; sem pressa: no dia previsto, sem aviso).
- Item de peso variável e campo "local" (mercado, farmácia, açougue) entram na fase 1 por serem pequenos e fazerem parte do "mercado rápido".
- Produto novo: urgência "sem pressa" e essencial "não" até o Pedro marcar.
- Manter os dados existentes; o novo modelo convive com as tabelas atuais. As telas antigas (receitas, cardápio, histórico) continuam funcionando contra as tabelas velhas. A lista nova é uma tabela nova, ao lado de `lista_hoje`/`lista_permanente`. O histórico antigo (`itens_compra`) é importado como lotes de duração quando der.
- **Planejado x impulso** usa botões explícitos "Iniciar compra" e "Finalizar compra" (a tabela `sessoes_compra` já existe). Item adiado volta na próxima compra iniciada e mantém urgência e essencial.
- **Previsão de duração:** vale a estimativa do Pedro até haver 2 lotes fechados; depois, a média dos últimos 3 lotes, em dias por unidade (quantidade comprada normaliza a duração). Custo por dia = preço da compra ÷ dias do lote.
- **Aviso:** a tarefa diária roda sempre, mesmo sem item urgente (mantém o Supabase ativo). Horário de Brasília (UTC-3); agendar às 19:00 UTC, que na Vercel Hobby cai entre 16h e 17h.
- **Atalho do iPhone:** token longo e trocável guardado dentro do atalho. Aceito para uso pessoal.
- **Sugestão de nome:** roda no navegador. Ignora maiúscula e acento. Sugere quando o texto digitado compartilha palavras com um produto existente (ex.: "leite 0" sugere "Leite sem lactose"). A pergunta "é o mesmo que X?" só aparece na primeira vez que o nome é novo.

## Deixado para o construtor
- Esquema das tabelas (esboço: produto com apelidos, essencial, prazo e duração estimada; compra/lote com produto, local, data, preço, quantidade e fim; item de lista com origem e status), a migração das tabelas atuais e os nomes dos arquivos.
- Layout das telas, no estilo do app atual.
- Como garantir o código secreto do atalho e a proteção mínima dos dados (RLS e/ou login), respeitando as restrições acima.
- Como gerar e guardar as chaves de notificação e o cadastro do aparelho.
