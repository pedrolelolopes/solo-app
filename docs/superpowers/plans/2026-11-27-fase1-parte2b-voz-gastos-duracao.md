# Solo — Fase 1, Parte 2b: Lista por voz, gastos e duração — Plano de execução

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** O Pedro cria a lista de compras falando ou digitando notas rápidas, vê quanto gasta por compra e por produto (planejado x esquecido essencial x impulso) e vê quanto tempo cada produto dura e quanto custa por dia.

**Architecture:** Três tabelas novas/estendidas no Supabase (`produtos`, `lotes`, colunas extras em `lista_hoje`, `itens_compra`, `sessoes_compra`), todas com RLS por dono como o resto. A lógica fica em módulos puros testados com `node --test` (`js/nomes.js`, `js/voz-lista.js`, `js/gastos.js`, `js/lotes.js`), acesso ao banco em `js/produtos.js`, telas novas em módulos com injeção de dependências (padrão de `js/tela-folhetos.js`). O `index.html` só liga as peças. A "lista única" é a lista **Hoje** que já existe (`lista_hoje`), com colunas novas, sem tabela duplicada.

**Tech Stack:** HTML/JS sem framework e sem build, Supabase (Postgres + RLS + Auth), Vercel Hobby. Testes: `node --test tests/`. Reconhecimento de voz: Web Speech API do navegador (gratuito) mais o microfone do teclado do iPhone.

**Spec:** `docs/superpowers/specs/2026-11-25-fase1-design.md` (objetivos 1, 2, 3, 5, 6, 7, 8). Ler antes. Fora deste plano: aviso diário no iPhone, PWA e atalho (Parte 3), câmera/QR, integração com finanças, relatório por categoria (% do gasto).

## Global Constraints
- Branch de trabalho: `parte2b`, criada a partir de `parte2a` (`git switch parte2a && git switch -c parte2b`). A Parte 2a deve ser mesclada no `main` antes de a 2b ir para produção; não publique a 2b antes.
- Custo zero: sem serviço pago. IA só quando já existe (`/api/claude`) e **nenhuma IA nova** neste plano: separar itens, sugerir nomes e classificar gasto são regras locais.
- Repositório **público**: nada de chaves, tokens, senhas ou dados reais em código, testes, docs ou commits. Dados de teste são inventados.
- Toda tabela nova: `owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade`, `enable row level security` e política `for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid())`. SQL idempotente em `supabase/`, mais rollback e guia em `docs/seguranca/guia-pedro.md`. **O Pedro roda o SQL no painel do Supabase**; o executor nunca altera conta, segurança ou configuração por conta própria.
- Nada vai para o `main` (publica em produção na Vercel) sem OK explícito do Pedro. Commits locais são livres; `git push` do branch `parte2b` só na Task 10, com OK.
- Não quebrar o que funciona: telas Receitas, Cardápio, Folhetos, Cupom, Comparar e Histórico continuam funcionando. A tela Cupom (`salvarCupom`) não muda nesta parte (suas compras não geram lotes nem classe).
- Compatibilidade: dados antigos (`itens_compra` sem `classe`, `produto_id` ou peso) continuam aparecendo no Histórico.
- Estilo do código: sem framework; módulos JS no formato `if (typeof module !== 'undefined') module.exports = {...}; else window.X = {...};`; telas com dependências injetadas e `doc.getElementById`; sempre escapar texto do usuário com `TextoSeguro.escapar` ao montar HTML.
- O Pedro tem TDAH: textos de tela e guia em português simples, curtos; guia com passos de clique e nomes exatos de menus; respostas dele no chat em N1 (telegráfico).
- Valores do spec: urgência por produto = `amanha` (entra 1 dia antes do fim previsto), `semana` (7 dias antes), `sem_pressa` (no dia previsto, sem aviso; padrão). Estimativa do Pedro vale até haver 2 lotes fechados; depois, média dos 3 últimos lotes fechados, em dias por unidade. Custo por dia = preço total do lote ÷ dias do lote.

## Review Focus
1. Nome com maiúscula, acento ou espaço sobrando ("Leite", "leite ", "LEITE") → mesmo produto, nunca duplicar (Task 2/3).
2. Nota de voz vazia, só com "e", vírgulas ou "preciso de" → nenhum item criado; navegador sem reconhecimento de voz → mensagem clara e o campo de texto continua funcionando (Task 4/5).
3. Compra e "acabou" no mesmo dia (0 dias) → custo por dia sem dividir por zero (mínimo de 1 dia) (Task 8).
4. Produto sugerido pela duração que já está na lista Hoje → não duplicar; item adiado volta na próxima compra sem perder urgência/essencial (Task 9).
5. Peso variável com vírgula decimal ("0,634"/"634"), preço por kg zero ou valor negativo → bloqueia com aviso, não grava lixo (Task 6/7).
6. Conta B não vê produtos/lotes da conta A (RLS) e acesso anônimo não lê nada (Task 1/10).

