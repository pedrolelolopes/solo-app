# Solo — Fase 1, Parte 1: Segurança — Plano de execução

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trocar o login por nome por login de verdade (Supabase Auth), trancar o banco com Row Level Security (cada pessoa só vê os próprios dados) e fechar a função `/api/claude`, sem perder os dados atuais.

**Architecture:** O navegador entra com e-mail e senha no Supabase Auth e manda o token de acesso em toda chamada (ao banco e a `/api/claude`). O banco recebe uma coluna `owner_id` (padrão `auth.uid()`) em cada tabela, com política de acesso só para o dono. A função `/api/claude` passa a ser Python, confere o token no Supabase, limita origem, modelo e tamanho. O código novo fica em `js/` (sem build); o `index.html` só o usa.

**Tech Stack:** HTML/JS sem framework, Supabase (Auth + Postgres, plano gratuito), Vercel Hobby (funções Python), testes: `node --test` (JS) e `pytest` (Python).

**Spec:** `docs/superpowers/specs/2026-11-25-fase1-design.md` (seções "Restrições" e "Segurança primeiro (opção A)"). Ler antes de começar.

## Global Constraints
- Custo zero: só planos gratuitos (Supabase, Vercel Hobby).
- O repositório `pedrolelolopes/solo-app` é **público**: nunca gravar senha, token de usuário, chave `ANTHROPIC_API_KEY`, nem dados reais no repositório. A chave pública (anon) do Supabase já está no código e pode ficar em `js/config.js`.
- Cada pessoa da família tem conta própria e só vê os próprios dados. Cadastro **só por convite**: o Pedro cria as contas; cadastro aberto fica desligado.
- Dados existentes (listas, histórico, receitas, cardápio) não podem ser perdidos. Antes de qualquer mudança no banco, o Pedro faz backup (Task 1).
- Nada vai para o `main` (que publica em produção na Vercel) sem o OK explícito do Pedro na conversa. Commits locais são livres; `git push` só na Task 8.
- Nunca altere configuração de conta/sistema por conta própria: o painel do Supabase e da Vercel são do Pedro. O plano dá o passo a passo e ele clica.
- O Pedro tem TDAH: passos para ele em português simples, um clique por linha, com o nome exato do menu. Respostas curtas.
- Modelos de IA permitidos na função: `claude-sonnet-4-6`, `claude-haiku-4-5-20251001`, `claude-sonnet-5-5`, `claude-haiku-5-5`. Não trocar o modelo usado pelas telas neste plano.

## Review Focus
1. Sessão expira no meio do uso: o token renova sozinho; se a renovação falhar, volta à tela de login sem apagar o carrinho aberto.
2. Pessoa A tenta ler/gravar dado da pessoa B (chamada direta à API do Supabase): resultado vazio ou negado.
3. Chave pública sem login (anônimo): vazio ou negado em todas as 9 tabelas.
4. `/api/claude` sem token → 401; modelo fora da lista → 400; `max_tokens` acima do teto → 400; origem diferente do site → sem permissão CORS.
5. Senha errada ou sem internet: mensagem clara em português, sem tela em branco.

## Estrutura de arquivos
- Create `js/config.js` — URL e chave pública do Supabase (movidas do `index.html`).
- Create `js/auth.js` — login, renovação e saída (módulo testável).
- Create `js/db.js` — `dbGet/dbPost/dbPatch/dbDel` e `claudeFetch` com o token.
- Create `api/claude.py` — função Python que substitui `api/claude.js` (que é apagado).
- Create `supabase/00-inspecao.sql`, `01-colunas.sql`, `02-rls.sql`, `99-rollback.sql`.
- Create `scripts/verificar_anonimo.py` — confere que o anônimo não lê nada.
- Create `tests/auth.test.js`, `tests/db.test.js`, `tests/test_claude_api.py`, `tests/test_verificar_anonimo.py`.
- Create `docs/seguranca/guia-pedro.md` — passo a passo do Pedro (Supabase e Vercel).
- Modify `index.html` — tela de login, chamadas e remoção de `user_id`.
- Modify `package.json` — script `test`.

Tabelas do banco (9), todas hoje sem proteção: `usuarios`, `lista_permanente`, `lista_hoje`, `frequencia`, `sessoes_compra`, `itens_compra`, `cardapio`, `receitas`, `ingredientes_receita`.

---

