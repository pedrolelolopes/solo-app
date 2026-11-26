# Solo — Fase 1, Parte 2a: Folhetos e dados — Plano de execução

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Folhetos salvos no banco (aparecem no celular e no PC), lidos de várias fotos, PDF ou de um CSV gerado pelo Claude Code a partir de uma pasta, com comparativo que diz claramente se vale ir a outro mercado; e corrigir os bugs pendentes da Parte 1 (IA em markdown cru, `ai()` inexistente, g x kg, botão "Buscar opiniões").

**Architecture:** Lógica pura em módulos testáveis em `js/` (mesmo formato de `js/auth.js`: `module.exports` no Node, `window.<Nome>` no navegador, sem build). A IA só **lê** foto/PDF de última hora (folheto → linhas `nome|preço|unidade`); totais, economia e a nota final são calculados no navegador por regra fixa e testada. Duas tabelas novas (`folhetos`, `comparativos`) com `owner_id` e RLS por dono, criadas pelo Pedro no SQL Editor. O Claude Code lê a pasta de folhetos e escreve um CSV (conferido por `scripts/folhetos_csv.py`, sem IA) que o app importa pela própria tela (com o login do Pedro; sem token novo). O casamento lista × folheto é feito sem IA; a IA só entra, por botão, para o que sobrar.

**Tech Stack:** HTML/JS sem framework, Supabase (Postgres + RLS, plano gratuito), Vercel Hobby (função Python `/api/claude`), Python 3 só biblioteca padrão, testes `node --test tests/` e `python -m pytest tests/`.

**Spec:** `docs/superpowers/specs/2026-11-25-fase1-design.md` + requisitos do Pedro de 2026-11-26 09:00 em `C:\CLAUDE\curto-prazo\solo-app.md` + pendências em `docs/seguranca/verificacao-final.md`. Plano anterior (padrões de módulo, SQL e guia): `docs/superpowers/plans/2026-11-25-fase1-parte1-seguranca.md`.

## Global Constraints
- Custo zero de infraestrutura (Supabase e Vercel gratuitos). Custo de IA: ver "Custos" abaixo.
- Repositório **público**: nunca gravar senha, token, `ANTHROPIC_API_KEY` nem dados reais (folhetos, nomes de pessoas) no repositório.
- `/api/claude`: modelos só `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`, `claude-sonnet-5-5`, `claude-haiku-5-5`; `max_tokens` até **1500**; corpo até **4 MB**. Não aumentar esses limites.
- Nada de `push` sem OK do Pedro; nada no `main` (publica em produção) sem OK explícito. Commits locais são livres. Trabalhar no branch `parte2a`.
- Painéis do Supabase e da Vercel são do Pedro: o plano dá passos de clique com o nome exato do menu; ele roda o SQL.
- Saída de IA e dados digitados/importados **nunca** entram por `innerHTML` sem escapar (usar `TextoSeguro`, Task 2).
- Pedro tem TDAH e usa celular e PC igual: mensagens curtas em português, um passo por linha, botões grandes.
- Não mexer em receitas, cardápio, histórico, lista e carrinho além do que cada tarefa diz.

## Escolhas deste plano (o Pedro pode mudar na revisão)
1. **Nome do mercado:** o botão "Adicionar fotos/PDF" fica desligado até haver nome, com o texto "Digite o nome do mercado primeiro". O CSV traz o nome do mercado no próprio arquivo e não exige o campo.
2. **Nota final mostra a margem (decisão do Pedro, 2026-11-26):** sempre diz quanto se economiza em cada outro mercado, em três níveis pela economia total: abaixo de **R$ 5** → "tanto faz"; de R$ 5 a R$ 29,99 → o usuário decide ("Compensa se o deslocamento não for grande"); **R$ 30 ou mais** → "Vale a pena!". Limites em constantes no topo de `js/folhetos.js`.
3. **Formato:** **CSV com `;`** (`mercado;produto;preco;unidade`). Motivo: menor arquivo, abre no Excel e no celular, o Pedro corrige à mão; `;` é o separador do Excel em português e evita conflito com a vírgula do preço. (OK do Pedro.)
4. **Caminho principal da pasta (decisão do Pedro):** o **Claude Code** lê a pasta de imagens/PDFs e escreve o CSV (assinatura, sem custo de API). O repositório guarda o prompt pronto e um validador local do CSV em `scripts/` (sem IA). Foto/PDF direto no app fica para folheto de última hora.
5. **Envio do CSV ao app:** o Pedro importa pela tela Folhetos (botão "Importar CSV"), já logado. O arquivo chega ao celular por Drive/WhatsApp para si mesmo. Envio automático com token longo fica para a Parte 3. (OK do Pedro.)
6. **Imagens não são guardadas** no banco: só os itens extraídos. (OK do Pedro.)
7. **Sempre o modelo mais barato (decisão do Pedro):** toda chamada tocada neste plano usa `claude-haiku-4-5-20251001` (constante `MODELO_BARATO` em `js/ia.js`). Antes de implementar, conferir no preço oficial da Anthropic se `claude-haiku-5-5` é mais barato; se for, a constante passa a ele. **Comparação sem IA:** o casamento lista × folheto é feito no navegador por palavras (Task 5, `casarLocal`); a IA só é chamada, por botão, para os itens que sobrarem sem par.

