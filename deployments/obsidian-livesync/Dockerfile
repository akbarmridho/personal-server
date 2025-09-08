FROM node:22-alpine

# Install dependencies: couchbackup, cron, timezone data, and gzip
RUN apk add --no-cache busybox-suid tzdata gzip && \
    npm install -g @cloudant/couchbackup

WORKDIR /app

COPY backup.sh entrypoint.sh /usr/local/bin/
COPY crontab.txt /etc/cron/crontab.txt

RUN chmod +x /usr/local/bin/backup.sh /usr/local/bin/entrypoint.sh && \
    crontab /etc/cron/crontab.txt

VOLUME /backup

ENTRYPOINT ["entrypoint.sh"]