## Estrutura de arquivos
- Create `supabase/04-produtos.sql`, `supabase/99c-rollback-produtos.sql`
- Create `js/nomes.js` — normalizar e sugerir nomes
- Create `js/produtos.js` — acesso ao banco de produtos (`createProdutos`)
- Create `js/voz-lista.js` — separar itens de uma nota (puro)
- Create `js/tela-lista-rapida.js` — caixa "Nota rápida" na aba Lista
- Create `js/gastos.js` — classificar itens, resumo da compra, peso variável (puro)
- Create `js/lotes.js` — duração, custo por dia, previsão, sugeridos (puro)
- Create `js/tela-produtos.js` — nova aba Produtos
- Modify `index.html` (aba Produtos, caixa Nota rápida, carrinho com peso, modal de confirmar compra, Histórico, boot), `scripts/verificar_anonimo.py` (tabelas novas), `docs/seguranca/guia-pedro.md`
- Create testes `tests/nomes.test.js`, `produtos.test.js`, `voz-lista.test.js`, `tela-lista-rapida.test.js`, `gastos.test.js`, `lotes.test.js`, `tela-produtos.test.js`

---

### Task 1: SQL das tabelas e colunas novas (com o Pedro)

**Files:**
- Create: `supabase/04-produtos.sql`, `supabase/99c-rollback-produtos.sql`
- Modify: `docs/seguranca/guia-pedro.md` (seção "Parte 2b — Produtos e lotes"), `scripts/verificar_anonimo.py` (acrescentar `produtos` e `lotes` à lista `TABELAS`)
- Test: `tests/test_verificar_anonimo.py` (já existe; só rodar)

**Interfaces:**
- Produces (nomes que as tasks seguintes usam, exatos):
  - `public.produtos(id uuid pk default gen_random_uuid(), owner_id, nome text not null (1 a 80), chave text not null, apelidos text[] not null default '{}', essencial boolean not null default false, urgencia text not null default 'sem_pressa' check in ('amanha','semana','sem_pressa'), duracao_estimada_dias int null check (> 0), criado_em timestamptz not null default now(), unique (owner_id, chave))`
  - `public.lotes(id uuid pk, owner_id, produto_id uuid not null references produtos(id) on delete cascade, comprado_em date not null, inicio date not null, fim date null, preco_total numeric not null check (>= 0), qtd numeric not null default 1 check (> 0), local_tipo text not null default 'mercado', criado_em timestamptz default now())` + índice `(owner_id, produto_id, inicio desc)`
  - Colunas novas: `lista_hoje.produto_id uuid null references produtos(id) on delete set null`, `lista_hoje.origem text not null default 'anotada' check in ('anotada','sugerida')`; `itens_compra.produto_id uuid null references produtos(id) on delete set null`, `itens_compra.classe text null check in ('planejado','esquecido_essencial','impulso')`, `itens_compra.preco_kg numeric null`, `itens_compra.peso_g numeric null`; `sessoes_compra.local_tipo text not null default 'mercado'`.

- [ ] **Step 1: Escrever `supabase/04-produtos.sql`** conforme as Interfaces: `begin; ... commit;`, `create table if not exists`, `add column if not exists`, RLS e política `<tabela>_dono` com `drop policy if exists` antes, no mesmo estilo de `supabase/03-folhetos.sql`. Terminar com um `select` que mostra, para `produtos` e `lotes`, `rls_ligado` e número de políticas (esperado: true e 1).
- [ ] **Step 2: Escrever `supabase/99c-rollback-produtos.sql`**: remove as colunas novas das tabelas antigas, depois `drop table lotes, produtos`. Idempotente.
- [ ] **Step 3: Acrescentar `produtos` e `lotes` em `TABELAS` de `scripts/verificar_anonimo.py`** e rodar `python -m pytest tests/test_verificar_anonimo.py -v` → passa.
- [ ] **Step 4: Escrever a seção do guia** no formato de "Parte 2a — Folhetos no banco" (passos de clique: supabase.com → projeto → **SQL Editor** → **New query** → colar `04-produtos.sql` → **Run** → colar na conversa o resultado do `select` final; esperado `rls_ligado` true e 1 política nas duas; desfazer com `99c`).
- [ ] **Step 5: Pedir ao Pedro** que rode o SQL e cole o resultado. Não seguir para a Task 9 sem isso (as Tasks 2 a 8 não dependem do banco).
- [ ] **Step 6: Commit local**

```bash
git add supabase scripts docs/seguranca/guia-pedro.md
git commit -m "feat: SQL de produtos e lotes com RLS por dono, guia e rollback"
```

### Task 2: Nomes (normalizar e sugerir)

**Files:**
- Create: `js/nomes.js`
- Test: `tests/nomes.test.js`

**Interfaces:**
- Produces:
  - `normalizar(texto: string): string` — minúsculas, sem acento, espaços colapsados e aparados. `"  Leite  Sem Lactose "` → `"leite sem lactose"`.
  - `sugerirProdutos(texto: string, produtos: Array<{id, nome, chave, apelidos: string[]}>, max = 3): Array<{produto, motivo: 'igual'|'parecido'}>` — `igual` quando `normalizar(texto)` é igual à `chave` ou a um apelido normalizado (devolve só esse, sem outros); senão `parecido` para produtos que compartilham ao menos uma palavra com 3+ letras (ignorando "de", "da", "do", "com", "sem", "e") com o texto, ordenados pelo número de palavras em comum (maior primeiro), no máximo `max`. Texto vazio → `[]`.

