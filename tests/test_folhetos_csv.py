import importlib.util, pathlib

_raiz = pathlib.Path(__file__).resolve().parents[1]
_s = importlib.util.spec_from_file_location("folhetos_csv", _raiz / "scripts" / "folhetos_csv.py")
m = importlib.util.module_from_spec(_s)
_s.loader.exec_module(m)

EXEMPLO = """mercado;produto;preco;unidade
Mercado Exemplo;Arroz Tipo 1 5kg;22,90;un
Mercado Exemplo;Tomate;7,99;kg
Outro Mercado;Leite Integral 1L;4,49;un"""


def test_ler_csv_bom_e_virgula_decimal():
    itens, erros = m.ler_csv("\ufeff" + EXEMPLO)
    assert erros == [] and len(itens) == 3
    assert itens[0] == {"mercado": "Mercado Exemplo", "produto": "Arroz Tipo 1 5kg", "preco": 22.9, "unidade": "un"}


def test_ler_csv_aceita_virgula_como_separador_se_cabecalho_usar():
    itens, erros = m.ler_csv("mercado,produto,preco,unidade\nA,Leite,4.49,\n")
    assert erros == [] and itens == [{"mercado": "A", "produto": "Leite", "preco": 4.49, "unidade": None}]


def test_ler_csv_aponta_linha_ruim():
    itens, erros = m.ler_csv("mercado;produto;preco;unidade\nA;Leite;4,49;un\nA;Pao;abc;un\n")
    assert len(itens) == 1 and erros == ["linha 3: preço inválido"]


def test_ler_csv_cabecalho_errado_nao_aceita_linhas():
    itens, erros = m.ler_csv("loja;item;valor\nA;Leite;4,49\nA;Pao;2\n")
    assert itens == [] and len(erros) == 2


def test_limpar_remove_repetido_com_acento():
    base = {"mercado": "A", "preco": 5.0, "unidade": "un"}
    out = m.limpar([dict(base, produto="Pão "), dict(base, produto="pao"), dict(base, produto="Pao", preco=6.0)])
    assert len(out) == 2 and out[0]["produto"] == "Pão"


def test_escrever_csv_bom_e_virgula(tmp_path):
    f = tmp_path / "x.csv"
    n = m.escrever_csv([{"mercado": "A", "produto": "Arroz", "preco": 22.9, "unidade": "un"}], f)
    b = f.read_bytes()
    assert n == 1 and b.startswith(b"\xef\xbb\xbf") and "A;Arroz;22,90;un".encode() in b


def test_cli_sem_linhas_validas_sai_com_1(tmp_path):
    f = tmp_path / "x.csv"
    f.write_text("errado\nlixo\n", encoding="utf-8")
    assert m.main([str(f)]) == 1


def test_cli_regrava_e_cria_bak(tmp_path, capsys):
    f = tmp_path / "x.csv"
    f.write_text(EXEMPLO, encoding="utf-8")
    assert m.main([str(f)]) == 0
    assert (tmp_path / "x.csv.bak").exists()
    assert "3 itens em 2 mercados; 0 linhas com erro" in capsys.readouterr().out


def test_mesmo_resultado_que_js():
    # mesmo texto do teste JS de lerCsv (Task 5): 3 itens em 2 mercados, 0 erros
    itens, erros = m.ler_csv(EXEMPLO)
    assert len(itens) == 3 and len({i["mercado"] for i in itens}) == 2 and erros == []
    doc = (_raiz / "docs" / "folhetos" / "ler-pasta-com-claude-code.md").read_text(encoding="utf-8")
    assert EXEMPLO in doc
