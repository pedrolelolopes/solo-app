"""Funcao da Vercel: repassa pedidos ao Claude, mas so para quem esta logado no Supabase."""
import json
import os
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler

MODELOS_PERMITIDOS = frozenset({
    "claude-sonnet-4-6", "claude-haiku-4-5-20251001", "claude-sonnet-5-5", "claude-haiku-5-5",
})
TETO_MAX_TOKENS = 1500
FERRAMENTAS_PERMITIDAS = frozenset({"web_search_20250305"})
LIMITE_CORPO_BYTES = 4_000_000  # Vercel aceita no maximo ~4,5 MB; fotos sao reduzidas no navegador


def validar_corpo(corpo):
    if not isinstance(corpo, dict):
        return "Corpo inválido."
    if corpo.get("model") not in MODELOS_PERMITIDOS:
        return "Modelo não permitido."
    mt = corpo.get("max_tokens")
    if not isinstance(mt, int) or isinstance(mt, bool) or mt < 1 or mt > TETO_MAX_TOKENS:
        return f"max_tokens deve ser inteiro de 1 a {TETO_MAX_TOKENS}."
    msgs = corpo.get("messages")
    if not isinstance(msgs, list) or not msgs:
        return "messages vazio."
    tools = corpo.get("tools")
    if tools is not None:
        if not isinstance(tools, list):
            return "tools inválido."
        for t in tools:
            if not isinstance(t, dict) or t.get("type") not in FERRAMENTAS_PERMITIDAS:
                return "Ferramenta não permitida."
    return None


def extrair_token(cabecalhos):
    valor = None
    for k, v in cabecalhos.items():
        if k.lower() == "authorization":
            valor = v
            break
    if not valor or not valor.startswith("Bearer "):
        return None
    token = valor[7:].strip()
    return token or None


def origem_permitida(origem, permitida):
    return bool(origem) and bool(permitida) and origem == permitida


def verificar_usuario(token, url, anon_key, abrir=urllib.request.urlopen):
    req = urllib.request.Request(
        f"{url}/auth/v1/user",
        headers={"Authorization": f"Bearer {token}", "apikey": anon_key},
    )
    try:
        with abrir(req, timeout=10) as r:
            return json.loads(r.read()).get("id")
    except Exception:
        return None


class handler(BaseHTTPRequestHandler):
    def _enviar(self, status, dados, origem=None):
        corpo = json.dumps(dados).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        if origem:
            self.send_header("Access-Control-Allow-Origin", origem)
            self.send_header("Vary", "Origin")
        self.send_header("Content-Length", str(len(corpo)))
        self.end_headers()
        self.wfile.write(corpo)

    def do_OPTIONS(self):
        permitida = os.environ.get("ALLOWED_ORIGIN", "")
        if not origem_permitida(self.headers.get("Origin"), permitida):
            self._enviar(403, {"error": {"message": "Origem não permitida."}})
            return
        self.send_response(204)
        self.send_header("Access-Control-Allow-Origin", permitida)
        self.send_header("Access-Control-Allow-Methods", "POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type, Authorization")
        self.send_header("Vary", "Origin")
        self.end_headers()

    def do_POST(self):
        chave = os.environ.get("ANTHROPIC_API_KEY")
        sb_url = os.environ.get("SUPABASE_URL")
        sb_anon = os.environ.get("SUPABASE_ANON_KEY")
        permitida = os.environ.get("ALLOWED_ORIGIN")
        if not (chave and sb_url and sb_anon and permitida):
            self._enviar(503, {"error": {"message": "Funções de IA não configuradas no servidor."}})
            return
        if not origem_permitida(self.headers.get("Origin"), permitida):
            self._enviar(403, {"error": {"message": "Origem não permitida."}})
            return
        token = extrair_token(self.headers)
        if not token or not verificar_usuario(token, sb_url, sb_anon):
            self._enviar(401, {"error": {"message": "Faça login para usar a IA."}}, permitida)
            return
        try:
            tam = int(self.headers.get("Content-Length") or 0)
            if tam <= 0 or tam > LIMITE_CORPO_BYTES:
                self._enviar(400, {"error": {"message": "Tamanho do pedido inválido."}}, permitida)
                return
            corpo = json.loads(self.rfile.read(tam))
        except (ValueError, UnicodeDecodeError):
            self._enviar(400, {"error": {"message": "JSON inválido."}}, permitida)
            return
        erro = validar_corpo(corpo)
        if erro:
            self._enviar(400, {"error": {"message": erro}}, permitida)
            return
        req = urllib.request.Request(
            "https://api.anthropic.com/v1/messages",
            data=json.dumps(corpo).encode(),
            headers={"Content-Type": "application/json", "x-api-key": chave, "anthropic-version": "2023-06-01"},
            method="POST",
        )
        try:
            with urllib.request.urlopen(req, timeout=55) as r:
                status, dados = r.status, json.loads(r.read())
        except urllib.error.HTTPError as e:
            try:
                status, dados = e.code, json.loads(e.read())
            except ValueError:
                status, dados = e.code, {"error": {"message": "Erro do serviço de IA."}}
        except Exception:
            status, dados = 502, {"error": {"message": "Não foi possível falar com o serviço de IA."}}
        self._enviar(status, dados, permitida)
