# raw.data Server Status

## 🟢 LIVE & RUNNING

**URL:** `http://178.18.240.104:3000`

**Status:** 24/7 automatic operation

---

## ✅ Configuration

| Feature | Status |
|---------|--------|
| **Server running** | ✅ Online |
| **Auto-start on boot** | ✅ Enabled |
| **Auto-restart on crash** | ✅ Enabled |
| **Firewall configured** | ✅ Port 3000 open |
| **PM2 process manager** | ✅ Active |
| **Systemd service** | ✅ Enabled |

---

## 📡 API Endpoints

### Health Check
```bash
curl http://178.18.240.104:3000/health
```

Response:
```json
{
  "status": "ok",
  "scans_count": 0,
  "uptime": 123.45,
  "memory": {...}
}
```

### Upload Scan
```bash
curl -X POST http://178.18.240.104:3000/scan \
  -H "Content-Type: application/json" \
  -d '{"your":"data"}'
```

Response:
```json
{
  "id": "abc12345",
  "url": "http://178.18.240.104:3000/scan/abc12345",
  "expiresIn": 1800
}
```

### Get Scan
```bash
curl http://178.18.240.104:3000/scan/abc12345
```

---

## 🔄 Automatic Features

### Auto-Start on Reboot
Server will automatically start when the VPS reboots:
- PM2 systemd service: **enabled**
- Process list saved: **yes**
- No manual intervention needed: **ever**

### Auto-Restart on Crash
If the server crashes or fails:
- PM2 will automatically restart it
- No downtime
- Logs available via: `ssh root@178.18.240.104` → `pm2 logs`

### Data Cleanup
- Scans expire after 30 minutes (TTL)
- Automatic memory cleanup every 5 minutes
- No manual maintenance needed

---

## 🛠️ Management (if needed)

### SSH Access
```bash
ssh root@178.18.240.104
# Password: UPnBhmJzCg1x
```

### View Logs
```bash
pm2 logs rawdata-server
pm2 logs rawdata-server --lines 100
```

### Check Status
```bash
pm2 status
pm2 describe rawdata-server
```

### Restart (if needed)
```bash
pm2 restart rawdata-server
```

### Update Code
From local machine:
```bash
cd /Users/macbookpro/raw-data/raw-data/server
expect ssh-deploy.exp  # Upload new files
expect ssh-start.exp   # Restart server
```

---

## 📊 Server Info

- **IP:** 178.18.240.104
- **Port:** 3000
- **OS:** Ubuntu 24.04.3 LTS
- **Node.js:** v20.20.0
- **PM2:** Latest
- **Location:** `/root/rawdata-server/`

---

## 🚨 Important Notes

### ✅ You don't need to do ANYTHING
- Server runs 24/7 automatically
- Auto-restarts on crash
- Auto-starts on reboot
- Memory management is automatic

### 🔒 Security
- Firewall enabled (UFW)
- Only ports 22 (SSH) and 3000 (API) are open
- Root access only

### 💾 Data
- Scans stored in memory (RAM)
- 30-minute TTL (auto-cleanup)
- Max JSON size: 5MB per scan

---

## 🎯 Next Steps

1. **Reload your Chrome extension**
2. **Test the "Get Link" button**
3. **Share scan links with AI assistants**

That's it! Server is fully autonomous now. 🚀
