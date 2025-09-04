FROM postgres:17.6-bookworm

# Install dependencies, PGroonga, and MeCab tokenizer
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
       build-essential \
       postgresql-server-dev-17 \
       git curl wget ca-certificates lsb-release \
       postgresql-17-pgvector \
       postgresql-17-cron \
    \
    # Add Groonga APT source
    && wget -q https://packages.groonga.org/debian/groonga-apt-source-latest-$(lsb_release --codename --short).deb -O /tmp/groonga.deb \
    && apt-get install -y --no-install-recommends /tmp/groonga.deb \
    && rm -f /tmp/groonga.deb \
    && apt-get update \
    \
    # Install PGroonga with MeCab tokenizer
    && apt-get install -y --no-install-recommends \
       postgresql-17-pgdg-pgroonga \
       groonga-tokenizer-mecab \
    \
    # Cleanup to keep image small
    && apt-get purge -y --auto-remove build-essential git curl wget lsb-release \
    && apt-get clean \
    && rm -rf /var/lib/apt/lists/*

# Copy init script to enable extensions automatically
COPY init.sql /docker-entrypoint-initdb.d/