- [ ] **Step 1: Escrever `tests/nomes.test.js`:**
  - `normalizar tira acento, caixa e espaços` (`"  Açúcar  Refinado "` → `"acucar refinado"`)
  - `normalizar de vazio devolve ''`
  - `sugerirProdutos acha igual por chave` (`"LEITE "` com produto chave `leite` → `[{motivo:'igual'}]`)
  - `sugerirProdutos acha igual por apelido`
  - `leite 0 sugere Leite sem lactose como parecido` (produtos: chave `leite sem lactose`; texto `leite 0` → 1 item, `motivo 'parecido'`)
  - `parecido ignora palavras de ligação` (`"pasta de dente"` não casa com `"suco de uva"`)
  - `respeita max` e `texto vazio devolve []`
- [ ] **Step 2: Rodar e ver falhar:** `node --test tests/nomes.test.js`
- [ ] **Step 3: Implementar `js/nomes.js`** (`String.prototype.normalize('NFD')` e remoção de `\u0300-\u036f`).
- [ ] **Step 4: Rodar e ver passar:** `node --test tests/nomes.test.js`
- [ ] **Step 5: Commit local**

```bash
git add js/nomes.js tests/nomes.test.js
git commit -m "feat: normalizar e sugerir nomes de produto"
```

### Task 3: Produtos no banco (`createProdutos`)

**Files:**
- Create: `js/produtos.js`
- Test: `tests/produtos.test.js`

**Interfaces:**
- Consumes: `db = { dbGet(t, qs), dbPost(t, data), dbPatch(t, id, data), dbDel(t, id) }` (de `js/db.js`), `normalizar` e `sugerirProdutos` de `js/nomes.js`.
- Produces: `createProdutos({ db })` → objeto com:
  - `carregar(): Promise<Produto[]>` — `dbGet('produtos', 'select=*&order=nome.asc')`; guarda em memória; devolve a lista.
  - `lista(): Produto[]` — cópia da memória.
  - `achar(nome: string): Produto | null` — por chave ou apelido (via `sugerirProdutos`, `motivo 'igual'`).
  - `garantir(nome: string): Promise<Produto | null>` — acha ou cria (`nome` aparado com a primeira letra maiúscula, `chave = normalizar(nome)`); `null` se nome vazio ou o banco falhar. Se o `dbPost` falhar por chave repetida, recarrega e acha.
  - `marcar(id: string, campos: {essencial?: boolean, urgencia?: 'amanha'|'semana'|'sem_pressa', duracao_estimada_dias?: number|null}): Promise<Produto | null>` — `dbPatch`, atualiza a memória.
  - `adicionarApelido(id: string, apelido: string): Promise<Produto | null>` — acrescenta `normalizar(apelido)` a `apelidos` se ainda não estiver.
  - Tipo `Produto = {id, nome, chave, apelidos, essencial, urgencia, duracao_estimada_dias, criado_em}`.

- [ ] **Step 1: Escrever `tests/produtos.test.js`** com `db` falso em memória:
  - `garantir cria produto novo com chave normalizada` (nome `" leite  Integral "` → `nome 'Leite  Integral'` aparado, `chave 'leite integral'`)
  - `garantir devolve o existente sem criar de novo` ("LEITE" quando já há "Leite" → 0 `dbPost`)
  - `garantir acha por apelido`
  - `garantir com nome vazio devolve null`
  - `garantir devolve null quando o banco falha`
  - `marcar atualiza essencial e urgencia e a memória`
  - `adicionarApelido não repete`
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar `js/produtos.js`.**
- [ ] **Step 4: Rodar e ver passar:** `node --test tests/produtos.test.js`
- [ ] **Step 5: Commit local**

```bash
git add js/produtos.js tests/produtos.test.js
git commit -m "feat: acesso a produtos (achar, garantir, marcar, apelidos)"
```

### Task 4: Separar itens de uma nota (puro)

**Files:**
- Create: `js/voz-lista.js`
- Test: `tests/voz-lista.test.js`

**Interfaces:**
- Produces: `separarItens(texto: string): string[]` — divide por vírgula, ponto e vírgula, quebra de linha e a palavra " e " (com espaços); remove prefixos de fala no começo de cada trecho ("preciso de", "preciso comprar", "comprar", "falta", "faltou", "acabou", "acabou o", "acabou a", "anota", "anotar", "adicionar", "colocar na lista"); remove artigos iniciais ("o ", "a ", "os ", "as ", "um ", "uma "); apara; descarta trechos vazios; mantém ordem; remove repetidos (comparando com `normalizar`).

- [ ] **Step 1: Escrever `tests/voz-lista.test.js`:**
  - `separa por vírgula e "e"`: `"papel higiênico, filtro de café e sabonete"` → `['papel higiênico','filtro de café','sabonete']`
  - `tira prefixos de fala`: `"preciso comprar leite e acabou o café"` → `['leite','café']`
  - `separa por linha`
  - `não parte "pão de queijo"` (a palavra "de" não separa) → `['pão de queijo']`
  - `texto vazio, só vírgulas ou só "e" devolve []`
  - `remove repetidos sem diferenciar caixa`: `"Leite, leite"` → `['Leite']`
- [ ] **Step 2: Rodar e ver falhar:** `node --test tests/voz-lista.test.js`
- [ ] **Step 3: Implementar `js/voz-lista.js`.**
- [ ] **Step 4: Rodar e ver passar.**
- [ ] **Step 5: Commit local**

