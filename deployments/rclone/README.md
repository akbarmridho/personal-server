# RClone

## Install

First, download and install the appropriate RClone package for your system.

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

### **Docker Plugin**

```bash
sudo mkdir -p /var/lib/docker-plugins/rclone/config
sudo mkdir -p /var/lib/docker-plugins/rclone/cache

docker plugin install rclone/docker-volume-rclone:arm64 args="-v" --alias rclone --grant-all-permissions
docker plugin enable rclone
docker plugin list
```
