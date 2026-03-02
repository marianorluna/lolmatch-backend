function lolStatsDTO(stats = {}) {
  return {
    champion: stats.champion || null,
    winRate: stats.winRate || null,
    matchesPlayed: stats.matchesPlayed || null,
    kills: stats.kills || null,
    deaths: stats.deaths || null,
    assists: stats.assists || null,
  };
}

module.exports = lolStatsDTO;
