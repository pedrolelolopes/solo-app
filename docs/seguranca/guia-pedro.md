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
