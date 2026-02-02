# Деплой на VPS сервер

IP: **178.18.240.104**  
Порт: **3000**

## Первоначальная настройка (один раз)

### 1. Подключись к серверу

```bash
ssh root@178.18.240.104
# Пароль: UPnBhmJzCg1x
```

### 2. Запусти setup скрипт

```bash
# Скопируй содержимое setup-server.sh и запусти:
bash setup-server.sh
```

Это установит:
- Node.js 20.x
- PM2 (процесс менеджер)
- Настроит firewall
- Создаст директорию `/root/rawdata-server`

### 3. Выйди с сервера

```bash
exit
```

## Деплой кода (каждый раз при обновлении)

### Вариант 1: Автоматический деплой

```bash
cd server
chmod +x deploy.sh
./deploy.sh
```

Скрипт автоматически:
- Создаст архив
- Загрузит на сервер
- Установит зависимости
- Перезапустит PM2

### Вариант 2: Ручной деплой

```bash
# 1. Создай архив
tar -czf server.tar.gz package.json index.js README.md

# 2. Загрузи на сервер
scp server.tar.gz root@178.18.240.104:/tmp/

# 3. Подключись к серверу
ssh root@178.18.240.104

# 4. На сервере:
cd /root/rawdata-server
tar -xzf /tmp/server.tar.gz
npm install
pm2 restart rawdata-server

# 5. Выйди
exit
```

## Управление сервером

### Подключиться к серверу

```bash
ssh root@178.18.240.104
```

### Посмотреть логи

```bash
pm2 logs rawdata-server
pm2 logs rawdata-server --lines 100
```

### Проверить статус

```bash
pm2 status
```

### Перезапустить

```bash
pm2 restart rawdata-server
```

### Остановить

```bash
pm2 stop rawdata-server
```

### Запустить заново

```bash
pm2 start rawdata-server
```

### Удалить процесс

```bash
pm2 delete rawdata-server
```

## Проверка работы

### Health check

```bash
curl http://178.18.240.104:3000/health
```

Должно вернуть:
```json
{
  "status": "ok",
  "scans_count": 0,
  "uptime": 123.45,
  "memory": {...}
}
```

### Тестовый скан

```bash
# Загрузить тестовый скан
curl -X POST http://178.18.240.104:3000/scan \
  -H "Content-Type: application/json" \
  -d '{"test":"data"}'

# Получить ответ с ссылкой:
# {"id":"abc12345","url":"http://178.18.240.104:3000/scan/abc12345","expiresIn":1800}

# Получить скан по ссылке
curl http://178.18.240.104:3000/scan/abc12345
```

## Мониторинг

### Использование памяти

```bash
pm2 monit
```

### Системные ресурсы

```bash
htop
```

## Firewall

Открытые порты:
- **22** - SSH
- **3000** - raw.data server

Проверить:
```bash
ufw status
```

Открыть новый порт:
```bash
ufw allow 8080/tcp
```

## Troubleshooting

### Сервер не запускается

```bash
# Проверь логи
pm2 logs rawdata-server

# Запусти напрямую для отладки
cd /root/rawdata-server
node index.js
```

### Порт занят

```bash
# Найди процесс на порту 3000
lsof -i :3000

# Убей процесс
kill -9 <PID>
```

### Недостаточно памяти

```bash
# Проверь память
free -h

# Рестарт сервера
pm2 restart rawdata-server
```

## Backup

```bash
# Создать бэкап
ssh root@178.18.240.104 "tar -czf /tmp/rawdata-backup.tar.gz /root/rawdata-server"
scp root@178.18.240.104:/tmp/rawdata-backup.tar.gz ./
```

## Полезные команды

```bash
# Версии
node --version
npm --version
pm2 --version

# Обновить PM2
npm install -g pm2
pm2 update

# Перезагрузить сервер
reboot
```

## Contacts

Если что-то не работает:
1. Проверь логи: `pm2 logs rawdata-server`
2. Проверь health: `curl http://178.18.240.104:3000/health`
3. Перезапусти: `pm2 restart rawdata-server`