### Task 1: Inspeção e backup do banco (com o Pedro)

**Files:**
- Create: `supabase/00-inspecao.sql`
- Create: `docs/seguranca/guia-pedro.md`
- Create: `docs/seguranca/inspecao-resultado.md` (resultado colado pelo Pedro, **sem** dados de usuários nem chaves)

**Interfaces:**
- Produces: lista real de colunas, restrições (constraints), políticas e estado do RLS de cada tabela; lista dos nomes em `usuarios`. As Tasks 3 e 8 dependem disso.

- [ ] **Step 1: Escrever `supabase/00-inspecao.sql`** (só leitura): (a) colunas e tipos das 9 tabelas (`information_schema.columns`); (b) restrições `unique`/`foreign key` (`information_schema.table_constraints` + `key_column_usage`); (c) estado do RLS (`pg_tables.rowsecurity`) e políticas (`pg_policies`); (d) `select nome_key, nome from public.usuarios`; (e) contagem de linhas por tabela.
- [ ] **Step 2: Escrever `docs/seguranca/guia-pedro.md`**, seção "Backup e inspeção", com passos de clique: abrir o projeto no Supabase → **SQL Editor** → **New query** → colar o conteúdo de `00-inspecao.sql` → **Run** → copiar o resultado e colar na conversa (apagar os nomes de pessoas antes de colar no arquivo do repositório). Backup: **Database → Backups** (conferir o que o plano gratuito oferece) e, como garantia, exportar cada tabela em **Table Editor → (tabela) → Export → CSV** para a pasta `G:\Meu Drive\PESSOAL-HUB\` (nunca no repositório). Os nomes dos menus podem variar um pouco: o guia deve dizer "se não achar, procure por X".
- [ ] **Step 3: Parar e pedir ao Pedro** o resultado da inspeção e a confirmação de que o backup está no Drive. Não seguir sem os dois.
- [ ] **Step 4: Salvar o resultado em `docs/seguranca/inspecao-resultado.md`** (sem nomes de pessoas) e decidir, anotando no próprio arquivo: o nome real de cada coluna de dono (`user_id`), se `frequencia` tem `unique(nome)` (se sim, a Task 3 troca por `unique(owner_id, nome)`), e quem está em `usuarios` (cada nome vira uma linha do mapa da Task 3).
- [ ] **Step 5: Commit local**

```bash
git add supabase/00-inspecao.sql docs/seguranca
git commit -m "docs: inspecao do banco e guia do Pedro"
```

### Task 2: Contas no Supabase Auth (com o Pedro)

**Files:**
- Modify: `docs/seguranca/guia-pedro.md` (seção "Contas")

**Interfaces:**
- Produces: contas criadas, cadastro aberto desligado, e o Pedro com o `id` (UUID) de cada conta. A Task 3 usa esses UUIDs.

- [ ] **Step 1: Escrever a seção "Contas" do guia**: **Authentication → Users → Add user → Create new user**, marcar **Auto Confirm User**, criar a conta do Pedro com e-mail e uma senha que ele escolhe (nunca digitar a senha na conversa). Repetir para cada familiar que for usar. Copiar o `User UID` de cada conta. Depois **Authentication → Sign In / Providers** (ou **Providers → Email**): desligar **Allow new users to sign up**. Reforçar: sem isso, qualquer pessoa cria conta e gasta a chave da Anthropic.
- [ ] **Step 2: Pedir ao Pedro** o `User UID` de cada conta e, para cada nome antigo em `usuarios`, de quem é (mapa nome antigo → conta). Dados de lista sem dono (`user_id` vazio) e a tabela `frequencia` vão para a conta do Pedro (decisão deste plano).
- [ ] **Step 3: Commit local**

```bash
git add docs/seguranca/guia-pedro.md
git commit -m "docs: guia de contas do Supabase Auth"
```

### Task 3: Scripts SQL (colunas, RLS, rollback) e verificador de anônimo

**Files:**
- Create: `supabase/01-colunas.sql`, `supabase/02-rls.sql`, `supabase/99-rollback.sql`
- Create: `scripts/verificar_anonimo.py`
- Test: `tests/test_verificar_anonimo.py`

**Interfaces:**
- Consumes: resultado da Task 1 (nomes reais de colunas) e UUIDs da Task 2.
- Produces: `avaliar_resposta(status: int, corpo: str) -> bool` (verdadeiro quando o anônimo não vê dados) e `verificar(url: str, anon_key: str, tabelas: list[str], abrir=urllib.request.urlopen) -> dict[str, bool]` em `scripts/verificar_anonimo.py`; linha de comando `python scripts/verificar_anonimo.py` lê `SUPABASE_URL` e `SUPABASE_ANON_KEY` do ambiente e sai com código 1 se alguma tabela vazar.

- [ ] **Step 1: Escrever o teste** `tests/test_verificar_anonimo.py`:
  - `test_vazio_200_e_seguro`: `avaliar_resposta(200, "[]") is True`
  - `test_401_e_403_sao_seguros`: `avaliar_resposta(401, "{}") is True` e `avaliar_resposta(403, "{}") is True`
  - `test_200_com_linhas_vaza`: `avaliar_resposta(200, '[{"id":1}]') is False`
  - `test_verificar_marca_tabela_que_vaza`: com `abrir` falso devolvendo `[]` para `lista_hoje` e `[{"id":1}]` para `receitas`, `verificar(...)` devolve `{"lista_hoje": True, "receitas": False}`
- [ ] **Step 2: Rodar e ver falhar:** `python -m pytest tests/test_verificar_anonimo.py -v` → falha (módulo não existe). Se `pytest` faltar: `python -m pip install pytest`.
- [ ] **Step 3: Implementar** `scripts/verificar_anonimo.py` conforme as assinaturas. A consulta é `GET {url}/rest/v1/{tabela}?select=*&limit=1` com `apikey` e `Authorization: Bearer` iguais à chave pública. `urllib.error.HTTPError` conta como resposta (status do erro).
- [ ] **Step 4: Rodar e ver passar:** `python -m pytest tests/test_verificar_anonimo.py -v` → 4 passed.
- [ ] **Step 5: Escrever `supabase/01-colunas.sql`** (seguro, não liga RLS): para cada uma das 8 tabelas de dados, `alter table public.<t> add column if not exists owner_id uuid default auth.uid() references auth.users(id)`; criar `public.mapa_usuario_legado(nome_key text primary key, owner_id uuid not null)` com `insert` dos nomes antigos do Pedro (com os UUIDs da Task 2); preencher `owner_id`: tabelas com `user_id` texto via mapa; `itens_compra` pelo `sessoes_compra` (`sessao_id`); `ingredientes_receita` pelo `receitas` (`receita_id`); linhas sem dono e `frequencia` inteira → UUID do Pedro. Ajustar `unique` de `frequencia` se a Task 1 mostrou que existe. Não apagar a coluna `user_id`.
- [ ] **Step 6: Escrever `supabase/02-rls.sql`**: repetir o preenchimento de `owner_id` onde ainda for nulo (cobre linhas criadas pelo app antigo entre as etapas); depois, para cada uma das 8 tabelas: `alter table public.<t> enable row level security;` e `create policy "<t>_dono" on public.<t> for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());`. Para `usuarios` (tabela legada): só `enable row level security`, sem política (ninguém acessa). Terminar com `select` que mostra, por tabela, quantas linhas têm `owner_id` nulo (deve ser 0).
- [ ] **Step 7: Escrever `supabase/99-rollback.sql`**: `drop policy` de cada uma e `disable row level security` nas 9 tabelas (volta ao estado de antes). As colunas `owner_id` ficam.
- [ ] **Step 8: Commit local**

```bash
git add supabase scripts tests/test_verificar_anonimo.py
git commit -m "feat: scripts SQL de seguranca e verificador de acesso anonimo"
```

### Task 4: Módulo de login `js/auth.js`

**Files:**
- Create: `js/auth.js`
- Test: `tests/auth.test.js`
- Modify: `package.json` (script `"test": "node --test tests/"`)

**Interfaces:**
- Produces: `createAuth({ url, anonKey, storage, fetchFn, agora })` onde `storage` tem `getItem/setItem/removeItem`, `fetchFn` é como `fetch` e `agora(): number` devolve segundos desde 1970. Retorna `{ signIn(email, senha), getAccessToken(), getUsuario(), signOut() }`:
  - `signIn(email: string, senha: string): Promise<{ok:true, usuario:{id:string, email:string}} | {ok:false, erro:string}>`
  - `getAccessToken(): Promise<string|null>` — renova antes de faltar 60 s para expirar; se a renovação falhar apaga a sessão e devolve `null`
  - `getUsuario(): {id:string, email:string}|null`
  - `signOut(): void`
- Formato no módulo: `if (typeof module !== 'undefined') module.exports = { createAuth }; else window.SoloAuth = { createAuth };`. A sessão fica em `storage` na chave `solo-session` como `{access_token, refresh_token, expires_at, usuario}`.
- Endpoints (Supabase GoTrue): `POST {url}/auth/v1/token?grant_type=password` com corpo `{email, password}` e `POST {url}/auth/v1/token?grant_type=refresh_token` com corpo `{refresh_token}`; cabeçalhos `apikey: <anonKey>` e `Content-Type: application/json`. Resposta de sucesso: `{access_token, refresh_token, expires_in, user:{id,email}}`.

- [ ] **Step 1: Verificar o ambiente:** `node --version` → v18 ou maior. Se faltar, avisar o Pedro com este comando para rodar no PowerShell: `winget install OpenJS.NodeJS.LTS`, e esperar.
- [ ] **Step 2: Escrever `tests/auth.test.js`** (com `node:test` e `assert`), usando `fetchFn` e `storage` falsos:
  - `signIn com sucesso guarda a sessão e devolve o usuário`
  - `signIn com senha errada (HTTP 400) devolve erro 'E-mail ou senha incorretos.'`
  - `signIn sem internet (fetch lança) devolve erro 'Sem conexão. Tente de novo.'`
  - `signIn com outro erro devolve 'Não foi possível entrar. Tente de novo.'`
  - `getAccessToken devolve o token guardado quando falta mais de 60 s`
  - `getAccessToken renova quando faltam 30 s e guarda o novo token`
  - `getAccessToken devolve null e apaga a sessão quando a renovação falha`
  - `getAccessToken sem sessão devolve null`
  - `signOut apaga a sessão`
- [ ] **Step 3: Rodar e ver falhar:** `node --test tests/auth.test.js` → falha (módulo não existe).
- [ ] **Step 4: Implementar `js/auth.js`** conforme a interface; erro de rede = exceção do `fetchFn`; HTTP 400 em `grant_type=password` = senha errada.
- [ ] **Step 5: Rodar e ver passar:** `node --test tests/auth.test.js` → 9 pass.
- [ ] **Step 6: Commit local**

```bash
git add js/auth.js tests/auth.test.js package.json
git commit -m "feat: modulo de login com renovacao de token"
```

### Task 5: Camada de acesso `js/config.js` e `js/db.js`

**Files:**
- Create: `js/config.js`, `js/db.js`
- Test: `tests/db.test.js`

**Interfaces:**
- Consumes: `getAccessToken(): Promise<string|null>` da Task 4.
- Produces em `js/config.js`: `SOLO_CONFIG = { url: string, anonKey: string }` (valores movidos do `index.html`: constantes `SB` e `SK`, linhas 539-540; não imprimir a chave em log nem mensagem). Formato: `window.SOLO_CONFIG = {...}` no navegador e `module.exports` no Node.
- Produces em `js/db.js`: `createDb({ url, anonKey, getToken, fetchFn })` → `{ dbGet(t, qs?), dbPost(t, data), dbPatch(t, id, data), dbDel(t, id), claudeFetch(body) }` com o **mesmo comportamento das funções antigas**: `dbGet` devolve `[]` em erro; `dbPost`/`dbPatch` devolvem a linha criada/alterada ou `null`; `dbDel` não lança. O cabeçalho `Authorization` usa o token do usuário (não a chave pública). Sem token: `dbGet` devolve `[]`, `dbPost`/`dbPatch` devolvem `null`. `claudeFetch(body: object): Promise<Response>` faz `POST /api/claude` com `Authorization: Bearer <token>` e lança `Error('sessao-expirada')` se não houver token.

- [ ] **Step 1: Escrever `tests/db.test.js`:**
  - `dbGet usa o token do usuário e a URL REST` (verifica `Authorization: Bearer tok` e `apikey`)
  - `dbGet devolve [] quando a resposta não é ok`
  - `dbGet devolve [] quando o fetch lança`
  - `dbPost devolve o primeiro item da resposta em lista`
  - `dbPost devolve null quando não ok`
  - `dbPatch usa ?id=eq.<id> e devolve a linha`
  - `dbDel não lança quando o fetch falha`
  - `sem token, dbGet devolve [] e não chama fetch`
  - `claudeFetch manda Bearer e corpo JSON para /api/claude`
  - `claudeFetch sem token lança sessao-expirada`
- [ ] **Step 2: Rodar e ver falhar:** `node --test tests/db.test.js`.
- [ ] **Step 3: Implementar `js/db.js` e `js/config.js`.**
- [ ] **Step 4: Rodar e ver passar:** `node --test tests/` → todos os testes (auth + db) passam.
- [ ] **Step 5: Commit local**

```bash
git add js/config.js js/db.js tests/db.test.js
git commit -m "feat: camada de acesso ao banco e ao Claude com token do usuario"
```

### Task 6: Integrar no `index.html` (login, chamadas, sem `user_id`)

**Files:**
- Modify: `index.html` (blocos: constantes e funções `db*` linhas 538-571; login 1303-1358; todas as chamadas com `user_id`; 4 chamadas `fetch('/api/claude'...)` nas linhas ~594, ~614, ~1382, ~1493)

**Interfaces:**
- Consumes: `SoloAuth.createAuth`, `SoloDb.createDb`, `SOLO_CONFIG`.
- Produces: globais `auth` (instância), `dbGet/dbPost/dbPatch/dbDel/claudeFetch` (mesmos nomes de antes), `mostrarLogin(): void`, `fazerLogin(): Promise<void>`, `trocarUsuario(): void`, `checkAutoLogin(): Promise<void>`. `currentUser` passa a ser `{ id: <uuid>, nome: <e-mail>, email }`.

- [ ] **Step 1: Carregar os módulos** com `<script src="js/config.js"></script>`, `js/auth.js`, `js/db.js` antes do script inline; no início do script inline criar `auth = SoloAuth.createAuth({ url: SOLO_CONFIG.url, anonKey: SOLO_CONFIG.anonKey, storage: localStorage, fetchFn: (...a) => fetch(...a), agora: () => Math.floor(Date.now()/1000) })` e `({dbGet,dbPost,dbPatch,dbDel,claudeFetch} = SoloDb.createDb({ url, anonKey, getToken: () => auth.getAccessToken(), fetchFn: (...a) => fetch(...a) }))`. Apagar as constantes `SB`, `SK`, `SH` e as quatro funções `db*` antigas.
- [ ] **Step 2: Tela de login:** trocar o campo de nome por **e-mail** e **senha** (`type="password"`), botão **Entrar**, mensagem de erro visível na própria tela (sem `alert`). `fazerLogin()` chama `auth.signIn`, mostra o erro devolvido, e em sucesso define `currentUser` e chama `init()`. `trocarUsuario()` chama `auth.signOut()` e `mostrarLogin()`. `checkAutoLogin()` usa `auth.getUsuario()` + `auth.getAccessToken()`; sem token válido, `mostrarLogin()`. Remover a chave `solo-user` do `localStorage` (limpar uma vez na carga) e o `dbPost('usuarios', ...)`.
- [ ] **Step 3: Remover `user_id`:** apagar todos os filtros `user_id=eq.…` nas consultas e todos os campos `user_id: currentUser?.id` nos `dbPost` (o banco preenche `owner_id` sozinho). `frequencia` continua filtrada só por nome (o RLS separa por pessoa).
- [ ] **Step 4: Trocar as 4 chamadas** `fetch('/api/claude', {...})` por `claudeFetch(<corpo>)`, mantendo o corpo e o tratamento de resposta. Onde houver `catch`, se `e.message === 'sessao-expirada'` chamar `mostrarLogin()`.
- [ ] **Step 5: Verificar por busca:** `grep -nE "user_id|solo-user|SB\b|SK\b|fetch\('/api/claude'" index.html` → nenhuma linha (exceto a limpeza da chave `solo-user` do Step 2, que deve ficar claramente comentada).
- [ ] **Step 6: Teste manual local** (sem `/api/claude`, que é só em produção): `python -m http.server 8000` na raiz do repositório; abrir `http://localhost:8000`; com o Pedro, entrar com a conta dele, ver lista/histórico/receitas antigos, adicionar e apagar um item, sair e entrar de novo, errar a senha de propósito (mensagem em português). Registrar o que funcionou em `docs/seguranca/teste-manual.md`. Só funciona depois de `01-colunas.sql` rodado e com o login criado (Tasks 2-3).
- [ ] **Step 7: Commit local**

