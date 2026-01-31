/**
 * Универсальная функция проверки и обновления хода после изменений в составе команд
 * Вызывается после join/leave/change-team событий и при завершении раунда
 */

const { checkTurnChange, findNextFullTeam, isTeamFull } = require('./alias-turn-helpers');
const { getNextTeamAndExplainer, buildAliasRoomState } = require('./alias');

/**
 * Проверка и обновление хода при изменении состава команды
 */
async function checkAndUpdateAliasTurn(prisma, roomId, io) {
  try {
    console.log('[Alias Turn] checkAndUpdateAliasTurn called for room:', roomId);
    
    const room = await prisma.aliasRoom.findUnique({ where: { id: roomId } });
    if (!room) {
      console.log('[Alias Turn] Room not found');
      return;
    }

    console.log('[Alias Turn] Room status:', room.status, 'Current team:', room.currentTeamId);

    const teams = await prisma.aliasTeam.findMany({
      where: { roomId },
      orderBy: { turnOrder: 'asc' }
    });

    const players = await prisma.aliasPlayer.findMany({
      where: { roomId, connectionStatus: { not: 'left' } },
      orderBy: { joinedAt: 'asc' }
    });

    console.log('[Alias Turn] Teams count:', teams.length);
    teams.forEach(team => {
      const teamPlayers = players.filter(p => p.teamId === team.id && !p.isSpectator);
      console.log(`[Alias Turn] Team ${team.name} (${team.id}): ${teamPlayers.length} players`);
    });

    // Проверяем, нужно ли изменить ход
    const turnChange = checkTurnChange(room, teams, players, getNextTeamAndExplainer);

    console.log('[Alias Turn] Turn change result:', turnChange);

    if (turnChange.shouldChange && turnChange.newTeamId) {
      console.log('[Alias Turn] Changing turn from', room.currentTeamId, 'to', turnChange.newTeamId);
      
      // Обновляем текущую команду и объясняющего
      await prisma.aliasRoom.update({
        where: { id: roomId },
        data: {
          currentTeamId: turnChange.newTeamId,
          currentExplainerId: turnChange.newExplainerId
        }
      });

      // Отправляем обновлённое состояние клиентам
      const state = await buildAliasRoomState(prisma, roomId);
      io.to(`alias:${roomId}`).emit('alias:state:sync', state);
      
      console.log('[Alias Turn] Turn changed successfully');
    } else {
      console.log('[Alias Turn] No turn change needed');
    }
  } catch (error) {
    console.error('[Alias Turn] Error checking/updating turn:', error);
  }
}

/**
 * Находит следующую полную команду с объясняющим
 * Используется при завершении раунда
 */
async function getNextFullTeamAndExplainer(prisma, roomId, currentTeamId, currentExplainerId) {
  try {
    const teams = await prisma.aliasTeam.findMany({
      where: { roomId },
      orderBy: { turnOrder: 'asc' }
    });

    const players = await prisma.aliasPlayer.findMany({
      where: { roomId, connectionStatus: { not: 'left' } },
      orderBy: { joinedAt: 'asc' }
    });

    // Используем стандартную функцию для получения следующей команды
    const next = getNextTeamAndExplainer(teams, players, currentTeamId, currentExplainerId);
    
    // Проверяем, полная ли команда
    const nextTeam = teams.find(t => t.id === next.teamId);
    
    if (nextTeam && isTeamFull(nextTeam, players)) {
      // Команда полная - возвращаем её
      return next;
    }
    
    // Команда неполная - ищем следующую полную
    const fullTeam = findNextFullTeam(teams, players, currentTeamId);
    
    if (!fullTeam) {
      // Нет полных команд - возвращаем результат по умолчанию
      console.log('[Alias Turn] No full teams available');
      return next;
    }
    
    // Нашли полную команду - получаем объясняющего
    const finalResult = getNextTeamAndExplainer(teams, players, currentTeamId, currentExplainerId);
    
    // Если результат - не полная команда, ищем дальше
    let attempts = 0;
    let currentCheckTeamId = currentTeamId;
    
    while (attempts < teams.length) {
      const result = getNextTeamAndExplainer(teams, players, currentCheckTeamId, currentExplainerId);
      const resultTeam = teams.find(t => t.id === result.teamId);
      
      if (resultTeam && isTeamFull(resultTeam, players)) {
        return result;
      }
      
      currentCheckTeamId = result.teamId;
      attempts++;
    }
    
    // Если не нашли - возвращаем дефолт
    return finalResult;
    
  } catch (error) {
    console.error('[Alias Turn] Error getting next full team:', error);
    // Возвращаем стандартную функцию при ошибке
    const teams = await prisma.aliasTeam.findMany({
      where: { roomId },
      orderBy: { turnOrder: 'asc' }
    });
    const players = await prisma.aliasPlayer.findMany({
      where: { roomId, connectionStatus: { not: 'left' } },
      orderBy: { joinedAt: 'asc' }
    });
    return getNextTeamAndExplainer(teams, players, currentTeamId, currentExplainerId);
  }
}

module.exports = { checkAndUpdateAliasTurn, getNextFullTeamAndExplainer };
