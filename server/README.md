# raw.data Server

Серверная часть для расширения raw.data. Хранит сканы веб-страниц и предоставляет короткие ссылки для AI.

## Быстрый старт

### 1. Установка зависимостей

```bash
cd server
npm install
```

### 2. Запуск сервера

```bash
npm start
```

Сервер запустится на `http://localhost:3000`

### 3. Для разработки (с auto-reload)

```bash
npm run dev
```

## API Эндпоинты

### POST /scan

Загрузить данные скана и получить короткую ссылку.

**Request:**
```bash
curl -X POST http://localhost:3000/scan \
  -H "Content-Type: application/json" \
  -d @scan-data.json
```

**Response:**
```json
{
  "id": "abc12345",
  "url": "http://localhost:3000/scan/abc12345",
  "expiresIn": 1800
}
```

### GET /scan/:id

Получить данные скана по ID.

**Request:**
```bash
curl http://localhost:3000/scan/abc12345
```

**Response:**
```json
{
  "meta": {
    "url": "https://example.com",
    "title": "Example",
    ...
  },
  "ui_elements": [...],
  "content": {...}
}
```

### GET /health

Проверка здоровья сервера.

**Request:**
```bash
curl http://localhost:3000/health
```

**Response:**
```json
{
  "status": "ok",
  "scans_count": 42,
  "uptime": 12345,
  "memory": {
    "used": "45.23MB",
    "total": "128.00MB"
  }
}
```

## Конфигурация

Настройки можно изменить через переменные окружения:

```bash
PORT=3000 npm start
```

Или прямо в коде `index.js`:

- `SCAN_TTL` - время жизни скана (по умолчанию 30 минут)
- `MAX_JSON_SIZE` - максимальный размер JSON (по умолчанию 5MB)
- `ID_LENGTH` - длина ID (по умолчанию 8 символов)

## Как работает

1. Расширение отправляет POST запрос с JSON данными скана
2. Сервер генерирует короткий ID (nanoid) и сохраняет в памяти
3. Возвращает короткую ссылку типа `http://server/scan/abc12345`
4. AI может открыть эту ссылку и получить чистый JSON
5. Через 30 минут скан автоматически удаляется

## Деплой

### На VPS (Ubuntu/Debian)

```bash
# 1. Установить Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Склонировать проект
git clone <your-repo>
cd server

# 3. Установить зависимости
npm install

# 4. Установить PM2 для запуска в фоне
sudo npm install -g pm2

# 5. Запустить сервер
pm2 start index.js --name rawdata-server

# 6. Настроить автозапуск
pm2 startup
pm2 save
```

### Nginx (опционально)

Если хочешь использовать домен и HTTPS:

```nginx
server {
    listen 80;
    server_name your-domain.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
    }
}
```

## Мониторинг

```bash
# Посмотреть логи
pm2 logs rawdata-server

# Статус
pm2 status

# Перезапустить
pm2 restart rawdata-server
```

## Лимиты

- Максимальный размер скана: **5MB**
- Время жизни скана: **30 минут**
- Хранение: **в памяти** (при перезапуске все сканы удалятся)

## TODO

- [ ] Добавить Redis для персистентного хранения
- [ ] Добавить rate limiting
- [ ] Добавить аналитику (сколько сканов создано/получено)
- [ ] Добавить HTTPS
- [ ] Добавить webhook для уведомлений

## License

MIT