## Custos (estimativa, não verificada em fatura)
- Leitura de 1 foto/página no app com Haiku: menos de US$ 0,01. Comparativo: R$ 0 quando todos os itens casam sem IA.
- Pasta lida pelo Claude Code: sem custo de API (usa a cota da assinatura).

## Review Focus
1. Uma de 5 fotos falha (ilegível ou rede): as outras 4 entram e são salvas; aviso diz qual falhou (Task 6, teste `processarArquivos continua após falha`).
2. Arquivo grande demais (PDF > 2,9 MB, imagem que não reduz): mensagem clara antes de enviar, nada trava (Task 4, teste `validarArquivo recusa PDF acima do limite`).
3. Folheto grande corta a resposta da IA (`stop_reason: "max_tokens"`): itens lidos entram e o aviso diz "Folheto grande: alguns itens podem ter ficado de fora. Envie em partes." (Task 4/6, teste `claudeArquivo marca cortado`).
4. CSV com cabeçalho errado, linhas ruins ou `<script>` no nome: importa as linhas boas, informa quantas foram ignoradas e mostra o texto escapado (Tasks 2 e 5).
5. Mesmo folheto editado no celular e no PC: "+ páginas" relê o folheto do banco antes de juntar, para não apagar o que o outro aparelho gravou (Task 6, teste `adicionarPaginas relê antes de gravar`).

## Estrutura de arquivos
- Create `supabase/03-folhetos.sql`, `supabase/99b-rollback-folhetos.sql`
- Create `js/texto-seguro.js` — escapar e formatar markdown simples com segurança
- Create `js/unidades.js` — preço por unidade base (g↔kg, ml↔L)
- Create `js/ia.js` — montar conteúdo (imagem/PDF) e chamar `/api/claude`
- Create `js/folhetos.js` — regras puras: normalizar, ler linhas da IA, ler CSV, juntar itens, comparativo e nota final
- Create `js/tela-folhetos.js` — tela Folhetos (DOM + banco); primeiro arquivo "por tela" do spec
- Create `scripts/folhetos_csv.py` (validador sem IA), `docs/folhetos/ler-pasta-com-claude-code.md` (prompt pronto)
- Create tests: `tests/texto-seguro.test.js`, `tests/unidades.test.js`, `tests/ia.test.js`, `tests/folhetos.test.js`, `tests/tela-folhetos.test.js`, `tests/test_folhetos_csv.py`
- Modify `index.html` (tela Folhetos 280-297 e funções 969-1006; `ai()` em ~832 e ~1188; `comparar()` 946-967; `getDica()` 858-869; `buscarOpiniao()` 1352-1372), `api/claude.py`, `tests/test_claude_api.py`, `js/auth.js`, `js/db.js` e seus testes, `docs/seguranca/guia-pedro.md`

---

### Task 1: Tabelas `folhetos` e `comparativos` (SQL, com o Pedro)

**Files:**
- Create: `supabase/03-folhetos.sql`, `supabase/99b-rollback-folhetos.sql`
- Modify: `docs/seguranca/guia-pedro.md` (seção "Parte 2a — Folhetos no banco")

**Interfaces:**
- Produces (banco): `public.folhetos(id uuid pk default gen_random_uuid(), owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade, mercado text not null check (char_length(mercado) between 1 and 80), itens jsonb not null default '[]' check (jsonb_typeof(itens)='array' and jsonb_array_length(itens) <= 500), criado_em timestamptz not null default now(), atualizado_em timestamptz not null default now())`.
  `public.comparativos(id uuid pk default gen_random_uuid(), owner_id uuid not null default auth.uid() references auth.users(id) on delete cascade, criado_em timestamptz not null default now(), folheto_ids uuid[] not null, resultado jsonb not null, nota text not null)`.
  Item em `itens`: `{"nome": string, "preco": number, "unidade": string|null}`.

- [ ] **Step 1: Escrever `03-folhetos.sql`** em blocos comentados:
  (a) bloco `do $$` que conta linhas de `public.folhetos` se ela existir e faz `raise exception 'folhetos tem dados; pare e avise'` se > 0; senão `drop table if exists public.folhetos` (a tabela antiga está vazia e nunca foi usada pelo app);
  (b) `create table` das duas tabelas acima; índice `(owner_id, criado_em desc)` em cada;
  (c) `enable row level security` + política `<t>_dono` igual à Parte 1 (`for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid())`);
  (d) achado da revisão: `alter column owner_id set not null` nas 8 tabelas antigas, cada uma dentro de um bloco que só roda se não houver `owner_id` nulo (senão `raise notice` com o nome da tabela);
  (e) `select` final: tabelas com RLS ligado e número de políticas (esperado: `folhetos` 1, `comparativos` 1).
  Script idempotente (`if not exists` / `drop policy if exists`).
