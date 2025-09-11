FROM postgres:17.6-bookworm

RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       ca-certificates \
       wget \
       ostgresql-17-pgvector=0.8.0-* \
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
    # Install vchord 0.5.1
    && wget https://github.com/tensorchord/VectorChord/releases/download/0.5.1/postgresql-17-vchord_0.5.1-1_$(dpkg --print-architecture).deb -P /tmp \
    && apt-get install -y /tmp/postgresql-17-vchord_0.5.1-1_$(dpkg --print-architecture).deb \
    \
    # Cleanup
    && apt-get remove -y wget ca-certificates \
    && apt-get purge -y --auto-remove \
    && rm -rf /tmp/* /var/lib/apt/lists/*

COPY init.sql /docker-entrypoint-initdb.d/
