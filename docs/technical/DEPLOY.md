# Деплой и настройка

## 🚀 Production Deployment (VPS)

Инструкция для деплоя на Ubuntu 24.04 VPS с доменом **partychaos.ru**.

---

## 📋 Требования

### Сервер
- **ОС**: Ubuntu 24.04 LTS
- **RAM**: минимум 1 GB (рекомендуется 2 GB)
- **Диск**: минимум 10 GB свободного места
- **CPU**: 1 vCPU (рекомендуется 2 vCPU)
- **Публичный IPv4 адрес**
- **Доступ по SSH** (root или sudo)

### Домен
- Зарегистрированный домен
- Доступ к DNS настройкам

---

## 🌐 1. Настройка DNS

В панели управления доменом создайте A-записи:

| Тип | Имя | Значение | TTL |
|-----|-----|----------|-----|
| A | @ | `ВАШ_IP_VPS` | 3600 |
| A | www | `ВАШ_IP_VPS` | 3600 |

**Проверка DNS:**

```bash
dig partychaos.ru +short
# Должен вернуть IP вашего VPS
```

> ⚠️ DNS изменения могут применяться до 24 часов.

---

## 📦 2. Установка

### 2.1. Подключение к VPS

```bash
ssh root@ВАШ_IP_VPS
```

### 2.2. Клонирование репозитория

```bash
cd /tmp
git clone https://github.com/Destruction13/TrueOrDO.git
cd TrueOrDO
```

### 2.3. Запуск установки

```bash
sudo bash deploy/install.sh
```

### Что делает скрипт установки:

