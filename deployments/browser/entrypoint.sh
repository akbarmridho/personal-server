#!/usr/bin/env bash
set -euo pipefail

export DISPLAY="${BROWSER_DISPLAY:-:1}"
export HOME=/home/sandbox

CDP_PORT="${BROWSER_CDP_PORT:-9222}"
VNC_PORT="${BROWSER_VNC_PORT:-5900}"
NOVNC_PORT="${BROWSER_NOVNC_PORT:-6080}"
ENABLE_NOVNC="${BROWSER_ENABLE_NOVNC:-1}"
HEADLESS="${BROWSER_HEADLESS:-0}"
PROFILE_DIR="${BROWSER_PROFILE_DIR:-/home/sandbox/.browser-profile}"
PROFILE_NAME="${BROWSER_PROFILE_NAME:-default}"
export XDG_CONFIG_HOME="${PROFILE_DIR}/.config"
export XDG_CACHE_HOME="${PROFILE_DIR}/.cache"
CHROME_USER_DATA_DIR="${PROFILE_DIR}/profiles/${PROFILE_NAME}"
DISPLAY_NUM="${DISPLAY#:}"
XVFB_LOCK_FILE="/tmp/.X${DISPLAY_NUM}-lock"
XVFB_SOCKET_FILE="/tmp/.X11-unix/X${DISPLAY_NUM}"
CDP_STARTUP_ATTEMPTS="${BROWSER_CDP_STARTUP_ATTEMPTS:-150}"

mkdir -p "${PROFILE_DIR}" "${XDG_CONFIG_HOME}" "${XDG_CACHE_HOME}" "${CHROME_USER_DATA_DIR}"

cleanup() {
  kill "${SOCAT_PID:-}" "${VNC_PID:-}" "${NOVNC_PID:-}" "${XVFB_PID:-}" >/dev/null 2>&1 || true
}
trap cleanup EXIT INT TERM

# Recover from stale lock files after unclean shutdown.
if [[ -f "${XVFB_LOCK_FILE}" ]]; then
  LOCK_PID="$(tr -cd '0-9' < "${XVFB_LOCK_FILE}" || true)"
  if [[ -n "${LOCK_PID}" ]] && kill -0 "${LOCK_PID}" >/dev/null 2>&1; then
    echo "Display ${DISPLAY} already used by pid ${LOCK_PID}" >&2
    exit 1
  fi
  rm -f "${XVFB_LOCK_FILE}"
fi
rm -f "${XVFB_SOCKET_FILE}"

rm -f \
  "${CHROME_USER_DATA_DIR}/SingletonLock" \
  "${CHROME_USER_DATA_DIR}/SingletonSocket" \
  "${CHROME_USER_DATA_DIR}/SingletonCookie"

Xvfb "${DISPLAY}" -screen 0 1280x800x24 -ac -nolisten tcp &
XVFB_PID=$!

if [[ "${HEADLESS}" == "1" ]]; then
  CHROME_ARGS=(
    "--headless=new"
    "--disable-gpu"
  )
else
  CHROME_ARGS=()
fi

if [[ "${CDP_PORT}" -ge 65535 ]]; then
  CHROME_CDP_PORT="$((CDP_PORT - 1))"
else
  CHROME_CDP_PORT="$((CDP_PORT + 1))"
fi

CHROME_ARGS+=(
  "--remote-debugging-address=127.0.0.1"
  "--remote-debugging-port=${CHROME_CDP_PORT}"
  "--user-data-dir=${CHROME_USER_DATA_DIR}"
  "--no-first-run"
  "--no-default-browser-check"
  "--disable-dev-shm-usage"
  "--disable-background-networking"
  "--disable-features=TranslateUI"
  "--disable-breakpad"
  "--disable-crash-reporter"
  "--metrics-recording-only"
  "--no-sandbox"
)

chromium "${CHROME_ARGS[@]}" about:blank &
CHROMIUM_PID=$!

READY=0
for _ in $(seq 1 "${CDP_STARTUP_ATTEMPTS}"); do
  if curl -sS --max-time 1 "http://127.0.0.1:${CHROME_CDP_PORT}/json/version" >/dev/null; then
    READY=1
    break
  fi
  sleep 0.1
done
if [[ "${READY}" != "1" ]]; then
  echo "Chromium CDP endpoint failed to start on port ${CHROME_CDP_PORT}" >&2
  exit 1
fi

socat \
  TCP-LISTEN:"${CDP_PORT}",fork,reuseaddr,bind=0.0.0.0 \
  TCP:127.0.0.1:"${CHROME_CDP_PORT}" &
SOCAT_PID=$!

if [[ "${ENABLE_NOVNC}" == "1" && "${HEADLESS}" != "1" ]]; then
  x11vnc -display "${DISPLAY}" -rfbport "${VNC_PORT}" -shared -forever -nopw -localhost &
  VNC_PID=$!
  sleep 0.3
  if ! kill -0 "${VNC_PID}" >/dev/null 2>&1; then
    echo "x11vnc failed to start on display ${DISPLAY} port ${VNC_PORT}" >&2
    exit 1
  fi

  websockify --web /usr/share/novnc/ "${NOVNC_PORT}" "localhost:${VNC_PORT}" &
  NOVNC_PID=$!
  sleep 0.3
  if ! kill -0 "${NOVNC_PID}" >/dev/null 2>&1; then
    echo "websockify failed to start on port ${NOVNC_PORT}" >&2
    exit 1
  fi
fi

wait "${CHROMIUM_PID}"
