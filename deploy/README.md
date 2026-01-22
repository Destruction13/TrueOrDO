# 🎯 PartyСhaos.ru — Инструкция по деплою и обновлению

## Шаг 1. Подключаемся к серверу

На своём ПК открой PowerShell или терминал и подключись к VPS:

```bash
ssh root@<72.56.84.248>
```

(если спросит пароль — вводи свой root-пароль, ничего не будет видно, это норм)

---

## Шаг 2. Переходим в папку проекта

```bash
cd /opt/partychaos
```

Проверим, что ты реально в проекте:

```bash
ls -la
```

Ты должен увидеть среди файлов: `package.json`, `client/`, `server/`, `deploy/`, `node_modules/` и т.д.

---

## Шаг 3. Проверяем текущий статус

Смотрим, что сейчас с backend'ом:

```bash
sudo -u partychaos pm2 status
```

Ты должен увидеть процесс `partychaos` со статусом `online`.

---

## Шаг 4. Запускаем update.sh

```bash
sudo bash deploy/update.sh
```

Он автоматически:

- создаст бэкап базы данных в `backups/`;
- подтянет последнюю версию из `main`;
- обновит зависимости (`npm install`);
- пересоберёт фронтенд (`npm run build`);
- применит миграции Prisma;
- перезапустит backend через PM2;
- проверит health endpoint.

✅ Если всё прошло успешно, ты увидишь:

```
═══════════════════════════════════════════════════════════════════════════════
 ✓ Update Complete!
═══════════════════════════════════════════════════════════════════════════════
```

---

## Шаг 5. Если нужно изменить .env (новые ключи)

Открываешь на сервере:

```bash
nano /opt/partychaos/server/.env
```

Редактируешь нужные значения (SMTP, OAuth и т.д.).

Сохраняешь:

- `Ctrl + O` → `Enter` → `Ctrl + X`

После изменения .env перезапусти backend:

```bash
sudo -u partychaos pm2 restart partychaos
```

---

## Шаг 6. Проверяем что всё работает

### Статус PM2:

```bash
sudo -u partychaos pm2 status
```

Должен быть статус `online`.

### Health check:

```bash
curl http://127.0.0.1:3001/api/health
```

Должен вернуть `{"status":"ok"}` или HTTP 200.

### Проверка фронтенда:

```bash
ls -la /opt/partychaos/client/dist/index.html
```

Файл должен существовать.

### Проверка в браузере:

Открой https://partychaos.ru — должен работать.

---

## Шаг 7. Просмотр логов

Логи backend'а в реальном времени:

```bash
sudo -u partychaos pm2 logs partychaos --lines 100
```

Или только ошибки:

```bash
sudo -u partychaos pm2 logs partychaos --err --lines 50
```

Выйти из логов: `Ctrl + C`

---

## Шаг 8. Полезные команды

| Действие            | Команда                                   |
| --------------------------- | ------------------------------------------------ |
| Статус сервера | `sudo -u partychaos pm2 status`                |
| Перезапуск        | `sudo -u partychaos pm2 restart partychaos`    |
| Остановка          | `sudo -u partychaos pm2 stop partychaos`       |
| Запуск                | `sudo -u partychaos pm2 start partychaos`      |
| Логи                    | `sudo -u partychaos pm2 logs partychaos`       |
| Selftest                    | `sudo bash /opt/partychaos/deploy/selftest.sh` |
| Nginx статус          | `systemctl status nginx`                       |
| Nginx reload                | `systemctl reload nginx`                       |

---

## 🔥 Экстренные случаи

### Если update.sh упал на git pull:

Значит есть локальные изменения. Проверь:

```bash
cd /opt/partychaos
sudo -u partychaos git status
```

Если нужно сбросить локальные изменения:

```bash
sudo -u partychaos git checkout -- .
```

И снова запусти `sudo bash deploy/update.sh`.

---

### Если backend не стартует:

```bash
sudo -u partychaos pm2 logs partychaos --lines 100
```

Частые проблемы:

- Неправильный `.env` — проверь `DATABASE_URL` и `SESSION_SECRET`
- Права доступа — запусти `chown -R partychaos:partychaos /opt/partychaos`

---

### Если фронтенд не собирается (vite не найден):

```bash
cd /opt/partychaos
sudo -u partychaos npm install --include=dev
sudo -u partychaos npm run build
```

---

### Полная переустановка (крайний случай):

```bash
sudo bash /opt/partychaos/deploy/install.sh
```

Это безопасно — скрипт идемпотентный, не сломает существующие данные и .env.

---

## 📁 Важные пути

| Что                     | Путь                                     |
| -------------------------- | -------------------------------------------- |
| Проект               | `/opt/partychaos/`                         |
| Фронтенд билд  | `/opt/partychaos/client/dist/`             |
| Backend                    | `/opt/partychaos/server/`                  |
| База данных      | `/opt/partychaos/server/prisma/prod.db`    |
| Конфиг .env          | `/opt/partychaos/server/.env`              |
| Бэкапы БД          | `/opt/partychaos/backups/`                 |
| Аватарки           | `/opt/partychaos/server/uploads/avatars/`  |
| Nginx конфиг         | `/etc/nginx/sites-available/partychaos.ru` |
| SSL сертификаты | `/etc/letsencrypt/live/partychaos.ru/`     |

---

## 🔧 Настройка Nginx для загрузки файлов

Если аватарки не загружаются (ошибка 413 или пустой ответ), нужно увеличить лимит размера файлов в nginx:

```bash
sudo nano /etc/nginx/sites-available/partychaos.ru
```

Добавь в блок `server { ... }`:

```nginx
client_max_body_size 15M;  # Разрешаем файлы до 15MB
```

Также убедись, что проксирование настроено правильно для API:

```nginx
location /api/ {
    proxy_pass http://127.0.0.1:3001;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection 'upgrade';
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_cache_bypass $http_upgrade;
    
    # Важно для загрузки файлов
    client_max_body_size 15M;
    proxy_read_timeout 60s;
}

location /uploads/ {
    alias /opt/partychaos/server/uploads/;
    expires 7d;
    add_header Cache-Control "public, immutable";
}
```

После изменения:

```bash
sudo nginx -t           # Проверка конфига
sudo systemctl reload nginx  # Применение изменений
```

---

## 🛠 Техническая информация

### npm Workspaces стратегия

Проект использует npm workspaces (определены в корневом `package.json`). При установке зависимостей npm hoistит их в корневой `node_modules/`. Это нормальное поведение.

**Правильный способ установки:**

```bash
cd /opt/partychaos
npm install --include=dev
```

**Правильный способ сборки:**

```bash
npm run build  # делегирует в client workspace
```

Не нужно заходить в `client/` и запускать `npm install` там отдельно — это может сломать workspaces.

### Почему include=dev?

`vite` и `@vitejs/plugin-react` — это devDependencies клиента. Без них билд не соберётся. Скрипты автоматически настраивают `/opt/partychaos/.npmrc` с `include=dev`.

### Git стратегия

- Скрипты используют `git merge --ff-only` (только fast-forward)
- Никаких `git reset --hard` — это опасно
- Проверяются только tracked файлы (untracked игнорируются)
- Все изменения должны быть закоммичены в репозиторий, не на сервере