```bash
git add index.html docs/seguranca/teste-manual.md
git commit -m "feat: login real, chamadas com token e sem user_id no cliente"
```

### Task 7: Função `/api/claude` em Python (substitui a JavaScript)

**Files:**
- Create: `api/claude.py`
- Delete: `api/claude.js`
- Test: `tests/test_claude_api.py`
- Modify: `docs/seguranca/guia-pedro.md` (seção "Variáveis da Vercel")

**Interfaces:**
- Produces em `api/claude.py`:
  - `MODELOS_PERMITIDOS: frozenset[str]` (os 4 do Global Constraints) e `TETO_MAX_TOKENS: int = 1500`, `FERRAMENTAS_PERMITIDAS: frozenset[str] = {"web_search_20250305"}`
  - `validar_corpo(corpo: object) -> str | None` — devolve a mensagem de erro ou `None`. Erra quando: não é dict; `model` ausente ou fora da lista; `max_tokens` ausente, não inteiro ou maior que o teto; `messages` ausente ou vazio; alguma `tools[].type` fora da lista.
  - `extrair_token(cabecalhos: Mapping[str, str]) -> str | None` — lê `Authorization: Bearer <token>`.
  - `origem_permitida(origem: str | None, permitida: str) -> bool`
  - `verificar_usuario(token: str, url: str, anon_key: str, abrir=urllib.request.urlopen) -> str | None` — chama `GET {url}/auth/v1/user` com `Authorization: Bearer <token>` e `apikey`; devolve o `id` do usuário ou `None`.
  - `class handler(BaseHTTPRequestHandler)` (formato de função Python da Vercel) com `do_OPTIONS` e `do_POST`. Ordem em `do_POST`: variáveis de ambiente (`ANTHROPIC_API_KEY`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `ALLOWED_ORIGIN`) ausentes → 503; origem inválida → 403; sem token ou token inválido → 401; corpo inválido → 400 com a mensagem; senão repassa a `https://api.anthropic.com/v1/messages` (`x-api-key`, `anthropic-version: 2023-06-01`) e devolve status e JSON. `Access-Control-Allow-Origin` = a origem permitida (nunca `*`).
