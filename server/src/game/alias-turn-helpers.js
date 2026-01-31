/**
 * Вспомогательные функции для управления ходами в Alias
 * Реализуют динамическую проверку полноты команд
 */

/**
 * Проверяет, является ли команда полной (2+ игроков)
 * @param {Object} team - Команда
 * @param {Array} players - Все игроки комнаты
 * @returns {boolean}
 */
function isTeamFull(team, players) {
  if (!team) return false;
  
  const teamPlayers = players.filter(
    p => p.teamId === team.id && 
    p.connectionStatus === "online" && 
    !p.isSpectator
  );
  
  return teamPlayers.length >= 2;
}

/**
 * Находит следующую полную команду в циклическом порядке
 * @param {Array} teams - Все команды
 * @param {Array} players - Все игроки  
 * @param {string|null} currentTeamId - ID текущей команды (может быть null)
 * @returns {Object|null} - Следующая полная команда или null
 */
function findNextFullTeam(teams, players, currentTeamId) {
  if (teams.length === 0) return null;
  
  // Находим индекс текущей команды
  let startIndex = teams.findIndex(t => t.id === currentTeamId);
  if (startIndex === -1) startIndex = -1; // Начнем с первой команды
  
  // Проверяем все команды по кругу
  for (let i = 0; i < teams.length; i++) {
    const index = (startIndex + 1 + i) % teams.length;
    const team = teams[index];
    
    if (isTeamFull(team, players)) {
      return team;
    }
  }
  
  return null; // Нет полных команд
}

/**
 * Проверяет, нужно ли передать ход другой команде
 * Вызывается при изменении состава команды
 * @param {Object} room - Комната
 * @param {Array} teams - Все команды
 * @param {Array} players - Все игроки
 * @returns {Object} - { shouldChange: boolean, newTeamId: string|null, newExplainerId: string|null }
 */
function checkTurnChange(room, teams, players, getNextTeamAndExplainer) {
  // Если нет текущей команды (игра не начата) - ничего не меняем
  if (!room.currentTeamId) {
    console.log('[Alias Turn Check] No current team set, skipping');
    return { shouldChange: false, newTeamId: null, newExplainerId: null };
  }
  
  // Раунд активен (идёт объяснение слов) - не прерываем
  // Проверяем, что таймер действительно идёт
  if (room.turnStartedAt && room.turnEndsAt) {
    const now = Date.now();
    const turnStartedAt = new Date(room.turnStartedAt).getTime();
    const turnEndsAt = new Date(room.turnEndsAt).getTime();
    
    // Если раунд начат И ещё не закончился - не прерываем
    if (now >= turnStartedAt && now < turnEndsAt) {
      console.log('[Alias Turn Check] Round is active, not changing turn');
      return { shouldChange: false, newTeamId: null, newExplainerId: null };
    }
  }
  
  // Раунд не активен (между раундами) - можно менять ход
  // Проверяем текущую команду
  const currentTeam = teams.find(t => t.id === room.currentTeamId);
  
  if (!currentTeam || !isTeamFull(currentTeam, players)) {
    console.log('[Alias Turn Check] Current team is incomplete, finding next full team');
    // Текущая команда неполная - ищем следующую полную
    const nextFullTeam = findNextFullTeam(teams, players, room.currentTeamId);
    
    if (!nextFullTeam) {
      // Нет полных команд - оставляем как есть (игра не может продолжаться)
      console.log('[Alias Turn Check] No full teams available');
      return { shouldChange: false, newTeamId: null, newExplainerId: null };
    }
    
    // Находим объясняющего для новой команды
    const result = getNextTeamAndExplainer(teams, players, room.currentTeamId, room.currentExplainerId);
    
    console.log('[Alias Turn Check] Changing to team:', result.teamId);
    return {
      shouldChange: true,
      newTeamId: result.teamId,
      newExplainerId: result.explainerId
    };
  }
  
  // Текущая команда полная - всё ОК
  console.log('[Alias Turn Check] Current team is full, no change needed');
  return { shouldChange: false, newTeamId: null, newExplainerId: null };
}

module.exports = {
  isTeamFull,
  findNextFullTeam,
  checkTurnChange
};
