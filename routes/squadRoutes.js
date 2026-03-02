const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware.js");
const { optionalAuth } = require("../middlewares/authMiddleware.js");
const {
    getSquads,
    getSquadById,
    createSquad,
    updateSquad,
    joinSquad,
    leaveSquad,
    getUserSquad,
} = require("../controllers/indexController.js");

const router = express.Router();

//ruta pública para obtener todos los squads públicos
router.get("/", getSquads);

//ruta protegida para obtener el squad del usuario actual
router.get("/my-squad", authMiddleware, getUserSquad);

//ruta para obtener un squad por ID (pública, pero verifica membresía si está autenticado)
router.get("/:id", optionalAuth, getSquadById);

//rutas protegidas para gestionar squads
router.post("/", authMiddleware, createSquad);
router.patch("/:id", authMiddleware, updateSquad);
router.post("/:id/join", authMiddleware, joinSquad);
router.post("/:id/leave", authMiddleware, leaveSquad);

module.exports = router;

