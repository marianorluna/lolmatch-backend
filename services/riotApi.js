const axios = require("axios");
const cache = require("../utils/cache.js");

//configuración regional
const REGION_CONFIG = {
  EUW: { platform: "euw1", routing: "europe" },
  EUNE: { platform: "eun1", routing: "europe" },
  NA: { platform: "na1", routing: "americas" },
  KR: { platform: "kr", routing: "asia" },
  JP: { platform: "jp1", routing: "asia" },
  BR: { platform: "br1", routing: "americas" },
  LAS: { platform: "la2", routing: "americas" },
  LAN: { platform: "la1", routing: "americas" },
  OCE: { platform: "oc1", routing: "sea" },
  RU: { platform: "ru", routing: "europe" },
  TR: { platform: "tr1", routing: "europe" },
};

//función para obtener los headers
const getHeaders = () => {
  const key = process.env.RIOT_API_KEY;
  if (!key) console.error("⚠️ FATAL: No Riot API key in .env");
  return { "X-Riot-Token": key };
};

//función para obtener las urls
const getUrls = (regionCode) => {
  const config =
    REGION_CONFIG[regionCode?.toUpperCase()] || REGION_CONFIG["EUW"];
  return {
    platformUrl: `https://${config.platform}.api.riotgames.com`,
    routingUrl: `https://${config.routing}.api.riotgames.com`,
  };
};

//función para obtener los datos de la liga, summoner y stats para el perfil
async function getFullPlayerStats(gameName, tagLine, region = "EUW") {
  const { platformUrl, routingUrl } = getUrls(region);

  try {
    //console.log(`\n--- 🚀 Searching stats for: ${gameName} #${tagLine} [${region}] ---`);

    //1. obtener el puuid del jugador
    const accountUrl = `${routingUrl}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(
      gameName
    )}/${encodeURIComponent(tagLine)}`;
    const accountRes = await axios.get(accountUrl, { headers: getHeaders() });
    const { puuid, gameName: riotName, tagLine: riotTag } = accountRes.data;

    //console.log(`✅ Paso 1: PUUID found.`);

    //2. obtener los datos básicos del summoner
    const summonerUrl = `${platformUrl}/lol/summoner/v4/summoners/by-puuid/${puuid}`;
    const summonerRes = await axios.get(summonerUrl, { headers: getHeaders() });

    const encryptedSummonerId = summonerRes.data.id;
    const profileIconId = summonerRes.data.profileIconId;
    const summonerLevel = summonerRes.data.summonerLevel;

    //3. obtener el rango del jugador
    let soloQ = null;
    if (encryptedSummonerId) {
      //console.log(`✅ Paso 2: ID encontrado. Buscando Rango...`);
      try {
        const leagueUrl = `${platformUrl}/lol/league/v4/entries/by-summoner/${encryptedSummonerId}`;
        const leagueRes = await axios.get(leagueUrl, { headers: getHeaders() });
        soloQ = leagueRes.data.find((q) => q.queueType === "RANKED_SOLO_5x5");
        //console.log(`✅ Paso 3: Rango obtenido.`);
      } catch (err) {
        console.warn("⚠️ Couldn't get the league.");
      }
    } else {
      //console.warn("⚠️ Alert: Riot didn't return 'id'. Skipping Rank.");
    }

    //4. obtener las maestrías del jugador
    let topChampions = [];
    try {
      const masteryUrl = `${platformUrl}/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/top?count=3`;
      const masteryRes = await axios.get(masteryUrl, { headers: getHeaders() });
      topChampions = masteryRes.data;
      //console.log("✅ Paso 4: Maestrías obtenidas.");
    } catch (err) {
      console.warn("⚠️ Couldn't get the masteries.");
    }

    //5. obtener el historial de partidas del jugador
    let matchHistory = [];
    try {
      //console.log("📡 Buscando historial de partidas...");
      const matchesUrl = `${routingUrl}/lol/match/v5/matches/by-puuid/${puuid}/ids?start=0&count=5`;
      const matchesRes = await axios.get(matchesUrl, { headers: getHeaders() });
      const matchIds = matchesRes.data;

      //detalles de cada partida (en paralelo)
      const matchPromises = matchIds.map(async (matchId) => {
        const detailsUrl = `${routingUrl}/lol/match/v5/matches/${matchId}`;
        const detailsRes = await axios.get(detailsUrl, {
          headers: getHeaders(),
        });
        const info = detailsRes.data.info;

        //buscar nuestro jugador dentro de la partida
        const participant = info.participants.find((p) => p.puuid === puuid);

        return {
          matchId,
          gameMode: info.gameMode,
          gameDuration: info.gameDuration,
          win: participant.win,
          championName: participant.championName,
          championId: participant.championId,
          kills: participant.kills,
          deaths: participant.deaths,
          assists: participant.assists,
          kda: (
            (participant.kills + participant.assists) /
            Math.max(1, participant.deaths)
          ).toFixed(2),
          cs: participant.totalMinionsKilled + participant.neutralMinionsKilled,
          items: [
            participant.item0,
            participant.item1,
            participant.item2,
            participant.item3,
            participant.item4,
            participant.item5,
            participant.item6,
          ],
        };
      });

      matchHistory = await Promise.all(matchPromises);
      //console.log(`✅ Paso 5: Historial obtenido (${matchHistory.length} partidas).`);
    } catch (err) {
      console.error("⚠️ Error getting the match history:", err.message);
    }

    return {
      summoner: {
        level: summonerLevel,
        iconId: profileIconId,
        iconUrl: `https://ddragon.leagueoflegends.com/cdn/14.22.1/img/profileicon/${profileIconId}.png`,
        name: riotName,
        tag: riotTag,
      },
      rank: soloQ
        ? {
          tier: soloQ.tier,
          rank: soloQ.rank,
          lp: soloQ.leaguePoints,
          wins: soloQ.wins,
          losses: soloQ.losses,
          winrate: Math.round(
            (soloQ.wins / (soloQ.wins + soloQ.losses)) * 100
          ),
        }
        : null,
      topChampions: topChampions,
      matchHistory: matchHistory, // 👈 Incluimos el historial
    };
  } catch (error) {
    console.error(`❌ FATAL ERROR IN RIOT SERVICE: ${error.message}`);
    if (error.response) {
      console.error(`❌ URL: ${error.response.config.url}`);
      console.error(`❌ STATUS: ${error.response.status}`);
      console.error(`❌ ERROR MESSAGE: ${error.response.data.message}`);
    }
    throw error;
  }
}

//función auxiliar para obtener datos de la liga, summoner y stats para las cards de summoner
async function getSummonerByPuuid(gameName, tagLine) {
  return {};
}

//función auxiliar para obtener datos de la liga
async function getLeagueEntries(queue, tier, division) {
  return [];
}

//función auxiliar para obtener datos del summoner
async function getSummonerStatsByName(name) {
  return {};
}

module.exports = {
  getSummonerByPuuid,
  getLeagueEntries,
  getSummonerStatsByName,
  getFullPlayerStats,
};
