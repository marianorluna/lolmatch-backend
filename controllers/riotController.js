const {
  getSummonerByPuuid,
  getLeagueEntries,
  getSummonerStatsByName,
  getFullPlayerStats,
} = require("../services/riotApi.js");
const User = require("../models/User.js");

//usado en SummonerDataFetch.jsx
//función controladora que se encarga de procesar la petición del summoner
async function getSummoner(req, res) {
  //extracción de los dos parámetros de la URL
  const { gameName, tagLine } = req.params;

  if (!gameName || !tagLine) {
    //no debería pasar si la ruta está bien definida,
    //pero es una buena verificación de seguridad
    return res
      .status(400)
      .json({ error: "Faltan parámetros de Riot ID (nombre o etiqueta)." });
  }

  try {
    //llamada a la función de servicio
    const data = await getSummonerByPuuid(gameName, tagLine);

    //respuesta exitosa
    return res.status(200).json(data);
  } catch (err) {
    //manejo de errores (axios)
    console.error("Error al consultar Riot API:", err.message);

    //extraer el estado de error de axios si está disponible, sino usar 500
    const statusCode = err.response ? err.response.status : 500;

    return res.status(statusCode).json({
      error: "Error al consultar Riot API",
      details: err.message,
    });
  }
}

//usado en LeagueLeaderboard.jsx
//maneja la ruta /api/riot/league/:queue/:tier/:division
async function getLeaderboard(req, res) {
  // Extracción de los tres parámetros de la URL
  const { queue, tier, division } = req.params;

  if (!queue || !tier || !division) {
    return res
      .status(400)
      .json({ error: "Faltan parámetros de liga (queue, tier, o division)." });
  }

  try {
    // Llamada a la función de servicio
    const players = await getLeagueEntries(queue, tier, division);

    //console.log("---->SUMMONER NAME:", players[0].summonerName);

    // Devolver la lista de jugadores
    return res.status(200).json(players);
  } catch (err) {
    console.error("Error al consultar lista de liga Riot API:", err.message);

    // Manejo de errores de Axios
    const statusCode = err.response ? err.response.status : 500;

    return res.status(statusCode).json({
      error: "Error al obtener la lista de clasificación.",
      details: err.message,
    });
  }
}

//usado en SummonerCard.jsx y riotService.js
async function getSummonerStats(req, res) {
  const { summonerName, gameName, tagLine } = req.query;

  if (!summonerName && (!gameName || !tagLine)) {
    return res.status(400).json({
      error: "Falta el nombre del invocador o Riot ID (gameName + tagLine).",
    });
  }

  try {
    const data = await getSummonerStatsByName(summonerName, gameName, tagLine);
    return res.status(200).json(data);
  } catch (err) {
    console.error("Error al obtener datos del invocador:", err.message);
    return res.status(500).json({
      error: "Error al consultar Riot API",
      details: err.message,
    });
  }
}

//usado en ProfileCard.jsx
//ruta para obtener estadísticas de LOL del usuario autenticado
async function getStats(req, res) {
  try {
    const userId = req.user._id;
    const user = await User.findById(userId);

    //validación de datos
    if (!user || !user.lolProfile?.gameName || !user.lolProfile?.tagLine) {
      return res
        .status(400)
        .json({ message: "Missing GameName and TagLine in profile" });
    }

    const { gameName, tagLine, region } = user.lolProfile;

    //aqui está el cambio clave: pasamos la región a la función
    //si el usuario no tiene región, pasamos "EUW" por defecto
    const regionToSend = region || "EUW";

    //console.log(`🔍 Buscando stats para: ${gameName}#${tagLine} en región [${regionToSend}]`);

    const stats = await getFullPlayerStats(gameName, tagLine, regionToSend);

    res.json(stats);
  } catch (error) {
    //manejo de errores limpio
    const status = error.response?.status || 500;
    const message =
      error.response?.data?.status?.message ||
      error.message ||
      "Internal error Riot API";

    //console.error("❌ Error final en ruta:", message);

    if (status === 404)
      return res
        .status(404)
        .json({ message: "User not found (Check GameName and Region)" });
    if (status === 403)
      return res.status(403).json({ message: "API Key expired" });

    res.status(status).json({ message });
  }
}

module.exports = {
  getSummoner,
  getLeaderboard,
  getSummonerStats,
  getStats,
};