```bash
git add js/voz-lista.js tests/voz-lista.test.js
git commit -m "feat: separar itens de nota de voz ou texto"
```

### Task 5: Caixa "Nota rápida" na aba Lista

**Files:**
- Create: `js/tela-lista-rapida.js`
- Modify: `index.html` (HTML da caixa no topo da aba Lista, `s-lista`; criar a tela perto de `TelaFolhetos`; carregar `produtos` no `init()`)
- Test: `tests/tela-lista-rapida.test.js`

**Interfaces:**
- Consumes: `separarItens` (Task 4), `produtos` (Task 3: `achar`, `garantir`, `lista`, `adicionarApelido`), `sugerirProdutos` (Task 2), `db.dbPost`, `TextoSeguro.escapar`.
- Produces: `createTelaListaRapida({ db, produtos, doc, aoAdicionar, voz })` → `{ analisar(): void, confirmar(): Promise<number>, cancelar(): void, alternarVoz(): void }`.
  - Elementos usados em `doc`: `nr-texto` (textarea), `nr-revisao` (div da revisão), `nr-aviso` (div), `nr-voz-btn` (botão do microfone), `nr-adicionar-btn`.
  - `analisar()` lê `nr-texto`, chama `separarItens`; para cada item mostra em `nr-revisao` uma linha com nome, botão remover e, se `sugerirProdutos` devolver `parecido` (e não `igual`), a pergunta "É o mesmo que **X**?" com [Sim] [Não]. Sem itens → `nr-aviso` = "Não achei itens. Escreva ou fale de novo."
  - `confirmar()`: para cada item da revisão, `produtos.garantir(nome)` (ou o produto escolhido no "Sim", e então `produtos.adicionarApelido`), depois `db.dbPost('lista_hoje', {nome: produto.nome, detalhe: '', done: false, produto_id: produto.id, origem: 'anotada'})`. Pula o item se já houver pendente igual na lista Hoje (`aoAdicionar` recebe só os criados). Devolve quantos itens entraram, limpa `nr-texto` e `nr-revisao`, mostra "N item(ns) na lista." em `nr-aviso`.
  - `alternarVoz()`: se `voz` (objeto `{suportado: boolean, iniciar(aoTexto, aoFim), parar()}` fornecido pelo `index.html` sobre `webkitSpeechRecognition`, `lang 'pt-BR'`) não for suportado, `nr-aviso` = "Seu navegador não tem voz. Use o microfone do teclado do iPhone." e o texto continua editável; se for, alterna ouvir/parar e acrescenta o texto ouvido em `nr-texto`.
  - `aoAdicionar(itensCriados: Array<lista_hoje row>): void` — o `index.html` coloca em `hojeList` e chama `renderHoje(); renderQueue();`.

- [ ] **Step 1: Escrever `tests/tela-lista-rapida.test.js`** (doc, db e produtos falsos como em `tests/tela-folhetos.test.js`):
  - `analisar mostra os itens separados`
  - `analisar sem itens mostra o aviso`
  - `item parecido pergunta "É o mesmo que"` e `responder Sim usa o produto existente e guarda apelido`
  - `confirmar cria produto e linha em lista_hoje com produto_id e origem 'anotada'`
  - `confirmar não duplica item já pendente na lista`
  - `confirmar devolve a quantidade e limpa o texto`
  - `sem suporte de voz mostra o aviso e não lança`
  - `nome com HTML aparece escapado na revisão`
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar `js/tela-lista-rapida.js`.**
- [ ] **Step 4: Ligar no `index.html`:** `<script src="js/nomes.js">`, `produtos.js`, `voz-lista.js`, `tela-lista-rapida.js`; HTML da caixa "Nota rápida" no topo da aba Lista (textarea com `placeholder="Ex.: papel higiênico, filtro de café e sabonete"`, botões **🎤 Falar**, **Conferir**, **Adicionar à lista**); `const produtos = SoloProdutos.createProdutos({db:{dbGet,dbPost,dbPatch,dbDel}})`; `await produtos.carregar()` dentro de `init()`; objeto `voz` sobre `webkitSpeechRecognition` (`continuous=false`, `interimResults=false`, `lang='pt-BR'`); `aoAdicionar` empurra em `hojeList` e renderiza. Reaproveitar `iniciarVoz/pararVoz` existentes não é necessário: a voz do assistente do Comprar continua como está.
- [ ] **Step 5: Rodar tudo:** `node --test tests/` → passam.
- [ ] **Step 6: Teste manual local** (`python -m http.server 8000`, abrir `http://localhost:8000`, entrar com a conta do Pedro; só depois da Task 1): digitar "papel higiênico, filtro de café e sabonete" → Conferir → Adicionar → os 3 aparecem na lista Hoje; repetir e ver que não duplica; no iPhone, tocar o microfone do teclado e ditar. Registrar em `docs/seguranca/teste-manual-2b.md`.
- [ ] **Step 7: Commit local**

```bash
git add js/tela-lista-rapida.js tests/tela-lista-rapida.test.js index.html docs/seguranca/teste-manual-2b.md
git commit -m "feat: nota rapida por texto ou voz na lista Hoje"
```

### Task 6: Regras de gasto e peso variável (puro)

**Files:**
- Create: `js/gastos.js`
- Test: `tests/gastos.test.js`

