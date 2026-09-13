FROM python:3.13-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    HOST=0.0.0.0 \
    YOMI_DATA=/data

WORKDIR /app

COPY requirements.txt .
RUN pip install -r requirements.txt

COPY . .

# Utente non-root; /data gli appartiene così il volume nominato eredita i permessi.
RUN useradd --system --uid 10001 yomi \
    && mkdir -p /data \
    && chown yomi:yomi /data
USER yomi

EXPOSE 8080

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://127.0.0.1:8080/api/ping', timeout=4)"

CMD ["python", "server.py", "8080"]
