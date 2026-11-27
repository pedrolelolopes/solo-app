"""Valida e limpa o CSV de folhetos (mercado;produto;preco;unidade). So biblioteca padrao, sem rede.
Mesmas regras de Folhetos.lerCsv (js/folhetos.js)."""
import csv, math, shutil, sys, unicodedata
from pathlib import Path

CABECALHO = ["mercado", "produto", "preco", "unidade"]


def _norm(s):
    s = unicodedata.normalize("NFD", s or "")
    s = "".join(c for c in s if not unicodedata.combining(c))
    return " ".join(s.lower().split())


def _preco(txt):
    t = txt.strip().lower().replace("r$", "").replace(" ", "").replace(",", ".")
    try:
        v = float(t)
    except ValueError:
        return None
    return v if math.isfinite(v) and v > 0 else None


def ler_csv(texto):
    texto = texto.lstrip("\ufeff")
    linhas = texto.splitlines()
    i0 = next((i for i, l in enumerate(linhas) if l.strip()), None)
    if i0 is None:
        return [], []
    cab = linhas[i0].strip().lower()
    sep = next((s for s in (";", ",") if cab.split(s) == CABECALHO), None)
    itens, erros = [], []
    for i in range(i0 + 1, len(linhas)):
        if not linhas[i].strip():
            continue
        n = i + 1
        if sep is None:
            erros.append(f"linha {n}: cabeçalho inválido")
            continue
        cols = next(csv.reader([linhas[i]], delimiter=sep))
        if len(cols) != 4:
            erros.append(f"linha {n}: colunas inválidas")
            continue
        mercado, produto, preco, unidade = (c.strip() for c in cols)
        if not mercado:
            erros.append(f"linha {n}: mercado vazio")
        elif not produto:
            erros.append(f"linha {n}: produto vazio")
        elif (p := _preco(preco)) is None:
            erros.append(f"linha {n}: preço inválido")
        else:
            itens.append({"mercado": mercado, "produto": produto, "preco": p, "unidade": unidade or None})
    return itens, erros


def limpar(itens):
    vistos, out = set(), []
    for it in itens:
        it = dict(it, mercado=it["mercado"].strip(), produto=" ".join(it["produto"].split()))
        chave = (_norm(it["mercado"]), _norm(it["produto"]), it["preco"], it["unidade"])
        if chave not in vistos:
            vistos.add(chave)
            out.append(it)
    return out


def escrever_csv(itens, saida):
    with open(saida, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.writer(f, delimiter=";", lineterminator="\n")
        w.writerow(CABECALHO)
        for it in itens:
            w.writerow([it["mercado"], it["produto"], f"{it['preco']:.2f}".replace(".", ","), it["unidade"] or ""])
    return len(itens)


def main(argv):
    if len(argv) != 1:
        print("uso: python scripts/folhetos_csv.py <arquivo.csv>")
        return 2
    arq = Path(argv[0])
    itens, erros = ler_csv(arq.read_text(encoding="utf-8"))
    if not itens:
        print(f"0 itens em 0 mercados; {len(erros)} linhas com erro")
        print("\n".join(erros))
        return 1
    itens = limpar(itens)
    bak = arq.with_name(arq.name + ".bak")
    if not bak.exists():
        shutil.copyfile(arq, bak)
    escrever_csv(itens, arq)
    print(f"{len(itens)} itens em {len({i['mercado'] for i in itens})} mercados; {len(erros)} linhas com erro")
    print("\n".join(erros))
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
