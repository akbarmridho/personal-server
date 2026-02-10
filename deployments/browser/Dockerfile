FROM debian:bookworm-slim

ENV DEBIAN_FRONTEND=noninteractive

RUN apt-get update \
  && apt-get install -y --no-install-recommends \
    bash \
    ca-certificates \
    chromium \
    curl \
    fonts-liberation \
    fonts-noto-color-emoji \
    git \
    jq \
    novnc \
    python3 \
    socat \
    websockify \
    x11vnc \
    xvfb \
  && rm -rf /var/lib/apt/lists/*

COPY entrypoint.sh /usr/local/bin/sandbox-browser
RUN chmod +x /usr/local/bin/sandbox-browser

RUN mkdir -p /tmp/.X11-unix \
  && chmod 1777 /tmp/.X11-unix \
  && chown root:root /tmp/.X11-unix

RUN useradd --create-home --shell /bin/bash sandbox \
  && mkdir -p /home/sandbox/.browser-profile \
  && chown -R sandbox:sandbox /home/sandbox
USER sandbox
WORKDIR /home/sandbox

EXPOSE 9222 5900 6080

CMD ["sandbox-browser"]
