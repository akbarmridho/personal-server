# RClone

## Install

```bash
wget https://downloads.rclone.org/v1.71.0/rclone-v1.71.0-linux-arm64.deb
sudo apt install ./rclone-v1.71.0-linux-arm64.deb
```

## Configure

```bash
rclone config

mkdir -p /mnt/filen
```

### **Test your mount manually**

Make sure you already did `rclone config` and created a `filen` remote.

```bash
rclone mount filen: /mnt/filen --vfs-cache-mode writes --no-check-certificate
```

If it works, stop it with `Ctrl+C`.

### **Create a systemd service**

```bash
nano /etc/systemd/system/rclone-webdav.service
```

Paste this:

```ini
[Unit]
Description=Mount Filen WebDAV via rclone (as root)
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/bin/rclone mount filen: /mnt/filen \
  --vfs-cache-mode writes \
  --dir-cache-time 12h \
  --poll-interval 30s \
  --allow-other \
  --no-check-certificate
ExecStop=/bin/fusermount -u /mnt/filen
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

⚠️ Notes:

* `--allow-other` lets other processes (running as non-root) see the files. If *everything runs as root*, you can remove that flag.
* `ExecStop` uses `fusermount` to unmount cleanly.

### **Enable service at boot**

```bash
systemctl daemon-reload
systemctl enable --now rclone-webdav
```

### **Check status**

```bash
systemctl status rclone-webdav
```