**Interfaces:**
- Consumes: `normalizar` de `js/nomes.js`.
- Produces:
  - `valorPorPeso(precoKg: number, pesoG: number): number | null` — `Math.round(precoKg * pesoG / 1000 * 100) / 100`; `null` se `precoKg` ou `pesoG` não for número finito maior que 0.
  - `lerPesoG(texto: string): number | null` — aceita `"634"`, `"634g"`, `"0,634 kg"`, `"1.2kg"` (vírgula ou ponto; `kg` multiplica por 1000); `null` se inválido, zero ou negativo.
  - `classificarItem({ produtoId: string | null, chave: string, essencial: boolean | null }, planejados: { ids: Set<string>, chaves: Set<string> }): 'planejado' | 'esquecido_essencial' | 'impulso' | null` — `planejado` se `produtoId` está em `ids` ou `chave` em `chaves`; senão `esquecido_essencial` se `essencial === true`; `impulso` se `essencial === false`; `null` se `essencial` é `null` (ainda sem resposta).
  - `resumoCompra(itens: Array<{ classe: string | null, subtotal: number }>): { planejado: number, esquecido_essencial: number, impulso: number, sem_classe: number, total: number }` — somas em reais arredondadas a 2 casas.
  - `gastosPorProduto(itens: Array<{ produto_id: string | null, nome: string, subtotal: number, qtd: number, data?: string }>): Array<{ chave: string, nome: string, total: number, compras: number, precoMedio: number }>` — agrupa por `produto_id` (ou `normalizar(nome)` se nulo), ordenado por `total` decrescente; `precoMedio = total / soma das qtd`.

- [ ] **Step 1: Escrever `tests/gastos.test.js`:**
  - `valorPorPeso tomate 18/kg com 634 g = 11.41`
  - `valorPorPeso com zero ou negativo devolve null`
  - `lerPesoG entende 634, 634g, 0,634 kg e 1.2kg`
  - `lerPesoG inválido devolve null` ("abc", "", "-5")
  - `classificarItem: planejado por id e por chave`
  - `classificarItem: fora da lista e essencial = esquecido_essencial`
  - `classificarItem: fora da lista e supérfluo = impulso`
  - `classificarItem: sem resposta = null`
  - `resumoCompra soma por classe e total`
  - `gastosPorProduto agrupa nomes diferentes do mesmo produto_id` e `ordena por total`
- [ ] **Step 2: Rodar e ver falhar:** `node --test tests/gastos.test.js`
- [ ] **Step 3: Implementar `js/gastos.js`.**
- [ ] **Step 4: Rodar e ver passar.**
- [ ] **Step 5: Commit local**

```bash
git add js/gastos.js tests/gastos.test.js
git commit -m "feat: regras de gasto planejado x impulso e peso variavel"
```

### Task 7: Compra no mercado: peso variável, essencial ou supérfluo, resumo

**Files:**
- Modify: `index.html` (formulário do carrinho `c-*` e `e-*`, `addItem`, `finalizarCompra`, `confirmarCompra`, `renderCartItems`, `renderHistorico`, `verCompra`)
- Test: `tests/compra-regras.test.js` (só a lógica extraída, ver Step 1)

**Interfaces:**
- Consumes: `valorPorPeso`, `lerPesoG`, `classificarItem`, `resumoCompra` (Task 6), `produtos` (Task 3), `sugerirProdutos` (Task 2).
- Produces:
  - Em `js/gastos.js`, nova função pura `prepararItensCompra(cart: Array<{id, nome, marca, tamanho, unidade, preco, qtd, subtotal, precoKg?: number, pesoG?: number}>, produtos: Produto[], hojeList: Array<{nome, produto_id}>, respostas: Record<string, {essencial: boolean, mesmoQue?: string}>): Array<{ cartId, nome, produtoNome, produtoId: string | null, classe, essencial }>` — para cada item, resolve o produto (por `achar`/apelido), monta `planejados` a partir de `hojeList` e devolve a classe; usa `respostas[cartId].essencial` quando o produto ainda não tem marca.
  - Item do carrinho ganha campos opcionais `precoKg` e `pesoG`; `subtotal = valorPorPeso(precoKg, pesoG)` quando ambos existem.
  - `itens_compra` passa a gravar `produto_id`, `classe`, `preco_kg`, `peso_g`; `sessoes_compra` grava `local_tipo`.