- [ ] **Step 2: Escrever `99b-rollback-folhetos.sql`:** `drop table if exists public.comparativos, public.folhetos;` e `alter column owner_id drop not null` nas 8 tabelas.
- [ ] **Step 3: Seção do guia:** Supabase → projeto → **SQL Editor** → **New query** → colar `03-folhetos.sql` → **Run** → copiar só o resultado do último `select` para a conversa. Se aparecer "folhetos tem dados", parar e avisar.
- [ ] **Step 4: Commit local** (o Pedro roda o SQL na Task 9, antes do merge; o app em produção não usa essas tabelas, então rodar antes não quebra nada).

```bash
git switch -c parte2a
git add supabase/03-folhetos.sql supabase/99b-rollback-folhetos.sql docs/seguranca/guia-pedro.md
git commit -m "feat: tabelas folhetos e comparativos com RLS por dono"
```

### Task 2: Texto seguro da IA (`js/texto-seguro.js`) e botão "Buscar opiniões"

**Files:**
- Create: `js/texto-seguro.js`, `tests/texto-seguro.test.js`
- Modify: `index.html` (`getDica` ~866, `comparar` ~966, `buscarOpiniao` ~1368, `renderFolhetos` ~975; HTML da tela Comprar)

**Interfaces:**
- Produces: `window.TextoSeguro = { escapar(s: any): string, mdSimples(s: string): string }`.
  - `escapar` troca `& < > " '` por entidades; `null/undefined` → `''`.
  - `mdSimples` escapa **primeiro** e depois converte só: linhas `#`, `##`, `###` → `<strong>` em linha própria; `**x**` → `<strong>x</strong>`; linhas `- ` ou `* ` → `• `; linhas só com `---` → removidas; quebras de linha → `<br>`. Nenhuma outra marcação passa.

- [ ] **Step 1: Testes** em `tests/texto-seguro.test.js`:
  - `escapar('<img onerror=x>')` → `'&lt;img onerror=x&gt;'`
  - `escapar(null)` → `''`
  - `mdSimples('### Título\n**Leite** R$ 5\n- item\n---')` → `'<strong>Título</strong><br><strong>Leite</strong> R$ 5<br>• item'`
  - `mdSimples('**<b>x</b>**')` → `'<strong>&lt;b&gt;x&lt;/b&gt;</strong>'`
- [ ] **Step 2:** `node --test tests/texto-seguro.test.js` → falha (módulo não existe).
- [ ] **Step 3: Implementar** e carregar com `<script src="js/texto-seguro.js">` antes do script inline.
- [ ] **Step 4: Aplicar:** saída de IA em `getDica`, `comparar` (dica) e `buscarOpiniao` passa por `TextoSeguro.mdSimples`; `f.mercado` e nomes de itens em `renderFolhetos` por `TextoSeguro.escapar`. Prompts dessas três funções ganham "Responda em texto simples, sem markdown."
- [ ] **Step 5: Botão "Buscar opiniões":** a função `buscarOpiniao()` existe mas a tela não tem `#opiniao-btn` nem `#opiniao-box`. Na tela Comprar, logo abaixo do campo `c-nome`, criar `<button id="opiniao-btn" class="btn btn-s btn-bl" onclick="buscarOpiniao()"><i class="ti ti-world-search"></i>Buscar opiniões na web</button>` e `<div id="opiniao-box" class="tip-box" style="display:none"></div>`.
- [ ] **Step 6:** `node --test tests/` → tudo passa. `grep -n "innerHTML=.*resp\|innerHTML='💡 '+resp\|innerHTML='🔍 '+text" index.html` → nenhuma linha.
- [ ] **Step 7: Commit:** `feat: saida da IA sem markdown cru e botao Buscar opinioes`.

### Task 3: Comparar com unidades diferentes (`js/unidades.js`)

**Files:**
- Create: `js/unidades.js`, `tests/unidades.test.js`
- Modify: `index.html` (`comparar()` 946-967)

**Interfaces:**
- Produces: `window.Unidades = { precoPorBase(preco: number, qtd: number, un: string): {valor: number, base: 'kg'|'L'|'un'} | null }`. `g` → divide qtd por 1000 e base `kg`; `kg` → `kg`; `ml` → /1000, `L`; `l`/`L` → `L`; `un`, `pç`, `cx`, `pct` → `un`. Unidade desconhecida ou qtd ≤ 0 → `null`. Comparação sem diferenciar maiúscula.

- [ ] **Step 1: Testes:** `precoPorBase(5, 500, 'g')` → `{valor: 10, base: 'kg'}`; `precoPorBase(9, 1, 'kg')` → `{valor: 9, base: 'kg'}`; `precoPorBase(4, 500, 'ml')` → `{valor: 8, base: 'L'}`; `precoPorBase(3, 0, 'g')` → `null`; `precoPorBase(3, 2, 'xyz')` → `null`.
- [ ] **Step 2:** `node --test tests/unidades.test.js` → falha.
- [ ] **Step 3: Implementar** e carregar o script.
- [ ] **Step 4: Usar em `comparar()`:** calcular A e B com `precoPorBase`; se algum for `null` ou as bases forem diferentes (ex.: kg × un), mostrar no `comp-pct`: "Unidades diferentes (kg x un): não dá para comparar." e não chamar a IA. A caixa mostra "por kg" / "por L" / "por un".
- [ ] **Step 5:** `node --test tests/` → passa.
- [ ] **Step 6: Commit:** `fix: comparar converte g/kg e ml/L`.

