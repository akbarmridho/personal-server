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

### Enable and Start the Service

Reload the `systemd` daemon, then enable the service to start on boot and start it right away.

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now rclone-webdav.service
```

### Check the Service Status

You can check if the service is running correctly at any time.

```bash
systemctl status rclone-webdav.service
```

## Automatic Mount Health Check

Sometimes, a mount can become "stale" or unresponsive even if the `rclone` process is still running. This script periodically checks if the mount is working correctly. If it fails the check, it tells `systemd` to restart the service.

### Create the Check Script

```bash
sudo nano /usr/local/bin/rclone-mount-check.sh
```

Paste the following script into the editor.

```bash
#!/bin/bash
# This script checks if the rclone mount is active by looking for a specific file.
# If the file is not found, it assumes the mount is stale or broken
# and tells systemd to restart the rclone service.

# --- CONFIGURATION ---
# Log file for this script's actions
LOGFILE="/var/log/rclone-mount-check.log"

# The full path to your rclone mount point
MPOINT="/mnt/filen"

# The name of the file to check for. MUST exist on your Filen remote.
# Using a hidden file is a good practice.
CHECKFILE=".mountcheck"

# The name of your systemd service
SERVICENAME="rclone-webdav.service"
# --- END CONFIGURATION ---

# Ensure the script isn't already running
if pidof -o %PPID -x "$(basename "$0")"; then
    echo "$(date "+%d.%m.%Y %T") - EXIT: Already running." >> "$LOGFILE"
    exit 1
fi

# Check if the mount check file is accessible
if [ -f "$MPOINT/$CHECKFILE" ]; then
    # If you want to log successful checks, uncomment the next line
    # echo "$(date "+%d.%m.%Y %T") - INFO: Mount is healthy." >> "$LOGFILE"
    exit 0
else
    echo "$(date "+%d.%m.%Y %T") - ERROR: Mount check failed for $MPOINT. Restarting service." | tee -a "$LOGFILE"
    
    # Restart the systemd service
    /bin/systemctl restart "$SERVICENAME"
    
    # Optional: Wait a few seconds for the service to restart and then re-check
    sleep 15
    
    if [ -f "$MPOINT/$CHECKFILE" ]; then
        echo "$(date "+%d.%m.%Y %T") - INFO: Service successfully restarted and mount is back online." | tee -a "$LOGFILE"
    else
        echo "$(date "+%d.%m.%Y %T") - CRITICAL: Mount is STILL DOWN after service restart." | tee -a "$LOGFILE"
    fi
fi

exit 0
```

Save and exit (`Ctrl+X`, `Y`, `Enter`).

### 2\. Set Up Script Dependencies

The script needs a file to check for on the remote and a log file to write to.

```bash
# 1. Create the check file ON THE REMOTE (ensure the mount is active first!)
sudo touch /mnt/filen/.mountcheck

# 2. Create the log file
sudo touch /var/log/rclone-mount-check.log

# 3. Make the script executable
sudo chmod +x /usr/local/bin/rclone-mount-check.sh
```

### 3\. Schedule the Script with Cron

We'll use a cron job to run this script automatically as the root user.

```bash
# This opens the cron job editor for the root user
sudo crontab -e
```

Add the following line to the bottom of the file to run the script every 5 minutes.

```crontab
*/5 * * * * /usr/local/bin/rclone-mount-check.sh >/dev/null 2>&1
```

Save and exit. Your system will now automatically check the mount's health and restart the service if needed.
