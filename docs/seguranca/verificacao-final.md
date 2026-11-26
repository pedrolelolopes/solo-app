# Verificação final — Fase 1, Parte 1 (Segurança)

Data: 2026-11-25. Sem chaves, tokens nem dados reais neste arquivo.

| Item | Resultado |
|---|---|
| Acesso anônimo (chave pública sem login) às 9 tabelas | `python scripts/verificar_anonimo.py` → `True` nas 9, saída 0 |
| RLS ligado, política `acesso_total` removida, política por dono (`owner_id = auth.uid()`) nas 8 tabelas de dados; `folhetos` fechada (sem política) | SQL `02-rls.sql`: `sem_dono` = 0 em todas |
| Dados antigos preservados | contagens iguais antes e depois (ex.: lista_hoje 79, itens_compra 179, frequencia 241) |
| `/api/claude` sem login/origem | 403 |
| `/api/claude` origem certa, token inválido | 401 |
| CORS de origem diferente (preflight) | 403, sem `Access-Control-Allow-Origin` |
| IA com login em produção | funcionou (Comparar, dica 💡), após trocar a chave da Anthropic (a antiga estava inválida) |
| Login: senha errada | mensagem em português na tela |
| Isolamento Pedro x Aline | cada conta vê só os próprios dados; achado e corrigido: a tela da conta anterior ficava na memória/DOM do navegador (não vinha do banco) |
| Testes | `node --test tests/` 19 passam; `python -m pytest tests/` 22 passam |
| Cadastro aberto desligado no Supabase | confirmação do Pedro pendente |

## Fora do escopo / pendências
- `comparar()` não converte g x kg (erro antigo).
- Dica de IA mostra marcação markdown (`##`, `**`).
- Botão "Buscar opiniões" nunca existiu na tela (função sem botão).
- Preview da Vercel não tem `ANTHROPIC_API_KEY` (só Production): IA só testável em produção.
