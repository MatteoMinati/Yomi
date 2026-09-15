FROM python:3.13-slim

COPY --from=ghcr.io/astral-sh/uv:0.11.28 /uv /uvx /bin/

ENV PYTHONUNBUFFERED=1 \
    UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    UV_PYTHON_DOWNLOADS=0 \
    PATH="/app/.venv/bin:$PATH" \
    HOST=0.0.0.0 \
    YOMI_DATA=/data

WORKDIR /app

# Dipendenze prima del codice: il layer resta in cache finché uv.lock non cambia.
COPY pyproject.toml uv.lock .python-version ./
RUN uv sync --locked --no-dev --no-install-project

COPY . .

# Utente non-root; /data gli appartiene così il volume nominato eredita i permessi.
RUN useradd --system --uid 10001 yomi \
    && mkdir -p /data \
    && chown yomi:yomi /data
USER yomi

EXPOSE 80

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:80/api/ping', timeout=4)"

CMD ["python", "server.py", "80"]
