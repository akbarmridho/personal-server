FROM postgres:17.6-bookworm

# Install PGroonga + MeCab tokenizer + other extensions
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       ca-certificates \
       postgresql-17-pgvector \
       postgresql-17-cron \
    \
    # Add Groonga APT source
    && wget -q https://packages.groonga.org/debian/groonga-apt-source-latest-$(. /etc/os-release && echo $VERSION_CODENAME).deb -O /tmp/groonga.deb \
    && apt-get install -y --no-install-recommends /tmp/groonga.deb \
    && rm -f /tmp/groonga.deb \
    && apt-get update \
    \
    # Install PGroonga with MeCab tokenizer
    && apt-get install -y --no-install-recommends \
       postgresql-17-pgdg-pgroonga \
       groonga-tokenizer-mecab \
    \
    # Cleanup
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

COPY init.sql /docker-entrypoint-initdb.d/
