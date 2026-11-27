# Guia do Pedro — Segurança do Solo

Regra: nunca cole senha nem chave aqui. Se não achar um menu, procure pelo nome entre aspas.

## 1. Backup e inspeção
1. Abra o projeto no Supabase (supabase.com → seu projeto).
2. Menu esquerdo → **SQL Editor** → **New query**.
3. Abra `supabase/00-inspecao.sql`, copie tudo, cole → **Run**.
4. Copie o resultado (tabela inteira) e cole na conversa.
5. Backup: **Database → Backups** (se não achar: "Backups"). Veja o que o plano gratuito oferece.
6. Garantia: **Table Editor** → clique na tabela → **Export → Export table as CSV**. Faça nas 9 tabelas e salve em `G:\Meu Drive\PESSOAL-HUB\` (nunca no repositório).
7. Avise na conversa: "backup no Drive".

## 2. Contas (Supabase Auth)
1. Supabase → **Authentication** → **Users** → **Add user** → **Create new user**.
2. Digite o e-mail e escolha uma senha (nunca escreva a senha na conversa).
3. Marque **Auto Confirm User** → **Create user**.
4. Repita para cada pessoa da família que vai usar.
5. Em cada conta, copie o **User UID** (aparece na lista de Users). Cole na conversa, dizendo de quem é.
6. Desligar cadastro aberto: **Authentication** → **Sign In / Providers** (ou **Providers**) → **Email** → desligue **Allow new users to sign up** → **Save**.
   Sem isso, qualquer pessoa cria conta e gasta a chave da Anthropic.
7. Diga na conversa: para cada nome antigo em `usuarios`, de qual conta ele é.

## 3. Variáveis da Vercel
Faça isto ANTES do merge.
1. vercel.com → projeto **solo-app** → **Settings** → **Environment Variables**.
2. Adicione (marque **Production** e **Preview**):
   - `SUPABASE_URL` = a URL de `js/config.js` (começa com `https://nafgdjbjojdfnejiecgu`)
   - `SUPABASE_ANON_KEY` = a chave pública `sb_publishable_...` de `js/config.js`
   - `ALLOWED_ORIGIN` = `https://solo-app-nu.vercel.app`
3. `ANTHROPIC_API_KEY` já existe: não mexa.
4. Se pedir, **Redeploy** só depois do merge.

## 4. Ordem de publicação (importa)
1. SQL `01-colunas.sql` (feito; o app antigo continua funcionando).
2. Variáveis da Vercel (seção 3).
3. Enviar a branch `seguranca` (não publica) e testar o login.
4. Com OK do Pedro: merge no `main` (publica em produção). Testar login e uma ação de IA.
5. SQL `02-rls.sql` (liga a proteção). Se algo quebrar: `99-rollback.sql`.
6. Verificar: `python scripts/verificar_anonimo.py`, isolamento entre contas e `/api/claude` sem login (401/403).
Motivo: se o RLS ligar antes do app novo estar no ar, o app atual para de funcionar.

## Parte 2a — Folhetos no banco
1. Abra supabase.com → seu projeto.
2. Menu esquerdo → **SQL Editor** → **New query**.
3. Abra `supabase/03-folhetos.sql`, copie tudo, cole.
4. Clique **Run**.
5. Copie só o resultado do último `select` (tabela com `folhetos` e `comparativos`) e cole na conversa.
6. Esperado: as duas com `rls_ligado` = true e `politicas` = 1.
7. Se aparecer "folhetos tem dados": pare e avise na conversa.
8. Se der outro erro: cole a mensagem inteira na conversa.
9. Desfazer: repita os passos 1 a 4 com `supabase/99b-rollback-folhetos.sql`.

## Parte 2b — Produtos e lotes
1. Abra supabase.com → seu projeto.
2. Menu esquerdo → **SQL Editor** → **New query**.
3. Abra `supabase/04-produtos.sql`, copie tudo, cole.
4. Clique **Run**.
5. Copie só o resultado do último `select` (tabela com `produtos` e `lotes`) e cole na conversa.
6. Esperado: as duas com `rls_ligado` = true e `politicas` = 1.
7. Se der erro: cole a mensagem inteira na conversa.
8. Desfazer: repita os passos 1 a 4 com `supabase/99c-rollback-produtos.sql`.

## Ordem de publicação 2b
1. A Parte 2a precisa estar no `main` antes. Se ainda não estiver, pare aqui.
2. Rode `supabase/04-produtos.sql` (passos da seção "Parte 2b — Produtos e lotes"). Esperado: `produtos` e `lotes` com `rls_ligado` true e 1 política.
3. Diga "ok enviar 2b" na conversa: eu envio só a branch `parte2b` (`git push -u origin parte2b`).
4. Vercel → projeto → **Deployments** → linha do branch `parte2b` → **Visit**. Teste: nota rápida (texto e voz no iPhone), uma compra com item fora da lista, um item por peso, aba Produtos, **Acabou**, Cupom (cadastrar e conferir).
5. Só depois do seu "ok, publicar" eu faço o merge no `main` (vai para produção).
6. Depois eu rodo `python scripts/verificar_anonimo.py` e testo com uma segunda conta; resultados em `docs/seguranca/verificacao-2b.md`.

## Limpar os dados de teste (26/11 em diante)
Apaga lista de hoje, compras (e itens), lotes, produtos, folhetos e comparativos criados de 26/11/2026 até agora. **Não** mexe em receitas, cardápio, lista permanente nem em compras anteriores a 26/11.
1. Abra supabase.com → seu projeto → **SQL Editor** → **New query**.
2. Abra `supabase/05a-previa-limpeza-testes.sql`, copie tudo, cole e clique **Run**. Só lê, não apaga.
3. Cole o resultado na conversa e confirme que só aparecem os seus dados (um `owner_id`, ou dois se a Aline também testou).
4. Só depois do meu OK: nova query com `supabase/05b-limpar-testes.sql` → **Run**. Cole o resultado (contagens apagadas, e a conferência final).
5. Esperado: contagens parecidas com as do passo 2; na conferência, produtos 0, lotes 0, sessoes_de_teste_restantes 0.
