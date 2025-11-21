FROM postgres:17.6-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       ca-certificates \
       wget \
       postgresql-17-pgvector=0.8.1-* \
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
    # Install vchord 0.4.3
    && wget https://github.com/tensorchord/VectorChord/releases/download/0.4.3/postgresql-17-vchord_0.4.3-1_$(dpkg --print-architecture).deb -P /tmp \
    && apt-get install -y /tmp/postgresql-17-vchord_0.4.3-1_$(dpkg --print-architecture).deb \
    \
    # Install ParadeDB pg_search 0.19.8
    && wget "https://github.com/paradedb/paradedb/releases/download/v0.19.8/postgresql-17-pg-search_0.19.8-1PARADEDB-bookworm_$(dpkg --print-architecture).deb" -O /tmp/pg_search.deb \
    && apt-get install -y /tmp/pg_search.deb \
    \
    # Cleanup
    && apt-get remove -y wget ca-certificates \
    && apt-get purge -y --auto-remove \
    && rm -rf /tmp/* /var/lib/apt/lists/*

COPY init.sql /docker-entrypoint-initdb.d/