- [ ] **Step 1: Escrever `tests/compra-regras.test.js`** para `prepararItensCompra` (em `js/gastos.js`): item que está em `hojeList` → `planejado`; item novo essencial → `esquecido_essencial`; supérfluo → `impulso`; produto sem marca e sem resposta → `classe null`; item cujo nome casa por apelido usa o `produtoId` do produto; pesos variados mantêm `produtoNome`.
- [ ] **Step 2: Rodar e ver falhar, implementar `prepararItensCompra` em `js/gastos.js`, rodar e ver passar.**
- [ ] **Step 3: Formulário de peso:** no cartão de adicionar item (aba Comprar) incluir alternância "Preço fixo | Por peso". Em "Por peso": campo **Preço por kg** (usa `priceKey`) e **Peso (g)** (texto, `lerPesoG`), e mostra ao vivo "= R$ x,xx". `addItem` calcula `subtotal` com `valorPorPeso`; se `lerPesoG` ou o preço/kg for inválido, mostra aviso e não adiciona. Item por peso aparece no carrinho como "634 g × R$ 18,00/kg". Campo de nome com `<datalist>` alimentado por `produtos.lista()` (autocompletar nativo, sem IA).
- [ ] **Step 4: Local da compra:** ao lado de `c-mercado`, um `<select id="c-local">` com Mercado, Farmácia, Açougue, Outro (padrão Mercado); gravar em `sessoes_compra.local_tipo`.
- [ ] **Step 5: Modal "Confirmar compra"** (`finalizarCompra`): para cada item do carrinho, chamar `prepararItensCompra` antes de abrir. Para item cuja classe seja `null`, mostrar na linha dois botões **Essencial** | **Supérfluo** (obrigatório escolher: o botão **Salvar compra** fica desligado até todos responderem). Para item novo com `sugerirProdutos(...)` `parecido`, mostrar "Novo nome. É o mesmo que **X**? [Sim] [Não]" (Sim = usa o produto e `adicionarApelido`). Mostrar no topo o resumo ao vivo: "Planejado R$ a · Esquecido essencial R$ b · Impulso R$ c".
- [ ] **Step 6: `confirmarCompra`:** para cada comprado: `produtos.garantir` (ou o escolhido), `produtos.marcar(id,{essencial})` se foi respondido, gravar `itens_compra` com os campos novos e `subtotal` do item. Os não comprados voltam para `lista_hoje` com `produto_id` e `origem:'anotada'`. A Task 9 acrescenta os lotes aqui; deixe um comentário `// lotes: Task 9` no ponto certo.
- [ ] **Step 7: Histórico:** `verCompra` mostra, abaixo do total, o resumo por classe (itens antigos sem classe contam em "sem classe", mostrado só se maior que zero) e, por item, uma etiqueta pequena (Planejado / Esquecido essencial / Impulso); `renderHistorico` mostra o local ao lado do nome do mercado. Escapar nomes com `TextoSeguro.escapar`.
- [ ] **Step 8: Rodar** `node --test tests/` → passam. **Teste manual** (após Task 1): comprar 2 itens da lista Hoje + 1 item fora dela (responder Essencial) + 1 tomate por peso (18/kg, 634 g = R$ 11,41); conferir o resumo, o Histórico e que o item por peso grava `preco_kg` e `peso_g`. Registrar em `docs/seguranca/teste-manual-2b.md`.
- [ ] **Step 9: Commit local**

```bash
git add js/gastos.js tests/compra-regras.test.js index.html docs/seguranca/teste-manual-2b.md
git commit -m "feat: peso variavel, essencial ou superfluo e resumo de gasto na compra"
```

### Task 8: Duração e custo por dia (puro)

**Files:**
- Create: `js/lotes.js`
- Test: `tests/lotes.test.js`

**Interfaces:**
- Produces (datas como string `AAAA-MM-DD`; `hoje` sempre recebido como parâmetro, nunca `new Date()` dentro das funções):
  - `diasEntre(de: string, ate: string): number` — dias inteiros (UTC), mínimo 0.
  - `custoPorDia(lote: {preco_total: number, inicio: string, fim: string | null}, hoje: string): number` — `preco_total / Math.max(1, diasEntre(inicio, fim ?? hoje))`, 2 casas.
  - `duracaoPorUnidade(lote): number` — `diasEntre(inicio, fim) / qtd` para lote fechado (`fim` não nulo); `NaN` se aberto.
  - `duracaoMedia(lotes: Lote[], produto: {duracao_estimada_dias: number | null}): { dias: number | null, fonte: 'dados' | 'estimativa' | 'nenhuma' }` — só lotes fechados do produto, ordenados por `fim` desc; com 2 ou mais fechados: média de `duracaoPorUnidade` dos 3 últimos (`fonte 'dados'`); senão `duracao_estimada_dias` (`'estimativa'`) se existir; senão `{dias: null, fonte: 'nenhuma'}`. O resultado é "dias por unidade".
  - `fimPrevisto(loteAberto: Lote, duracao: {dias: number | null}): string | null` — `inicio + dias × qtd` (arredondado); `null` se `dias` nulo.
  - `diasParaAcabar(loteAberto, duracao, hoje): number | null` — `diasEntre(hoje, fimPrevisto)` (negativo se já passou do previsto → 0).
  - `dataDeEntrada(fim: string, urgencia: 'amanha'|'semana'|'sem_pressa'): string` — `fim` menos 1, 7 ou 0 dias.
  - `sugeridosParaLista(hoje: string, produtos: Produto[], lotes: Lote[], pendentesProdutoIds: Set<string>): Produto[]` — produtos com lote aberto, duração conhecida e `hoje >= dataDeEntrada(fimPrevisto, urgencia)`, que **não** estão em `pendentesProdutoIds`.
  - `comparar(produtoLotes: Lote[], hoje: string): Array<{ inicio, fim, dias, preco_total, custoDia }>` — linhas por lote (mais recente primeiro) para a tela de comparação (ex.: desodorante X x Y por produto).
  - `Lote = {id, produto_id, inicio, fim, preco_total, qtd, comprado_em}`.

