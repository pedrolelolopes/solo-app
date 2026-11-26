"""Confere que a chave publica SEM login nao le nenhuma tabela.

Uso: defina SUPABASE_URL e SUPABASE_ANON_KEY no ambiente e rode
    python scripts/verificar_anonimo.py
Sai com codigo 1 se alguma tabela vazar dados.
"""
import json
import os
import sys
import urllib.error
import urllib.request

TABELAS = [
    "folhetos", "lista_permanente", "lista_hoje", "frequencia", "sessoes_compra",
    "itens_compra", "cardapio", "receitas", "ingredientes_receita",
]


def avaliar_resposta(status, corpo):
    """True quando o anonimo NAO enxerga dados."""
    if status in (401, 403):
        return True
    if status == 200:
        try:
            return json.loads(corpo) == []
        except ValueError:
            return False
    # 404/400 etc.: nao deu para ler dados; so conta como seguro se nao for 2xx
    return not (200 <= status < 300)


def verificar(url, anon_key, tabelas, abrir=urllib.request.urlopen):
    resultado = {}
    for t in tabelas:
        req = urllib.request.Request(
            f"{url}/rest/v1/{t}?select=*&limit=1",
            headers={"apikey": anon_key, "Authorization": f"Bearer {anon_key}"},
        )
        try:
            with abrir(req, timeout=15) as r:
                status, corpo = r.status, r.read().decode()
        except urllib.error.HTTPError as e:
            status, corpo = e.code, e.read().decode(errors="replace")
        resultado[t] = avaliar_resposta(status, corpo)
    return resultado


def main():
    url, chave = os.environ.get("SUPABASE_URL"), os.environ.get("SUPABASE_ANON_KEY")
    if not url or not chave:
        print("Defina SUPABASE_URL e SUPABASE_ANON_KEY.")
        return 2
    res = verificar(url, chave, TABELAS)
    for t, ok in res.items():
        print(f"{t}: {ok}")
    return 0 if all(res.values()) else 1


if __name__ == "__main__":
    sys.exit(main())