### Task 4: Chamada de IA com imagem ou PDF (`js/ia.js`) e `/api/claude`

**Files:**
- Create: `js/ia.js`, `tests/ia.test.js`
- Modify: `index.html` (`claudeImg` 574-589, `lerFoto` ~832, `lerCupom` ~1188), `api/claude.py`, `tests/test_claude_api.py`

**Interfaces:**
- Produces em `js/ia.js`:
  - `MODELO_BARATO = 'claude-haiku-4-5-20251001'` (ver escolha 7). `getDica`, dica do `comparar`, `buscarOpiniao`, foto de preço, cupom e folheto passam a usar `MODELO_BARATO`. Receitas e cardápio não mudam neste plano.
  - `LIMITE_PDF_BYTES = 2_900_000` (base64 cabe nos 4 MB).
  - `validarArquivo(file: {type: string, size: number}): string | null` — erro em português ou `null`. Aceita `image/*` e `application/pdf`; PDF acima do limite → "PDF grande demais (máx. 2,9 MB). Divida em partes."; outro tipo → "Tipo de arquivo não aceito.".
  - `montarConteudo(prompt: string, b64: string, mime: string): object[]` — imagem → `{type:'image', source:{type:'base64', media_type:'image/jpeg', data}}` (a foto já sai JPEG de `toB64`); PDF → `{type:'document', source:{type:'base64', media_type:'application/pdf', data}}`; depois `{type:'text', text: prompt}`.
  - `createIa({ claudeFetch })` → `{ claudeArquivo({prompt, b64, mime, model, maxTokens}): Promise<{texto: string, cortado: boolean}> }`. `cortado = (stop_reason === 'max_tokens')`. Erro HTTP lança `Error(mensagem do servidor)`.
- Em `index.html`: `toB64(file)` só reduz imagem; para PDF devolve o base64 do arquivo sem mexer. `claudeImg` passa a usar `ia.claudeArquivo`. As chamadas inexistentes `ai(prompt, b64, file.type, modelo, maxTk)` (foto de preço e cupom) passam a `(await ia.claudeArquivo({prompt, b64, mime: file.type, model: modelo, maxTokens: maxTk})).texto`.
- Em `api/claude.py` (achados da revisão):
  - `CAMPOS_PERMITIDOS = frozenset({"model","max_tokens","messages","tools","system","temperature"})` e `TIPOS_CONTEUDO = frozenset({"text","image","document"})`; `validar_corpo` erra com campo fora da lista ("Campo não permitido.") ou bloco de conteúdo de tipo fora da lista ("Conteúdo não permitido.").
  - Resposta da Anthropic 401/403 (chave errada) vira **502** "Serviço de IA indisponível." para o app não confundir com sessão expirada.

- [ ] **Step 1: Testes JS** (`tests/ia.test.js`): `validarArquivo aceita jpeg`; `validarArquivo recusa PDF acima do limite` (size 3_000_000); `validarArquivo recusa texto` (`text/plain`); `montarConteudo PDF usa document`; `claudeArquivo devolve texto juntado` (fetch falso com `content:[{text:'a'},{text:'b'}]` → `'ab'`); `claudeArquivo marca cortado` (`stop_reason:'max_tokens'` → `cortado: true`); `claudeArquivo lança mensagem do servidor` (status 400, `{error:{message:'Modelo não permitido.'}}`).
- [ ] **Step 2: Testes Python** em `tests/test_claude_api.py`: `test_campo_extra_erra` (`{"...", "stream": true}`); `test_documento_pdf_passa`; `test_bloco_desconhecido_erra` (`type: "tool_result"`); `test_mapear_status_anthropic` para uma função nova `mapear_status(status: int) -> int` (401→502, 403→502, 429→429, 200→200).
- [ ] **Step 3:** rodar os dois → falham.
- [ ] **Step 4: Implementar** `js/ia.js`, mudanças no `index.html` e em `api/claude.py` (usar `mapear_status` no `do_POST`, trocando a mensagem quando virar 502).
- [ ] **Step 5:** `node --test tests/` e `python -m pytest tests/ -v` → tudo passa. `grep -nE "\bai\(" index.html` → nenhuma linha.
- [ ] **Step 6: Commit:** `feat: IA com imagem ou PDF; corrige ai() inexistente; api valida campos`.

### Task 5: Regras puras de folheto (`js/folhetos.js`)

**Files:**
- Create: `js/folhetos.js`, `tests/folhetos.test.js`

