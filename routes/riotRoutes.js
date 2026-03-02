const express = require("express");
const riotRouter = express.Router();
const authMiddleware = require("../middlewares/authMiddleware.js");
const {
  getLeaderboard,
  getSummonerStats,
  getSummoner,
  getStats,
} = require("../controllers/indexController.js");

//ruta para obtener estadísticas de LOL del usuario autenticado [ap]
riotRouter.get("/stats", authMiddleware, getStats);

//rutas para obtener datos de la liga, summoner y stats
riotRouter.get("/league/:queue/:tier/:division", getLeaderboard);
riotRouter.get("/summoner", getSummonerStats);
riotRouter.get("/:gameName/:tagLine", getSummoner);

module.exports = riotRouter;