1. **Установка зависимостей**:
   - Node.js 20 LTS (через NodeSource)
   - nginx (веб-сервер и reverse proxy)
   - certbot (SSL сертификаты Let's Encrypt)
   - PM2 (процесс-менеджер для Node.js)

2. **Создание системного пользователя**:
   - Пользователь: `partychaos`
   - Домашняя директория: `/opt/partychaos`
   - Без возможности входа (security)

3. **Клонирование проекта**:
   - Репозиторий клонируется в `/opt/partychaos`
   - Устанавливаются права доступа

4. **Установка npm зависимостей**:
   - Используется npm workspaces (root + server + client)
   - Зависимости устанавливаются для всех workspace

5. **Сборка фронтенда**:
   - `npm run build` — сборка React приложения
   - Результат в `client/dist/`

6. **Настройка базы данных**:
   - Копирование `.env.production` в `.env`
   - Применение миграций Prisma
   - Загрузка seed-контента (игровые данные)

7. **Получение SSL сертификата**:
   - Автоматическое получение от Let's Encrypt
   - Настройка автообновления (certbot renew)

8. **Настройка nginx**:
   - Создание конфигурации для домена
   - Настройка reverse proxy для API и WebSocket
   - Настройка отдачи статики
   - Включение gzip сжатия

9. **Запуск бэкенда**:
   - PM2 запускает `server/src/index.js`
   - Автозапуск при перезагрузке сервера
   - Логирование в `~partychaos/.pm2/logs/`

### Структура после установки:

```
/opt/partychaos/
├── client/
│   └── dist/              # Собранный фронтенд
├── server/
│   ├── src/               # Исходники сервера
│   ├── prisma/
│   │   └── prod.db        # Production БД
│   ├── uploads/
│   │   └── avatars/       # Загруженные аватары
│   └── .env               # Переменные окружения
├── backups/               # Бэкапы БД
├── node_modules/          # npm зависимости
└── package.json           # Root package (workspaces)
```

---

## ⚙️ 3. Настройка SMTP (обязательно)

После установки необходимо настроить SMTP для отправки email (верификация, восстановление пароля).

### 3.1. Редактирование .env

```bash
sudo nano /opt/partychaos/server/.env
```

### 3.2. Настройка Gmail SMTP

1. Перейдите в [Google Account Security](https://myaccount.google.com/security)
2. Включите **2-Step Verification**
3. Перейдите в **App passwords**
4. Создайте пароль для приложения "Mail"
5. Скопируйте 16-символьный пароль

### 3.3. Заполнение переменных

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
SMTP_FROM="PartyChaos <your-email@gmail.com>"
```

### 3.4. Перезапуск сервера

```bash
sudo -u partychaos pm2 restart partychaos
```

---

## ✅ 4. Проверка работоспособности

### 4.1. Автоматическая проверка

```bash
sudo bash /opt/partychaos/deploy/selftest.sh
```

Скрипт проверяет:
- ✓ Nginx запущен и работает
- ✓ PM2 процесс запущен
- ✓ База данных существует
- ✓ SSL сертификат валиден
- ✓ Домен доступен по HTTPS
- ✓ API отвечает
- ✓ WebSocket работает

### 4.2. Ручная проверка

**Проверка nginx:**
```bash
sudo systemctl status nginx
sudo nginx -t  # Проверка конфигурации
```

**Проверка PM2:**
```bash
sudo -u partychaos pm2 status
sudo -u partychaos pm2 logs partychaos --lines 50
```

**Проверка БД:**
```bash
ls -lh /opt/partychaos/server/prisma/prod.db
```

**Проверка SSL:**
```bash
sudo certbot certificates
```

**Проверка сайта:**
```bash
curl -I https://partychaos.ru
# Должен вернуть 200 OK
```

---

## 🔄 5. Обновление

При появлении новых коммитов в репозитории:

```bash
sudo bash /opt/partychaos/deploy/update.sh
```

### Что делает скрипт обновления:

1. **Бэкап базы данных**:
   - Создаёт копию `prod.db` в `backups/`
   - Хранит последние 10 бэкапов

2. **Проверка git состояния**:
   - Проверяет наличие локальных изменений
   - Если есть изменения — прерывает обновление

3. **Обновление кода**:
   - `git fetch origin`
   - `git reset --hard origin/main`
   - Fast-forward only (без merge)

4. **Установка зависимостей**:
   - `npm install` (если изменился package.json)

5. **Пересборка фронтенда**:
   - `npm run build`

6. **Применение миграций**:
   - `npx prisma migrate deploy`

7. **Обновление seed-контента**:
   - `npm run db:seed`

8. **Перезапуск бэкенда**:
   - `pm2 restart partychaos`
   - Без даунтайма (graceful restart)

---

## 🛠️ 6. Полезные команды

### PM2 (процесс-менеджер)

```bash
# Статус процессов
sudo -u partychaos pm2 status

# Логи (последние 100 строк)
sudo -u partychaos pm2 logs partychaos --lines 100

# Логи в реальном времени
sudo -u partychaos pm2 logs partychaos

# Перезапуск
sudo -u partychaos pm2 restart partychaos

# Остановка
sudo -u partychaos pm2 stop partychaos

# Запуск
sudo -u partychaos pm2 start partychaos

# Удаление из PM2
sudo -u partychaos pm2 delete partychaos

# Информация о процессе
sudo -u partychaos pm2 info partychaos

# Мониторинг (CPU, RAM)
sudo -u partychaos pm2 monit
```

### Nginx

```bash
# Статус
sudo systemctl status nginx

# Перезапуск
sudo systemctl restart nginx

# Перезагрузка конфигурации (без даунтайма)
sudo systemctl reload nginx

# Остановка
sudo systemctl stop nginx

# Запуск
sudo systemctl start nginx

# Проверка конфигурации
sudo nginx -t

# Логи доступа
sudo tail -f /var/log/nginx/access.log

# Логи ошибок
sudo tail -f /var/log/nginx/error.log
```

### SSL (Let's Encrypt)

```bash
# Список сертификатов
sudo certbot certificates

# Обновление сертификатов (вручную)
sudo certbot renew

# Обновление с перезагрузкой nginx
sudo certbot renew --deploy-hook "systemctl reload nginx"

# Удаление сертификата
sudo certbot delete --cert-name partychaos.ru
```

### База данных

```bash
# Просмотр БД (SQLite)
sqlite3 /opt/partychaos/server/prisma/prod.db

# Экспорт БД в SQL
sqlite3 /opt/partychaos/server/prisma/prod.db .dump > backup.sql

# Импорт БД из SQL
sqlite3 /opt/partychaos/server/prisma/prod.db < backup.sql

# Размер БД
du -h /opt/partychaos/server/prisma/prod.db
```

### Логи

```bash
# Логи PM2
sudo -u partychaos pm2 logs partychaos

# Логи nginx (access)
sudo tail -f /var/log/nginx/access.log

# Логи nginx (error)
sudo tail -f /var/log/nginx/error.log

# Системные логи
sudo journalctl -u nginx -f
```

---

## 💾 7. Бэкап и восстановление

### 7.1. Ручной бэкап

```bash
# Бэкап БД
cp /opt/partychaos/server/prisma/prod.db \
   /opt/partychaos/backups/prod.db.$(date +%Y%m%d_%H%M%S).bak

# Бэкап загруженных файлов
tar -czf /opt/partychaos/backups/uploads.$(date +%Y%m%d_%H%M%S).tar.gz \
   /opt/partychaos/server/uploads/

# Бэкап .env
cp /opt/partychaos/server/.env \
   /opt/partychaos/backups/.env.$(date +%Y%m%d_%H%M%S).bak
```

### 7.2. Восстановление из бэкапа

```bash
# Остановить бэкенд
sudo -u partychaos pm2 stop partychaos

# Восстановить БД
cp /opt/partychaos/backups/prod.db.TIMESTAMP.bak \
   /opt/partychaos/server/prisma/prod.db

# Восстановить загруженные файлы
tar -xzf /opt/partychaos/backups/uploads.TIMESTAMP.tar.gz -C /

# Запустить бэкенд
sudo -u partychaos pm2 start partychaos
```

### 7.3. Автоматический бэкап (cron)

```bash
# Редактировать crontab
sudo crontab -e

# Добавить строку (бэкап каждый день в 3:00)
0 3 * * * cp /opt/partychaos/server/prisma/prod.db /opt/partychaos/backups/prod.db.$(date +\%Y\%m\%d_\%H\%M\%S).bak && find /opt/partychaos/backups/ -name "prod.db.*.bak" -mtime +30 -delete
```

---

## 🔒 8. Безопасность

### 8.1. Firewall (UFW)

```bash
# Включить UFW
sudo ufw enable

# Разрешить SSH
sudo ufw allow 22/tcp

# Разрешить HTTP
sudo ufw allow 80/tcp

# Разрешить HTTPS
sudo ufw allow 443/tcp

# Проверить статус
sudo ufw status
```

### 8.2. Fail2Ban (защита от брутфорса)

```bash
# Установка
sudo apt-get install fail2ban

# Создать конфигурацию для nginx
sudo nano /etc/fail2ban/jail.local
```

```ini
[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[nginx-noscript]
enabled = true
port = http,https
logpath = /var/log/nginx/access.log
```

```bash
# Перезапустить Fail2Ban
sudo systemctl restart fail2ban

# Проверить статус
sudo fail2ban-client status
```

### 8.3. Обновление системы

```bash
# Обновить список пакетов
sudo apt-get update

# Обновить пакеты
sudo apt-get upgrade -y

# Обновить систему
sudo apt-get dist-upgrade -y

# Удалить неиспользуемые пакеты
sudo apt-get autoremove -y
```

---

## 🐛 9. Troubleshooting

### Сайт не открывается

**Проблема**: Сайт не доступен по домену

**Решение**:
1. Проверьте DNS: `dig partychaos.ru +short`
2. Проверьте nginx: `sudo systemctl status nginx`
3. Проверьте firewall: `sudo ufw status` (порты 80, 443 должны быть открыты)
4. Проверьте логи nginx: `sudo tail -f /var/log/nginx/error.log`

### 502 Bad Gateway

**Проблема**: Nginx возвращает 502 Bad Gateway

**Решение**:
1. Проверьте PM2: `sudo -u partychaos pm2 status`
2. Проверьте логи PM2: `sudo -u partychaos pm2 logs partychaos --lines 50`
3. Проверьте порт: `sudo netstat -tulpn | grep 3001`
4. Перезапустите бэкенд: `sudo -u partychaos pm2 restart partychaos`

### WebSocket не работает

**Проблема**: Игра не синхронизируется, нет real-time обновлений

**Решение**:
1. Проверьте selftest: `sudo bash /opt/partychaos/deploy/selftest.sh`
2. Проверьте nginx конфигурацию для `/socket.io/`
3. Проверьте логи браузера (F12 → Console)
4. Проверьте логи PM2: `sudo -u partychaos pm2 logs partychaos`

### SSL сертификат не получен

**Проблема**: Let's Encrypt не может выдать сертификат

**Решение**:
1. Проверьте DNS: `dig partychaos.ru +short` (должен вернуть IP VPS)
2. Проверьте порт 80: `sudo ufw allow 80`
3. Остановите nginx: `sudo systemctl stop nginx`
4. Получите сертификат вручную:
   ```bash
   sudo certbot certonly --standalone -d partychaos.ru -d www.partychaos.ru
   ```
5. Запустите nginx: `sudo systemctl start nginx`

### База данных повреждена

**Проблема**: Ошибки при работе с БД

**Решение**:
1. Восстановите из бэкапа (см. раздел "Бэкап и восстановление")
2. Или сбросьте БД:
   ```bash
   cd /opt/partychaos/server
   sudo -u partychaos npx prisma migrate reset --force
   sudo -u partychaos npm run db:seed
   ```

### Нехватка памяти

**Проблема**: PM2 процесс падает из-за нехватки RAM

**Решение**:
1. Добавьте swap:
   ```bash
   sudo fallocate -l 2G /swapfile
   sudo chmod 600 /swapfile
   sudo mkswap /swapfile
   sudo swapon /swapfile
   echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
   ```
2. Перезапустите PM2: `sudo -u partychaos pm2 restart partychaos`

---

## 📊 10. Мониторинг

### 10.1. PM2 Monitoring

```bash
# Real-time мониторинг
sudo -u partychaos pm2 monit

# Статистика
sudo -u partychaos pm2 status
```

### 10.2. Системный мониторинг

```bash
# CPU и RAM
htop

# Диск
df -h

# Сетевые соединения
sudo netstat -tulpn

# Процессы
ps aux | grep node
```

### 10.3. Логи

```bash
# PM2 логи
sudo -u partychaos pm2 logs partychaos --lines 100

# Nginx access логи
sudo tail -f /var/log/nginx/access.log

# Nginx error логи
sudo tail -f /var/log/nginx/error.log
```

---

## 🌍 11. Переменные окружения

### Production (.env)

```env
# Database
DATABASE_URL="file:/opt/partychaos/server/prisma/prod.db"

# Server
PORT=3001
NODE_ENV=production
CLIENT_ORIGIN=https://partychaos.ru
APP_BASE_URL=https://partychaos.ru

# Session
SESSION_SECRET=your-super-secret-session-key-change-in-production

# SMTP (Gmail)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-16-character-app-password
SMTP_FROM="PartyChaos <your-email@gmail.com>"

# OAuth (Discord)
DISCORD_CLIENT_ID=your-discord-client-id
DISCORD_CLIENT_SECRET=your-discord-client-secret
DISCORD_REDIRECT_URI=https://partychaos.ru/api/auth/discord/callback

# OAuth (Google)
GOOGLE_CLIENT_ID=your-google-client-id
GOOGLE_CLIENT_SECRET=your-google-client-secret
GOOGLE_REDIRECT_URI=https://partychaos.ru/api/auth/google/callback

# Tribute (Платёжная система)
TRIBUTE_API_KEY=your-tribute-api-key
TRIBUTE_WEBHOOK_URL=https://partychaos.ru/api/subscription/payments/webhook
```

---

## 📁 12. Расположение файлов

| Что | Путь |
|-----|------|
| Приложение | `/opt/partychaos/` |
| База данных (SQLite) | `/opt/partychaos/server/prisma/prod.db` |
| Бэкапы БД | `/opt/partychaos/backups/` |
| Environment | `/opt/partychaos/server/.env` |
| Загруженные аватары | `/opt/partychaos/server/uploads/avatars/` |
| Nginx конфигурация | `/etc/nginx/sites-available/partychaos.ru` |
| SSL сертификаты | `/etc/letsencrypt/live/partychaos.ru/` |
| PM2 логи | `~partychaos/.pm2/logs/` |
| Nginx логи | `/var/log/nginx/` |

---

## 🏗️ 13. Архитектура деплоя

```
┌─────────────────────────────────────────────────────────────┐
│                         Internet                            │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTPS (443)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                     Nginx (reverse proxy)                   │
│  - SSL termination (Let's Encrypt)                          │
│  - Static files: /opt/partychaos/client/dist               │
│  - Proxy /api/* → localhost:3001                           │
│  - Proxy /socket.io/* → localhost:3001 (WebSocket)         │
│  - Proxy /uploads/* → localhost:3001                       │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP (3001, localhost only)
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   Node.js Backend (PM2)                     │
│  - Express API (/api/*)                                     │
│  - Socket.IO (WebSocket)                                    │
│  - Prisma ORM                                               │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          ▼
┌─────────────────────────────────────────────────────────────┐
│                   SQLite Database                           │
│  /opt/partychaos/server/prisma/prod.db                     │
└─────────────────────────────────────────────────────────────┘
```