**Interfaces:**
- Produces `window.Folhetos`:
  - Constantes: `ECONOMIA_MINIMA = 5`, `ECONOMIA_FORTE = 30`.
  - `casarLocal(lista: {nome:string}[], folhetos: {id, mercado, itens}[]): { pares: [iLista, iFolheto, iItem][], semPar: number[] }` — sem IA. Palavras = `normalizar(nome)` dividido por espaço, sem palavras de até 2 letras e sem números/unidades (`1kg`, `500g`, `2l`). Casa quando **todas** as palavras do item da lista aparecem no nome do item do folheto (ex.: "leite" casa "Leite Integral Itambé 1L"; "leite sem lactose" não casa "Leite Integral"). `semPar` = índices da lista sem nenhum par em nenhum folheto.
  - `PROMPT_LEITURA: string` — exato: `"Folheto de supermercado. Liste TODOS os produtos com preço, um por linha, no formato: nome|preço|unidade. Preço com ponto decimal, sem R$. Unidade: kg, g, L, ml, un ou vazio. Sem cabeçalho, sem texto extra."`
  - `normalizar(s: string): string` — minúsculas, sem acento, espaços únicos, sem espaço nas pontas.
  - `lerLinhasIA(texto: string): Item[]` — aceita `nome|preço|unidade`; preço com `,` ou `.` e com ou sem `R$`; ignora linhas sem preço > 0; unidade vazia → `null`.
  - `lerCsv(texto: string): { porMercado: Record<string, Item[]>, ignoradas: number }` — tira BOM; exige cabeçalho `mercado;produto;preco;unidade` (aceita `,` como separador se o cabeçalho usar `,`); mercado vazio ou preço inválido → conta em `ignoradas`.
  - `juntarItens(a: Item[], b: Item[]): Item[]` — remove repetidos com mesmo `normalizar(nome)`, `preco` e `unidade`; mantém a ordem.
  - `calcularComparativo(lista: {nome:string}[], folhetos: {id, mercado, itens}[], pares: [iLista, iFolheto, iItem][]): Resultado` onde `Resultado = { linhas: {item: string, precos: Record<mercado, number>}[], totais: Record<mercado, {total: number, encontrados: number}>, base: string, recomendacoes: {mercado, itens: string[], economia: number}[], soEm: Record<mercado, string[]>, nota: string }`. Pares inválidos (índice fora) são ignorados; com dois preços do mesmo mercado para um item, vale o menor.
  - Regra da nota: `base` = mercado com mais itens da lista encontrados (empate: menor total). Para cada outro mercado M: itens onde M é mais barato que `base`; `economia` = soma das diferenças. `recomendacoes` = mercados com `economia ≥ ECONOMIA_MINIMA`, da maior para a menor economia. `soEm` = itens achados só em um mercado.
  - Texto exato de `nota` (uma frase por linha, `\n` entre elas):
    - 1ª linha sempre: `"Base: {base}."`
    - para cada M em `recomendacoes` com economia ≥ `ECONOMIA_FORTE`: `"No {M} você terá {fmt(economia)} de economia ({n} itens). Vale a pena!"`
    - para cada M com economia entre `ECONOMIA_MINIMA` e `ECONOMIA_FORTE`: `"No {M} você terá {fmt(economia)} de economia total ({n} itens). Compensa se o deslocamento não for grande."`
    - sem recomendação: `"Tanto faz: compre tudo no {base}."` e, se houver alguma economia > 0, acrescentar `" Outro mercado economizaria só {fmt(maior economia)}."`
    - `fmt` = `R$ 0,00` em pt-BR.
- `Item = {nome: string, preco: number, unidade: string|null}`.

- [ ] **Step 1: Testes** em `tests/folhetos.test.js`:
  - `normalizar('  Leite  Sem LACTOSE ')` → `'leite sem lactose'`; `normalizar('Pão Francês')` → `'pao frances'`
  - `lerLinhasIA('Arroz 5kg|22,90|un\nlixo\nTomate|R$ 7.99|kg')` → 2 itens com preços `22.9` e `7.99`
  - `lerCsv` com BOM, 2 mercados e 1 linha ruim → 2 chaves e `ignoradas: 1`
  - `lerCsv` com cabeçalho errado → `porMercado` vazio e `ignoradas` = nº de linhas
  - `juntarItens` remove repetido "Leite"/"leite" com mesmo preço e mantém o de preço diferente
  - `calcularComparativo tanto faz`: 2 mercados, 3 itens com R$ 1 de diferença cada (R$ 3) → `recomendacoes` vazio e nota `"Base: A.\nTanto faz: compre tudo no A. Outro mercado economizaria só R$ 3,00."`
  - `calcularComparativo usuário decide`: economia R$ 10 em 4 itens → linha `"No B você terá R$ 10,00 de economia total (4 itens). Compensa se o deslocamento não for grande."`
  - `calcularComparativo vale a pena`: economia R$ 50 → linha `"No B você terá R$ 50,00 de economia (… itens). Vale a pena!"`
  - `calcularComparativo limite`: economia exata R$ 5,00 → recomenda; R$ 4,99 → não; R$ 30,00 → "Vale a pena!"
  - `calcularComparativo ignora par inválido` e lista `soEm`
  - `casarLocal casa por palavras`: lista `["Leite", "Leite sem lactose", "Café"]`, folheto `["Leite Integral Itambé 1L", "Leite Sem Lactose Piracanjuba 1L", "Açúcar 5kg"]` → "Leite" casa os dois leites, "Leite sem lactose" só o 2º, "Café" vai para `semPar`
  - `casarLocal ignora números e unidades` ("Arroz 5kg" casa "ARROZ TIO JOÃO 5 KG")
