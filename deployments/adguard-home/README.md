# AdGuard Home

## Resolved Daemon

Check for `resolved` daemon existence:

```bash
systemctl list-unit-files | grep resolved

systemctl status systemd-resolved
```

If exist, disable `resolved` daemon: <https://github.com/AdguardTeam/AdGuardHome/wiki/Docker#resolved-daemon>.
