FROM influxdb:1.11.8

USER root

RUN apt-get update && apt-get install -y --no-install-recommends cron && \
    rm -rf /var/lib/apt/lists/*

COPY backup.sh /usr/local/bin/backup.sh
COPY entrypoint.sh /usr/local/bin/entrypoint.sh
COPY crontab.txt /etc/cron.d/influxdb-backup

RUN chmod +x /usr/local/bin/backup.sh /usr/local/bin/entrypoint.sh && \
    chmod 0644 /etc/cron.d/influxdb-backup

VOLUME /backups

ENTRYPOINT ["entrypoint.sh"]