- [ ] **Step 2:** `node --test tests/folhetos.test.js` → falha.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4:** `node --test tests/` → passa.
- [ ] **Step 5: Commit:** `feat: regras de folheto (leitura, CSV, comparativo e nota final)`.

### Task 6: Tela Folhetos salva no banco (`js/tela-folhetos.js`)

**Files:**
- Create: `js/tela-folhetos.js`, `tests/tela-folhetos.test.js`
- Modify: `index.html` (HTML 280-297; apagar `renderFolhetos`, `lerFolheto`, `rmFolheto`, `compararFolhetos` e a variável `folhetos` de 635/969-1006; `showTab` 668 chama `TelaFolhetos.abrir()`; limpeza ao sair chama `TelaFolhetos.limpar()`)

**Interfaces:**
- Consumes: `dbGet/dbPost/dbPatch/dbDel` (Parte 1), `ia.claudeArquivo`, `validarArquivo` (Task 4), `Folhetos.*` (Task 5), `TextoSeguro` (Task 2), `toB64`.
- Produces: `createTelaFolhetos({ db, ia, toB64, doc, avisar })` → `{ abrir(), limpar(), processarArquivos(files: File[], mercado: string, folhetoId?: string): Promise<{lidos: number, falhas: string[], cortado: boolean}>, importarCsv(file: File): Promise<{criados: number, ignoradas: number}>, adicionarPaginas(folhetoId: string, files: File[]), remover(folhetoId: string), comparar() }`. No navegador: `window.TelaFolhetos = createTelaFolhetos({...})`. `avisar(msg)` mostra mensagem na tela (sem `alert`).
- Comportamento:
  - HTML: campo "Nome do mercado"; botão "Adicionar fotos/PDF" (desligado e com texto "Digite o nome do mercado primeiro" enquanto o campo está vazio); `<input type="file" multiple accept="image/*,application/pdf">` **sem** `capture` (no iPhone abre o menu Fototeca / Tirar Foto / Arquivos); botão "Importar CSV" com `accept=".csv,text/csv"`.
  - `processarArquivos`: um arquivo por vez, progresso "Lendo 2 de 5...", `validarArquivo` antes de enviar; falha em um não para os outros; cria o folheto no banco no primeiro sucesso e faz `dbPatch` dos itens a cada novo sucesso. Se `cortado`, avisa "Folheto grande: alguns itens podem ter ficado de fora. Envie em partes.".
  - `adicionarPaginas`: relê o folheto com `dbGet('folhetos', 'id=eq.<id>')` antes de juntar (`juntarItens`) e gravar.
  - Cartão de cada folheto: mercado (escapado), "N itens · dd/mm", botões "+ páginas" e remover (com `confirm`). Toque no cartão mostra os itens.
  - `abrir()` carrega `dbGet('folhetos','order=criado_em.desc')` e o último `comparativos` (`order=criado_em.desc&limit=1`), mostrando a nota dele.
  - Falha ao gravar no banco: avisa "Não salvei no banco. Toque em Salvar para tentar de novo." e mantém o folheto na tela marcado "não salvo" com botão Salvar.
  - `comparar()`: **sem IA** primeiro: `casarLocal` → `calcularComparativo` → mostra tabela (item × mercado, menor preço em destaque), totais, "Só no X" e a nota (cada linha da nota em parágrafo próprio, "Vale a pena!" em destaque); salva em `comparativos`. Se `semPar` não estiver vazio, mostra "{n} itens não encontrados" e o botão **"Procurar com IA"**: manda à IA (`MODELO_BARATO`, `max_tokens` 1500) só esses itens da lista e os itens dos folhetos, numerados, pedindo **só** JSON `{"pares":[[iLista,iFolheto,iItem],...]}` (produto igual ou equivalente; tamanhos diferentes não casam); junta aos pares locais, recalcula e atualiza o comparativo salvo.
- [ ] **Step 1: Testes** (`tests/tela-folhetos.test.js`, com `db`, `ia`, `toB64` e `doc` falsos — só lógica, sem DOM real; `doc` pode ser um objeto mínimo com `getElementById` que devolve `{innerHTML:'', style:{}, ...}`):
  - `processarArquivos continua após falha` (3 arquivos, o 2º lança) → `lidos: 2`, `falhas: ['<nome do 2º>']`, 1 `dbPost` e 1 `dbPatch`
  - `processarArquivos recusa PDF grande sem chamar a IA`
  - `processarArquivos avisa quando cortado`
  - `adicionarPaginas relê antes de gravar` (o `dbGet` devolve itens novos de outro aparelho; o `dbPatch` contém os dois)
  - `importarCsv cria um folheto por mercado` e devolve `ignoradas`
  - `comparar salva em comparativos` com `nota` igual à de `calcularComparativo`
  - `comparar não chama a IA quando todos casam` (ia falsa conta 0 chamadas)
  - `Procurar com IA manda só os itens sem par`
  - `nome com <script> aparece escapado no cartão`
