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

const normalizeGameName = (value) =>
  typeof value === "string" ? value.trim() : "";

const normalizeTagLine = (value) =>
  typeof value === "string" ? value.trim().replace(/^#/, "") : "";

/** Cache-Aside: misma búsqueda (región + Riot ID) evita reencadenar Riot durante el TTL. */
function fullPlayerStatsCacheKey(regionUpper, gameName, tagLine) {
  return `riot:full:${regionUpper}:${gameName.toLowerCase()}:${tagLine.toLowerCase()}`;
}

function cloneCachedPlayerStats(snapshot) {
  try {
    return structuredClone(snapshot);
  } catch (_e) {
    return JSON.parse(JSON.stringify(snapshot));
  }
}

function getPlayerStatsCacheTtlSec() {
  const raw = process.env.RIOT_PLAYER_CACHE_TTL_SEC;
  if (raw === "" || raw === undefined) return 180;
  const n = Number.parseInt(String(raw).trim(), 10);
  if (!Number.isFinite(n) || n < 0) return 180;
  return n;
}

function isApexTier(tier) {
  return tier === "MASTER" || tier === "GRANDMASTER" || tier === "CHALLENGER";
}

async function getDDragonLatestVersion() {
  const ck = "ddragon_latest_version";
  const cached = cache.get(ck);
  if (cached) return cached;
  const res = await axios.get(
    "https://ddragon.leagueoflegends.com/api/versions.json"
  );
  const version = Array.isArray(res.data) ? res.data[0] : "15.1.1";
  cache.set(ck, version, 21_600);
  return version;
}

async function getChampionIdToName(ddVersion) {
  const ck = `ddragon_champ_map_${ddVersion}`;
  const hit = cache.get(ck);
  if (hit) return hit;
  const res = await axios.get(
    `https://ddragon.leagueoflegends.com/cdn/${ddVersion}/data/es_ES/champion.json`
  );
  const map = {};
  for (const c of Object.values(res.data.data)) {
    map[Number.parseInt(c.key, 10)] = c.name;
  }
  cache.set(ck, map, 86_400);
  return map;
}

function ddProfileIconUrl(ddVersion, iconId) {
  return `https://ddragon.leagueoflegends.com/cdn/${ddVersion}/img/profileicon/${iconId}.png`;
}

function pickRankedEntry(entries) {
  if (!Array.isArray(entries) || entries.length === 0) return null;
  const solo = entries.find((q) => q.queueType === "RANKED_SOLO_5x5" && q.tier);
  const flex = entries.find((q) => q.queueType === "RANKED_FLEX_SR" && q.tier);
  const anyLolRanked = entries.find(
    (q) =>
      q.tier &&
      typeof q.queueType === "string" &&
      q.queueType.startsWith("RANKED_") &&
      !q.queueType.startsWith("RANKED_TFT")
  );
  return solo || flex || anyLolRanked || null;
}

/** Forma compartida rank → perfil y tarjetas */
function entryToRankShape(entry) {
  if (!entry?.tier) return null;
  const wins = Number(entry.wins) || 0;
  const losses = Number(entry.losses) || 0;
  const played = wins + losses;
  const winrate =
    played > 0 ? Math.round((wins / played) * 100) : null;
  const division =
    entry.rank != null && String(entry.rank).trim()
      ? String(entry.rank).trim()
      : "";
  const queueLabel =
    entry.queueType === "RANKED_SOLO_5x5"
      ? "Solo/Duo"
      : entry.queueType === "RANKED_FLEX_SR"
        ? "Flex"
        : entry.queueType === "RANKED_TREELINE_3x3"
          ? "3v3 (hist.)"
          : entry.queueType
            ? entry.queueType.replace(/^RANKED_/u, "").replace(/_/gu, " ")
            : "Ranked";

  let displayLine = entry.tier;
  if (isApexTier(entry.tier)) {
    displayLine = division
      ? `${entry.tier} ${division}`.trim()
      : `${entry.tier} · ${entry.leaguePoints ?? 0} LP`;
  } else if (division) {
    displayLine = `${entry.tier} ${division}`.trim();
  }

  const rankForProfile = division || (isApexTier(entry.tier) ? "I" : "");

  return {
    tier: entry.tier,
    rank: rankForProfile,
    lp: entry.leaguePoints,
    wins,
    losses,
    winrate,
    queueType: entry.queueType,
    queueLabel,
    displayLine,
  };
}

async function formatTopMasteryLine(topChampions, ddVersion) {
  if (!topChampions?.length) return "Sin datos";
  const top = topChampions[0];
  try {
    const idMap = await getChampionIdToName(ddVersion);
    const champName =
      idMap[top.championId] ?? `Campeón ${top.championId}`;
    const pts =
      typeof top.championPoints === "number"
        ? top.championPoints.toLocaleString("es-ES")
        : String(top.championPoints);
    return `${champName} · ${pts} pts`;
  } catch (_e) {
    return `${top.championId} · ${top.championPoints} pts`;
  }
}

/** Formato esperado por SummonerCard.jsx */
function mapFullStatsToSummonerCard(fullStats) {
  const rankBlock = fullStats.rank;
  const summ = fullStats.summoner;

  let tierCombined = "Unranked";
  let queueType = "Sin cola rankeada";
  let rankBadge = "Sin clasificar";
  let tierBadge = "—";

  if (rankBlock?.tier) {
    tierCombined =
      rankBlock.displayLine ??
      `${rankBlock.tier} ${rankBlock.rank ?? ""}`.trim();
    queueType = rankBlock.queueLabel || "Ranked";
    rankBadge = rankBlock.tier;
    tierBadge = isApexTier(rankBlock.tier)
      ? `${rankBlock.lp ?? 0} LP`
      : (rankBlock.rank && String(rankBlock.rank).trim()) || "—";
  }

  const riotId =
    summ.tag != null ? `${summ.name}#${summ.tag}` : summ.name || "";

  return {
    summonerName: riotId,
    summonerLevel: summ.level,
    profileIconUrl: summ.iconUrl,
    tier: tierCombined,
    rankBadge,
    tierBadge,
    queueType,
    /** Honor no está en la API pública de producto; aquí va el mayor puntaje de maestría. */
    masteryTop: fullStats.topMasteryLine ?? "—",
  };
}

//función para obtener los datos de la liga, summoner y stats para el perfil
async function getFullPlayerStats(gameName, tagLine, region = "EUW") {
  const g = normalizeGameName(gameName);
  const tag = normalizeTagLine(tagLine);
  const regionKey =
    typeof region === "string" && region.trim()
      ? region.trim().toUpperCase()
      : "EUW";

  const playerTtl = getPlayerStatsCacheTtlSec();
  if (g && tag && playerTtl > 0) {
    const ck = fullPlayerStatsCacheKey(regionKey, g, tag);
    const cached = cache.get(ck);
    if (cached != null) {
      return cloneCachedPlayerStats(cached);
    }
  }

  const { platformUrl, routingUrl } = getUrls(region);

  try {
    const ddVersion = await getDDragonLatestVersion();

    //1. obtener el puuid del jugador
    const accountUrl = `${routingUrl}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(
      g
    )}/${encodeURIComponent(tag)}`;
    const accountRes = await axios.get(accountUrl, { headers: getHeaders() });
    const { puuid, gameName: riotName, tagLine: riotTag } = accountRes.data;

    //2. obtener los datos básicos del summoner
    const summonerUrl = `${platformUrl}/lol/summoner/v4/summoners/by-puuid/${puuid}`;
    const summonerRes = await axios.get(summonerUrl, { headers: getHeaders() });

    const encryptedSummonerId = summonerRes.data.id;
    const profileIconId = summonerRes.data.profileIconId;
    const summonerLevel = summonerRes.data.summonerLevel;

    //3. ligas clasificadas (Riot recomienda by-puuid; fallback legacy by-summoner)
    let leagueRows = [];
    const fetchLeagueRows = async () => {
      if (!puuid) return [];
      const byPuuidUrl = `${platformUrl}/lol/league/v4/entries/by-puuid/${encodeURIComponent(
        puuid
      )}`;
      const leagueRes = await axios.get(byPuuidUrl, { headers: getHeaders() });
      return Array.isArray(leagueRes.data) ? leagueRes.data : [];
    };
    try {
      leagueRows = await fetchLeagueRows();
    } catch (errPuuid) {
      console.warn(
        "⚠️ Ligas (by-puuid):",
        errPuuid.response?.status ?? errPuuid.message,
        errPuuid.response?.data?.message ?? ""
      );
      if (encryptedSummonerId) {
        try {
          const leagueUrl = `${platformUrl}/lol/league/v4/entries/by-summoner/${encryptedSummonerId}`;
          const leagueRes = await axios.get(leagueUrl, {
            headers: getHeaders(),
          });
          leagueRows = Array.isArray(leagueRes.data) ? leagueRes.data : [];
        } catch (errSum) {
          console.warn(
            "⚠️ Ligas (by-summoner):",
            errSum.response?.status ?? errSum.message,
            errSum.response?.data?.message ?? ""
          );
        }
      }
    }
    const rankShape = entryToRankShape(pickRankedEntry(leagueRows));

    //4. maestrías (top champions)
    let topChampions = [];
    try {
      const masteryUrl = `${platformUrl}/lol/champion-mastery/v4/champion-masteries/by-puuid/${puuid}/top?count=3`;
      const masteryRes = await axios.get(masteryUrl, { headers: getHeaders() });
      topChampions = masteryRes.data;
    } catch (err) {
      console.warn("⚠️ Maestrías:", err.response?.status ?? err.message);
    }

    const topMasteryLine = await formatTopMasteryLine(topChampions, ddVersion);

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

    const result = {
      summoner: {
        level: summonerLevel,
        iconId: profileIconId,
        iconUrl: ddProfileIconUrl(ddVersion, profileIconId),
        name: riotName,
        tag: riotTag,
      },
      rank: rankShape,
      topChampions,
      topMasteryLine,
      matchHistory,
    };

    if (g && tag && playerTtl > 0) {
      cache.set(
        fullPlayerStatsCacheKey(regionKey, g, tag),
        result,
        playerTtl
      );
    }

    return result;
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

//detalle corto por Riot ID (ruta REST /:gameName/:tagLine)
async function getSummonerByPuuid(gameName, tagLine, region = "EUW") {
  const g = normalizeGameName(gameName);
  const tag = normalizeTagLine(tagLine);
  if (!g || !tag) {
    const err = new Error("gameName y tagLine son obligatorios.");
    err.statusCode = 400;
    throw err;
  }

  const { platformUrl, routingUrl } = getUrls(region);
  const accountUrl = `${routingUrl}/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(
    g
  )}/${encodeURIComponent(tag)}`;

  const accountRes = await axios.get(accountUrl, { headers: getHeaders() });
  const { puuid, gameName: riotName, tagLine: riotTag } = accountRes.data;

  const summonerUrl = `${platformUrl}/lol/summoner/v4/summoners/by-puuid/${puuid}`;
  const summonerRes = await axios.get(summonerUrl, { headers: getHeaders() });
  const d = summonerRes.data;

  return {
    name: riotName,
    tagLine: riotTag,
    riotId: riotTag ? `${riotName}#${riotTag}` : riotName,
    summonerLevel: d.summonerLevel,
    puuid,
    id: d.id,
    profileIconId: d.profileIconId,
  };
}

//función auxiliar para obtener datos de la liga
async function getLeagueEntries(queue, tier, division) {
  return [];
}

//stats compactas para SummonerCard (usa Riot ID; el nombre legacy quedó obsoleto en la API oficial)
async function getSummonerStatsByName(summonerName, gameName, tagLine, region = "EUW") {
  if (summonerName && (!gameName || !tagLine)) {
    const err = new Error(
      "Las búsquedas requieren Riot ID: Game Name + Tag Line (el nombre legacy del invocador ya no está soportado)."
    );
    err.statusCode = 400;
    throw err;
  }

  const g = normalizeGameName(gameName);
  const tag = normalizeTagLine(tagLine);

  if (!g || !tag) {
    const err = new Error("Faltan gameName o tagLine válidos.");
    err.statusCode = 400;
    throw err;
  }

  const full = await getFullPlayerStats(g, tag, region);
  return mapFullStatsToSummonerCard(full);
}

module.exports = {
  getSummonerByPuuid,
  getLeagueEntries,
  getSummonerStatsByName,
  getFullPlayerStats,
};
