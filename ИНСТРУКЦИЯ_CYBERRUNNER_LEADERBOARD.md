# Инструкция по завершению интеграции CyberRunner Leaderboard

## ЧТО УЖЕ СДЕЛАНО ✅

### Серверная часть:
1. ✅ Добавлен `aliasCyberLeaderboard` Map в `server/src/game/alias.js`
2. ✅ Созданы функции `updateCyberLeaderboard`, `getCyberLeaderboard`, `clearCyberLeaderboard`
3. ✅ Функции экспортированы и импортированы в `server/src/index.js`

### Клиентская часть:
1. ✅ Добавлен обработчик `alias:cyber:leaderboard` в `AliasPage.jsx`
2. ✅ Добавлено действие `updateCyberScore` в actions
3. ✅ Обновлён `handleCyberScoreUpdate` для отправки score на сервер
4. ✅ Состояние `cyberLeaderboard` поднято на уровень `AliasPage.jsx`

## ЧТО НУЖНО СДЕЛАТЬ ВРУЧНУЮ ⚠️

### Добавить Socket обработчик в `server/src/index.js`

Найдите в файле `server/src/index.js` обработчик события `socket.on("alias:history:update", ...)` (примерно строка 3724).

**После этого обработчика** добавьте следующий код:

```javascript
  // ═══════════════════════════════════════════════════════════════════════════
  // CYBERRUNNER LEADERBOARD
  // ═══════════════════════════════════════════════════════════════════════════

  socket.on("alias:cyber:score", async (payload, ack) => {
    const roomId = socket.data.aliasRoomId;
    const playerId = socket.data.aliasPlayerId;
    const { score } = payload || {};
    
    if (!roomId || !playerId) {
      if (ack) ack({ ok: false, error: "Не в комнате" });
      return;
    }
    
    if (typeof score !== "number" || score <= 0) {
      if (ack) ack({ ok: false, error: "Неверный score" });
      return;
    }
    
    const player = await prisma.aliasPlayer.findUnique({ where: { id: playerId } });
    if (!player) {
      if (ack) ack({ ok: false, error: "Игрок не найден" });
      return;
    }
    
    // Обновляем лидерборд
    const updatedLeaderboard = updateCyberLeaderboard(roomId, player.name, score);
    
    if (updatedLeaderboard) {
      // Рассылаем обновлённый лидерборд всем в комнате
      io.to(`alias:${roomId}`).emit("alias:cyber:leaderboard", { leaderboard: updatedLeaderboard });
    }
    
    if (ack) ack({ ok: true, leaderboard: updatedLeaderboard });
  });
```

### Как найти место:

1. Откройте `server/src/index.js`
2. Найдите (Ctrl+F): `socket.on("alias:history:update"`
3. Прокрутите до конца этого обработчика (до закрывающей `});`)
4. Вставьте код выше **сразу после** этого обработчика

## КАК ЭТО РАБОТАЕТ

1. **Игрок играет в CyberRunner** и получает score
2. **CyberRunner вызывает** `onScoreUpdate(score, playerName)`
3. **handleCyberScoreUpdate** отправляет score на сервер: `socket.emit("alias:cyber:score", { score })`
4. **Сервер получает** score, обновляет лидерборд в памяти для этой комнаты
5. **Сервер рассылает** обновлённый лидерборд ВСЕМ игрокам в комнате: `io.to('alias:roomId').emit("alias:cyber:leaderboard", { leaderboard })`
6. **Все клиенты получают** обновление и показывают общий лидерборд всех игроков

## РЕЗУЛЬТАТ

После добавления обработчика на сервере:
- ✅ Лидерборд будет показывать результаты **всех игроков** в комнате
- ✅ Обновления будут синхронизироваться в реальном времени
- ✅ Каждый игрок увидит топ-20 результатов всех участников

## ТЕСТИРОВАНИЕ

1. Перезапустите сервер после добавления обработчика
2. Зайдите в комнату Alias с 2+ игроками
3. Начните раунд, команда которая НЕ на ходу играет в CyberRunner
4. Завершите игру в CyberRunner (получите score)
5. Проверьте, что лидерборд показывает результаты **обоих** игроков