- [ ] **Step 2:** rodar → falha.
- [ ] **Step 3: Implementar** `js/tela-folhetos.js` e trocar o HTML/JS antigo no `index.html`.
- [ ] **Step 4:** `node --test tests/` → passa; `grep -n "folhetos=\[\]\|capture="environment".*fol-" index.html` → nenhuma linha.
- [ ] **Step 5: Teste manual local** (`python -m http.server 8000`; a IA só funciona em produção, então aqui testar CSV, salvar, remover e a regra do botão desligado). Registrar em `docs/folhetos/teste-manual.md`.
- [ ] **Step 6: Commit:** `feat: folhetos com varias fotos, PDF, CSV e salvos no banco`.

### Task 7: Robustez de login e banco (achados menores da revisão)

**Files:**
- Modify: `js/auth.js`, `js/db.js`, `tests/auth.test.js`, `tests/db.test.js`

**Interfaces:**
- `getAccessToken()`: renovação simultânea usa **uma** só chamada (guardar a promessa em andamento); a sessão só é apagada se a renovação responder 400 ou 401 (outros status e erro de rede mantêm a sessão e devolvem `null`).
- `dbPatch` e `dbDel` usam `id=eq.${encodeURIComponent(id)}`.
- [ ] **Step 1: Testes:** `duas chamadas simultâneas fazem uma renovação`; `renovação com 500 não apaga a sessão`; `dbPatch codifica o id` (`'a b'` → `id=eq.a%20b`).
- [ ] **Step 2:** rodar → falham.
- [ ] **Step 3: Implementar.**
- [ ] **Step 4:** `node --test tests/` → passa.
- [ ] **Step 5: Commit:** `fix: renovacao de token unica e id codificado`.

### Task 8: Pasta de folhetos lida pelo Claude Code + validador do CSV

Caminho principal do Pedro: ele abre o Claude Code, cola o prompt pronto com o caminho da pasta, e o Claude Code lê as imagens/PDFs (sem custo de API) e escreve o CSV. O validador local (sem IA) confere e arruma o arquivo antes de ir ao app.

**Files:**
- Create: `scripts/folhetos_csv.py`, `tests/test_folhetos_csv.py`, `docs/folhetos/ler-pasta-com-claude-code.md`

**Interfaces:**
- Produces em `scripts/folhetos_csv.py` (só biblioteca padrão, sem rede):
  - `ler_csv(texto: str) -> tuple[list[dict], list[str]]` — mesmas regras de `Folhetos.lerCsv` (Task 5); devolve itens `{mercado, produto, preco: float, unidade: str|None}` e mensagens de erro por linha (`"linha 7: preço inválido"`).
  - `limpar(itens: list[dict]) -> list[dict]` — tira repetidos (mesmo mercado, `produto` normalizado sem acento/maiúscula, preço e unidade) e espaços sobrando.
  - `escrever_csv(itens: list[dict], saida: Path) -> int` — UTF-8 com BOM, `;`, cabeçalho `mercado;produto;preco;unidade`, preço com vírgula (`22,90`); devolve nº de linhas.
  - Linha de comando: `python scripts/folhetos_csv.py <arquivo.csv>` — valida, limpa, regrava no mesmo arquivo (cópia do original em `<arquivo>.bak` na primeira vez) e imprime `"{n} itens em {m} mercados; {e} linhas com erro"` + as linhas com erro. Sai com código 1 se nenhuma linha for válida.
- `docs/folhetos/ler-pasta-com-claude-code.md`: (1) formato do CSV com exemplo de 3 linhas fictícias; (2) **prompt pronto para colar** no Claude Code: ler todas as imagens/PDFs de `<pasta>` (uma por vez, páginas do PDF com `Read(pages=...)`), usar o nome da pasta como mercado se o Pedro não disser outro, extrair todos os produtos com preço, escrever `<pasta>\folheto.csv` no formato, rodar `python C:\dev\solo-app\scripts\folhetos_csv.py <pasta>\folheto.csv` e mostrar o resumo; (3) como levar ao app: salvar no Drive ou mandar no WhatsApp para si → app → **Folhetos** → **Importar CSV**. Sem chave de API em lugar nenhum.
- [ ] **Step 1: Testes** (`tests/test_folhetos_csv.py`): `test_ler_csv_bom_e_virgula_decimal`; `test_ler_csv_aceita_virgula_como_separador_se_cabecalho_usar`; `test_ler_csv_aponta_linha_ruim` (`"linha 3: preço inválido"`); `test_limpar_remove_repetido_com_acento` ("Pão" e "pao", mesmo preço → 1); `test_escrever_csv_bom_e_virgula` (arquivo começa com BOM e contém `22,90`); `test_cli_sem_linhas_validas_sai_com_1`; `test_mesmo_resultado_que_js` (o CSV de exemplo de `docs/folhetos/ler-pasta-com-claude-code.md` dá o mesmo número de itens em `ler_csv` e no teste `lerCsv` da Task 5 — usar o mesmo texto de exemplo nos dois testes).
- [ ] **Step 2:** `python -m pytest tests/test_folhetos_csv.py -v` → falha.
- [ ] **Step 3: Implementar** script e doc.
- [ ] **Step 4:** `python -m pytest tests/ -v` → tudo passa. Importar o CSV de exemplo na tela local (Task 6) e ver o folheto criado.
- [ ] **Step 5: Commit:** `feat: validador do CSV de folhetos e prompt para o Claude Code ler a pasta`.