- [ ] **Step 1: Escrever `tests/lotes.test.js`:**
  - `diasEntre conta dias e nunca é negativo`
  - `custoPorDia: 30 reais em 30 dias = 1.00`
  - `custoPorDia no mesmo dia não divide por zero` (usa 1 dia)
  - `custoPorDia de lote aberto usa hoje`
  - `duracaoMedia usa a estimativa com menos de 2 lotes fechados`
  - `duracaoMedia usa a média dos 3 últimos com 2 ou mais lotes fechados` (4 lotes fechados: só os 3 mais recentes entram)
  - `duracaoMedia normaliza pela quantidade` (lote de 6 unidades em 15 dias = 2,5 dias/unidade)
  - `duracaoMedia sem dados nem estimativa devolve fonte nenhuma`
  - `fimPrevisto e diasParaAcabar` e `diasParaAcabar nunca negativo`
  - `dataDeEntrada: amanha = fim-1, semana = fim-7, sem_pressa = fim`
  - `sugeridosParaLista inclui o produto na data de entrada` e `não inclui antes dela`
  - `sugeridosParaLista não duplica produto já pendente na lista`
  - `comparar devolve custo por dia por lote, mais recente primeiro`
- [ ] **Step 2: Rodar e ver falhar:** `node --test tests/lotes.test.js`
- [ ] **Step 3: Implementar `js/lotes.js`.**
- [ ] **Step 4: Rodar e ver passar.**
- [ ] **Step 5: Commit local**

```bash
git add js/lotes.js tests/lotes.test.js
git commit -m "feat: duracao, custo por dia, previsao e sugeridos"
```

### Task 9: Lotes na compra, aba Produtos e sugeridos na lista

**Files:**
- Create: `js/tela-produtos.js`
- Modify: `index.html` (nova aba **Produtos**, `confirmarCompra`, `init`, `renderHoje`)
- Test: `tests/tela-produtos.test.js`

**Interfaces:**
- Consumes: `lotes.js` (Task 8), `produtos` (Task 3), `db`, `TextoSeguro.escapar`.
- Produces:
  - Em `js/produtos.js`, acrescentar ao objeto de `createProdutos`: nada. Os lotes ficam em `createTelaProdutos`.
  - `createTelaProdutos({ db, produtos, doc, hoje, avisar })` onde `hoje(): string` devolve `AAAA-MM-DD` de hoje no fuso local → `{ carregar(): Promise<void>, render(): void, registrarLotes(itensComprados: Array<{produtoId: string, preco: number, qtd: number}>, dataCompra: string, localTipo: string): Promise<void>, acabou(produtoId: string): Promise<void>, marcar(produtoId, campos): Promise<void>, sugeridos(pendentesProdutoIds: Set<string>): Produto[] }`.
  - `registrarLotes`: para cada item, **fecha o lote aberto anterior do mesmo produto** com `fim = dataCompra` (`db.dbPatch('lotes', id, {fim})`) e cria o novo (`db.dbPost('lotes', {produto_id, comprado_em: dataCompra, inicio: dataCompra, preco_total: preco, qtd, local_tipo: localTipo})`).
  - `acabou(produtoId)`: `fim = hoje()` no lote aberto do produto; sem lote aberto → `avisar('Esse produto não tem compra em uso.')`.
  - `render()` preenche `produtos-lista` (div): um cartão por produto com nome, selos **Essencial** e urgência (selects que chamam `marcar`), duração (`duracaoMedia`; texto "≈ N dias por unidade (sua estimativa)" ou "(dados reais)"), custo por dia da última compra, "acaba em N dias" quando há lote aberto, botão **Acabou** (só com lote aberto), campo "Quantos dias dura? (sua estimativa)" que grava `duracao_estimada_dias`, e botão **Ver compras** que lista `comparar(...)` do produto (data início, dias, preço, custo por dia).

- [ ] **Step 1: Escrever `tests/tela-produtos.test.js`** (db e doc falsos):
  - `registrarLotes cria lote novo com início na data da compra`
  - `registrarLotes fecha o lote aberto anterior do mesmo produto com a data da nova compra`
  - `acabou grava fim = hoje no lote aberto`
  - `acabou sem lote aberto avisa e não grava`
  - `marcar grava essencial e urgencia`
  - `render mostra custo por dia e "acaba em N dias"`
  - `render mostra a estimativa do Pedro quando há menos de 2 lotes fechados`
  - `sugeridos não repete produto já pendente na lista`
  - `nome de produto com HTML sai escapado`