- Só biblioteca padrão (sem `requirements.txt`).

- [ ] **Step 1: Escrever `tests/test_claude_api.py`** (importar o módulo por `importlib` a partir de `api/claude.py`):
  - `test_corpo_valido_passa` (modelo permitido, `max_tokens=600`, `messages` com 1 item) → `None`
  - `test_modelo_fora_da_lista_erra`
  - `test_max_tokens_acima_do_teto_erra` (`1501`)
  - `test_max_tokens_nao_inteiro_erra`
  - `test_messages_vazio_erra`
  - `test_ferramenta_nao_permitida_erra`
  - `test_ferramenta_web_search_passa`
  - `test_extrair_token_bearer` e `test_extrair_token_ausente`
  - `test_origem_igual_passa`, `test_origem_diferente_falha`, `test_origem_ausente_falha`
  - `test_verificar_usuario_devolve_id` (opener falso devolvendo `{"id":"u1"}`) e `test_verificar_usuario_token_invalido_devolve_none` (opener falso lança `HTTPError 401`)
- [ ] **Step 2: Rodar e ver falhar:** `python -m pytest tests/test_claude_api.py -v`.
- [ ] **Step 3: Implementar `api/claude.py`**, apagar `api/claude.js` (`git rm api/claude.js`; os dois não podem coexistir na mesma rota).
- [ ] **Step 4: Rodar e ver passar:** `python -m pytest tests/ -v` → tudo passa.
- [ ] **Step 5: Escrever a seção "Variáveis da Vercel" do guia:** no painel da Vercel, projeto `solo-app` → **Settings → Environment Variables**: adicionar `SUPABASE_URL` (a mesma de `js/config.js`), `SUPABASE_ANON_KEY` (a chave pública de `js/config.js`), `ALLOWED_ORIGIN` = `https://solo-app-nu.vercel.app`; `ANTHROPIC_API_KEY` já existe. Marcar Production e Preview. Fazer isso **antes** do merge da Task 8.
- [ ] **Step 6: Commit local**