### Task 9: Publicar e verificar (com o Pedro)

**Files:**
- Create: `docs/folhetos/verificacao.md`

- [ ] **Step 1:** Pedro roda `supabase/03-folhetos.sql` (guia, Task 1) e cola o resultado do último `select` (esperado: `folhetos` e `comparativos` com RLS e 1 política). Se der erro, rodar `99b-rollback-folhetos.sql` e parar.
- [ ] **Step 2:** `python scripts/verificar_anonimo.py` com `folhetos` e `comparativos` acrescentadas à lista de tabelas do script → `True` em todas.
- [ ] **Step 3:** pedir OK do Pedro → `git push -u origin parte2a`. Preview da Vercel não tem chave de IA: lá testar só CSV, salvar e remover.
- [ ] **Step 4:** pedir OK explícito para o merge → `git switch main`, `git merge parte2a`, `git push`. Esperar o deploy.
- [ ] **Step 5: Pedro testa no celular e depois no PC:** (a) 3 fotos da galeria de uma vez; (b) 1 PDF; (c) "+ páginas" num folheto existente; (d) pedir ao Claude Code para ler uma pasta de teste e importar o CSV; (e) o folheto aparece no PC; (f) comparativo com nota final; (g) dica 💡 e "Buscar opiniões" sem `###` nem `**`; (h) foto de preço e cupom funcionando; (i) comparar 500 g × 1 kg.
- [ ] **Step 6:** registrar em `docs/folhetos/verificacao.md` (sem dados reais), commit, push com OK, e seção nova em `C:\CLAUDE\curto-prazo\solo-app.md` com os comandos do núcleo.

---

## Fora da 2a (próximos planos)

### Parte 2b — Produtos, lotes e lista (esboço)
Tabelas `produto` (apelidos, essencial, prazo, duração estimada), `compra_lote`, `lista_item`; sugestão de nome com `Folhetos.normalizar` (reaproveitar); "acabou" por compra; previsão de duração e custo por dia; planejado × esquecido essencial × impulso no "Confirmar compra"; peso variável e local. Continuar a separação do `index.html` em arquivos por tela (padrão de `js/tela-folhetos.js`). Depois da 2b, o comparativo pode usar `essencial` e quantidades reais.

### Parte 3 (já prevista)
PWA, notificações, tarefa diária, atalho do iPhone e envio direto do script ao app com token longo trocável.

### Ideias futuras (não implementar; exigem desenhar privacidade antes, pois hoje o RLS isola cada conta)
- Compartilhar receitas, listas e itens entre perfis (ex.: Pedro e Aline).
- Dicas, opiniões e "achados" de preço compartilhados (ex.: "Fulano achou tomate por R$ 10 no mercado Zé").

### Menos IA com o tempo (pedido do Pedro)
- Ler preço da foto sem IA (OCR no navegador, ex.: Tesseract.js, grátis): avaliar numa parte futura; pesa no celular e erra mais que a IA em etiqueta.
- Dicionário de apelidos aprendido: quando a IA casa um item que `casarLocal` não casou, guardar o par ("café" → "Café Pilão 500g") para casar sem IA da próxima vez. Natural na Parte 2b, junto com os apelidos de `produto`.

### Achados da revisão que ficam de fora
Teto de uso por usuário no `/api/claude` (Parte 3, junto com o token longo); checar referências entre tabelas no RLS (2b, com as tabelas novas); aviso de offline na tela de login; SQL 01 idempotente (já rodado, sem efeito agora).

## Self-review
- **Cobertura do brief:** A1 nome do mercado (Task 6 + escolha 1); A2 galeria e PDF (Tasks 4, 6); A3 várias fotos e editar (Task 6); A4 salvar no banco (Tasks 1, 6, 9); A5 markdown (Task 2); A6 nota final (Task 5); A7 custo/tempo (escolha 7: modelo mais barato e comparação sem IA); B pasta lida pelo Claude Code + validador e formato (Task 8 + escolhas 3-5); C itens antigos (Tasks 2, 3, 4, 7 e lista de fora); D ideias (seção acima).
- **Tipos:** `Item`, `claudeArquivo`, `validarArquivo`, `calcularComparativo`, `PROMPT_LEITURA` têm o mesmo nome e forma onde são produzidos e consumidos.
- **Proporção:** 9 tarefas; código só como assinaturas, testes e textos exatos. Se a execução quiser dividir, Tasks 1-4 e 7 são independentes de 5-6-8.