- [ ] **Step 2: Rodar e ver falhar.**
- [ ] **Step 3: Implementar `js/tela-produtos.js`.**
- [ ] **Step 4: Ligar no `index.html`:** aba **Produtos** (ícone `ti ti-box`) no menu de abas e `<div id="s-produtos" class="screen">` com `produtos-lista`; `showTab('produtos')` chama `TelaProdutos.render()`; `init()` chama `TelaProdutos.carregar()` depois de `produtos.carregar()`.
- [ ] **Step 5: Lotes na compra:** no ponto `// lotes: Task 9` de `confirmarCompra`, chamar `TelaProdutos.registrarLotes(...)` com os itens comprados (preço = `subtotal`, `qtd`), a data da compra e `local_tipo`.
- [ ] **Step 6: Sugeridos na lista:** no fim de `init()`, para cada produto de `TelaProdutos.sugeridos(pendentes)`, criar `lista_hoje` `{nome, detalhe: 'sugerido: deve acabar em breve', done: false, produto_id, origem: 'sugerida'}` e colocar em `hojeList`; `renderHoje` mostra um selo **Sugerido** nos itens com `origem === 'sugerida'`. O Pedro remove com o X já existente; ao remover, o produto só volta a ser sugerido depois de uma nova compra ou de "Acabou".
- [ ] **Step 7: Rodar** `node --test tests/` → todos passam. **Teste manual** (após Task 1): comprar "Desodorante X" (R$ 24), escolher estimativa de 45 dias; na aba Produtos ver "Acaba em ~45 dias" e custo por dia; comprar de novo outro desodorante e ver o lote anterior fechado com dias e custo por dia; tocar **Acabou** em um produto e ver o fim gravado. Registrar em `docs/seguranca/teste-manual-2b.md`.
- [ ] **Step 8: Commit local**

```bash
git add js/tela-produtos.js tests/tela-produtos.test.js index.html docs/seguranca/teste-manual-2b.md
git commit -m "feat: aba Produtos com duracao, custo por dia, acabou e sugeridos na lista"
```

### Task 10: Publicar e verificar (com o Pedro)

**Files:**
- Modify: `docs/seguranca/guia-pedro.md` (seção "Ordem de publicação 2b")
- Create: `docs/seguranca/verificacao-2b.md` (resultados, sem chaves nem dados reais)

**Interfaces:**
- Consumes: tudo das Tasks 1 a 9; Parte 2a já mesclada no `main`.

- [ ] **Step 1: Conferir** que `node --test tests/` e `python -m pytest tests/` passam e que `git status` está limpo.
- [ ] **Step 2: Conferir que o Pedro rodou `04-produtos.sql`** e colou o resultado do `select` (`rls_ligado` true, 1 política em `produtos` e em `lotes`).
- [ ] **Step 3: Pedir o OK do Pedro** e enviar a branch: `git push -u origin parte2b`. A Vercel gera uma prévia (painel **Deployments**, linha do branch `parte2b`); o Pedro testa na prévia: nota rápida (texto e voz no iPhone), uma compra com item fora da lista, um item por peso, a aba Produtos, "Acabou".
- [ ] **Step 4: Pedir OK explícito do Pedro para o merge no `main`** (publica em produção): `git switch main`, `git merge parte2b`, `git push`. O Pedro testa em produção com a conta dele.
- [ ] **Step 5: Verificar o anônimo:** `python scripts/verificar_anonimo.py` com `SUPABASE_URL` e `SUPABASE_ANON_KEY` no ambiente → `True` nas tabelas, inclusive `produtos` e `lotes`, saída 0.
- [ ] **Step 6: Verificar o isolamento:** entrar com uma segunda conta (familiar ou conta de teste): não vê produtos, lotes nem lista da primeira e começa vazia.
- [ ] **Step 7: Registrar** os resultados em `docs/seguranca/verificacao-2b.md` e acrescentar seção datada em `C:\CLAUDE\curto-prazo\solo-app.md` (estado, decisões, próximos passos) com os comandos de envio do núcleo.

---

## Depois deste plano (Parte 3, plano próprio)
Aviso diário por notificação no iPhone às 16h do Amazonas (PWA, Web Push, tarefa agendada em Python), atalho do iPhone com token longo trocável, e depois câmera/QR, integração com o app de finanças e relatório por categoria. As colunas `essencial`, `urgencia` e `local_tipo` já ficam gravadas por esta parte para esses relatórios.

## Self-review
- **Cobertura do spec:** lista por texto/voz (Tasks 4-5); lista única com anotados e sugeridos (Tasks 5, 9); produto com urgência e essencial, marcados uma vez (Tasks 1, 3, 7, 9); "acabou" por compra inteira, duração, estimativa até 2 lotes e média dos 3 últimos, custo por dia (Tasks 8-9); planejado x esquecido essencial x impulso sem botão de iniciar, pergunta "essencial ou supérfluo?" (Tasks 6-7); nomes sugeridos com confirmação (Tasks 2, 5, 7); compra rápida, peso variável e local (Tasks 6-7); aviso, PWA e atalho ficam na Parte 3.
- **Consistência de nomes:** `createProdutos`, `produtos.garantir/achar/marcar/adicionarApelido`, `sugerirProdutos`, `normalizar`, `valorPorPeso`, `lerPesoG`, `classificarItem`, `prepararItensCompra`, `resumoCompra`, `duracaoMedia`, `sugeridosParaLista`, `createTelaProdutos.registrarLotes/acabou/sugeridos` aparecem com a mesma assinatura onde são produzidos e consumidos. Colunas: `produto_id`, `origem`, `classe`, `preco_kg`, `peso_g`, `local_tipo`.
- **Decisões minhas para o Pedro revisar:** lista única = `lista_hoje` com colunas novas (sem tabela nova); matching de nomes por palavras em comum (3+ letras); lote criado por item comprado, fechado pela compra seguinte do mesmo produto; "Cupom" não gera lotes; sem IA nova; produto sem marca de essencial exige resposta antes de salvar a compra.
- **Proporção:** o plano é maior que o spec por causa das telas e das etapas com o Pedro; o código aparece só como assinaturas e nomes de teste.
