import importlib.util, io, json, pathlib, urllib.error

_p = pathlib.Path(__file__).resolve().parents[1] / "api" / "claude.py"
_s = importlib.util.spec_from_file_location("claude_api", _p)
m = importlib.util.module_from_spec(_s)
_s.loader.exec_module(m)


def corpo(**kw):
    b = {"model": "claude-sonnet-4-6", "max_tokens": 600, "messages": [{"role": "user", "content": "oi"}]}
    b.update(kw)
    return b


def test_corpo_valido_passa(): assert m.validar_corpo(corpo()) is None
def test_modelo_fora_da_lista_erra(): assert m.validar_corpo(corpo(model="claude-opus-9")) is not None
def test_max_tokens_acima_do_teto_erra(): assert m.validar_corpo(corpo(max_tokens=1501)) is not None
def test_max_tokens_no_teto_passa(): assert m.validar_corpo(corpo(max_tokens=1500)) is None


def test_max_tokens_nao_inteiro_erra():
    assert m.validar_corpo(corpo(max_tokens="600")) is not None
    assert m.validar_corpo(corpo(max_tokens=True)) is not None


def test_messages_vazio_erra(): assert m.validar_corpo(corpo(messages=[])) is not None
def test_corpo_nao_dict_erra(): assert m.validar_corpo([1]) is not None
def test_ferramenta_nao_permitida_erra(): assert m.validar_corpo(corpo(tools=[{"type": "bash_20250124"}])) is not None


def test_ferramenta_web_search_passa():
    assert m.validar_corpo(corpo(tools=[{"type": "web_search_20250305", "name": "web_search"}])) is None


def test_extrair_token_bearer(): assert m.extrair_token({"Authorization": "Bearer abc"}) == "abc"
def test_extrair_token_minusculo(): assert m.extrair_token({"authorization": "Bearer abc"}) == "abc"


def test_extrair_token_ausente():
    assert m.extrair_token({}) is None
    assert m.extrair_token({"Authorization": "Basic x"}) is None


def test_origem_igual_passa(): assert m.origem_permitida("https://a.com", "https://a.com") is True
def test_origem_diferente_falha(): assert m.origem_permitida("https://b.com", "https://a.com") is False
def test_origem_ausente_falha(): assert m.origem_permitida(None, "https://a.com") is False


class Falso:
    def __init__(self, d): self.d = d
    def read(self): return json.dumps(self.d).encode()
    def __enter__(self): return self
    def __exit__(self, *a): pass


def test_verificar_usuario_devolve_id():
    visto = {}

    def abrir(req, timeout=None):
        visto["h"] = dict(req.header_items())
        visto["u"] = req.full_url
        return Falso({"id": "u1"})

    assert m.verificar_usuario("tok", "https://x.supabase.co", "anon", abrir) == "u1"
    assert visto["u"] == "https://x.supabase.co/auth/v1/user"
    assert visto["h"]["Authorization"] == "Bearer tok"


def test_verificar_usuario_token_invalido_devolve_none():
    def abrir(req, timeout=None):
        raise urllib.error.HTTPError("u", 401, "no", {}, io.BytesIO(b""))

    assert m.verificar_usuario("tok", "https://x", "anon", abrir) is None


def test_limite_do_corpo_aceita_foto_reduzida():
    assert 1_000_000 <= m.LIMITE_CORPO_BYTES <= 4_500_000


def test_campo_extra_erra(): assert m.validar_corpo(corpo(stream=True)) is not None


def test_documento_pdf_passa():
    msg = [{"role": "user", "content": [
        {"type": "document", "source": {"type": "base64", "media_type": "application/pdf", "data": "QUJD"}},
        {"type": "text", "text": "oi"}]}]
    assert m.validar_corpo(corpo(messages=msg)) is None


def test_bloco_desconhecido_erra():
    msg = [{"role": "user", "content": [{"type": "tool_result", "content": "x"}]}]
    assert m.validar_corpo(corpo(messages=msg)) is not None


def test_mapear_status_anthropic():
    assert m.mapear_status(401) == 502
    assert m.mapear_status(403) == 502
    assert m.mapear_status(429) == 429
    assert m.mapear_status(200) == 200