```bash
git add api tests/test_claude_api.py docs/seguranca/guia-pedro.md
git commit -m "feat: /api/claude em Python com login, origem, modelo e teto de tokens"
```

### Task 8: Publicar em ordem segura e verificar (com o Pedro)

**Files:**
- Modify: `docs/seguranca/guia-pedro.md` (seção "Ordem de publicação")
- Create: `docs/seguranca/verificacao-final.md`

**Interfaces:**
- Consumes: tudo das Tasks 1-7.

A ordem importa: o app antigo em produção continua usando a chave pública sem login; se o RLS ligar antes de o app novo estar no ar, o app atual para de funcionar.

- [ ] **Step 1: Pedro roda `supabase/01-colunas.sql`** (SQL Editor → New query → colar → Run) e confirma "sem erro". O app atual continua funcionando.
- [ ] **Step 2: Pedro configura as variáveis da Vercel** (Task 7, Step 5).
- [ ] **Step 3: Pedir o OK do Pedro para enviar o branch** `seguranca`: `git switch -c seguranca` e `git push -u origin seguranca`. Se a Vercel gerar uma URL de teste (Preview) para o branch, o Pedro testa nela (login, lista, histórico, receitas e uma ação de IA como "Buscar opiniões"); senão, vale o teste local da Task 6 e a ação de IA só é testada após o merge.
- [ ] **Step 4: Pedir o OK explícito do Pedro para o merge no `main`** (publica em produção): `git switch main`, `git merge seguranca`, `git push`. Esperar a Vercel terminar o deploy; o Pedro entra no app em produção com a conta dele e testa uma ação de IA.
- [ ] **Step 5: Pedro roda `supabase/02-rls.sql`** e cola o resultado do último `select` (esperado: 0 linhas sem dono em todas as tabelas). Se algo quebrar, rodar `supabase/99-rollback.sql`.
- [ ] **Step 6: Verificar o anônimo:** `python scripts/verificar_anonimo.py` com `SUPABASE_URL` e `SUPABASE_ANON_KEY` no ambiente → saída `True` para as 9 tabelas e código de saída 0.
- [ ] **Step 7: Verificar o isolamento:** o Pedro entra com a conta dele e depois com a de um familiar (ou uma conta de teste criada só para isso): cada uma vê apenas os próprios dados e a conta nova começa vazia.
- [ ] **Step 8: Verificar o `/api/claude` fechado:** `curl -i -X POST https://solo-app-nu.vercel.app/api/claude -H "Content-Type: application/json" -d "{}"` → 401 (ou 403 se a origem for conferida antes). Registrar os resultados em `docs/seguranca/verificacao-final.md` (sem chaves nem tokens).
- [ ] **Step 9: Commit e push dos documentos** (com OK do Pedro) e atualizar `C:\CLAUDE\curto-prazo\solo-app.md` (seção nova com data e hora: estado, decisões, próximos passos) usando os comandos de envio do núcleo.

