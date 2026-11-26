import importlib.util, io, json, pathlib, urllib.error

_p = pathlib.Path(__file__).resolve().parents[1] / "scripts" / "verificar_anonimo.py"
_s = importlib.util.spec_from_file_location("verificar_anonimo", _p)
v = importlib.util.module_from_spec(_s)
_s.loader.exec_module(v)


def test_vazio_200_e_seguro(): assert v.avaliar_resposta(200, "[]") is True
def test_401_e_403_sao_seguros():
    assert v.avaliar_resposta(401, "{}") is True
    assert v.avaliar_resposta(403, "{}") is True
def test_200_com_linhas_vaza(): assert v.avaliar_resposta(200, '[{"id":1}]') is False


class Resp:
    def __init__(self, corpo): self.corpo = corpo; self.status = 200
    def read(self): return self.corpo.encode()
    def __enter__(self): return self
    def __exit__(self, *a): pass


def test_verificar_marca_tabela_que_vaza():
    def abrir(req, timeout=None):
        return Resp("[]" if "lista_hoje" in req.full_url else '[{"id":1}]')

    assert v.verificar("https://x", "anon", ["lista_hoje", "receitas"], abrir) == {"lista_hoje": True, "receitas": False}


def test_verificar_http_error_conta_como_resposta():
    def abrir(req, timeout=None):
        raise urllib.error.HTTPError(req.full_url, 401, "no", {}, io.BytesIO(b"{}"))

    assert v.verificar("https://x", "anon", ["a"], abrir) == {"a": True}
