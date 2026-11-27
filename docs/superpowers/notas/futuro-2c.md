# Fica para depois (pedidos do Pedro após a 2b)

Prioridade sugerida, de cima para baixo. Tudo sem IA, por regras e tabelas locais.

1. **Aprendizado da fala (tabela de rejeitados):** guardar frases apagadas/corrigidas e seus pedaços (1, 2 e 3 palavras); pedaço que só aparece em rejeitados vira "palavra extra" e é removido sozinho; seção "Aprendido" para ver e apagar. Precisa de tabela nova no Supabase (RLS por dono) e SQL que o Pedro roda.
2. **Local novo na compra:** no seletor de local, trocar "Outro" por "Adicionar", que vira um campo de texto ali mesmo (ex.: lanchonete, quitanda, feira) e fica salvo para as próximas vezes.
3. **Aba Produtos mais compacta:** nome com Essencial/Supérfluo e urgência em etiquetas na mesma linha, estimativa de dias menor, "Ver compras" com explicação ou removido.
4. **Prazo falado:** "preciso comprar manteiga amanhã" definir a urgência do produto.
5. **Pergunta "Mesmo que X?"** ainda existe no modal de Confirmar compra e no Cupom; trocar pelo mesmo comportamento da nota rápida (sugestão de um toque).
6. **Duração automática (já funciona):** a compra abre o lote e "Acabou" fecha; a duração e o custo por dia saem sozinhos, mesmo sem marcar essencial/urgência.