---

## Planos seguintes (escrever depois que este terminar)
Dependem do esquema final do banco e do login. Cada um gera software que funciona sozinho:
- **Parte 2 — Produtos, lotes e lista:** tabelas `produto` (apelidos, essencial, prazo, duração estimada), `compra_lote`, `lista_item`; sugestão de nomes; "acabou"; previsão de duração; custo por dia; planejado x esquecido essencial x impulso; peso variável e local. Reorganizar o resto do `index.html` em arquivos por tela.
- **Parte 3 — Aviso e atalho:** PWA instalável, notificações Web Push, tarefa diária às 20:00 UTC (16h do Amazonas) em Python, atalho do iPhone com token longo trocável, microfone no app.

## Self-review
- **Cobertura do spec (segurança):** RLS e login (Tasks 2-3-4-5-6), `/api/claude` fechada (Task 7), contas por convite (Task 2), famílias com dados separados (RLS + Task 8 Step 7), preservar dados (Tasks 1 e 3), ordem de publicação (Task 8). Itens de produto, aviso, atalho e voz ficam nas Partes 2 e 3 (listadas acima), fora desta parte.
- **Consistência de tipos:** `createAuth`, `createDb`, `getAccessToken`, `claudeFetch` e `verificar_usuario` aparecem com a mesma assinatura onde são produzidos e consumidos.
- **Proporção:** plano maior que o spec por causa das etapas manuais do Pedro; o código em si só aparece como assinaturas e nomes de teste.
