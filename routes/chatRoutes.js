const express = require("express");
const authMiddleware = require("../middlewares/authMiddleware.js");
const {
    getRooms,
    getHistory,
    getOrCreateConversation,
    getConversations,
    getPrivateHistory,
    sendPrivateMessage,
    deleteConversation,
    initializeDefaultRooms,
} = require("../controllers/indexController.js");

function createChatRouter(io) {
    const router = express.Router();

    //ruta pública para obtener salas de chat
    router.get("/rooms", getRooms);

    //ruta pública para historial de salas públicas
    router.get("/history", getHistory);

    //ruta para inicializar salas por defecto (solo en desarrollo o con permisos de admin)
    router.post("/rooms/initialize", initializeDefaultRooms);

    //rutas protegidas para conversaciones privadas
    router.post("/conversation", authMiddleware, getOrCreateConversation);
    router.get("/conversations", authMiddleware, getConversations);
    router.get("/private/history", authMiddleware, getPrivateHistory);
    router.post("/private/send", authMiddleware, sendPrivateMessage);
    router.delete("/conversation", authMiddleware, (req, res) => deleteConversation(req, res, io));

    return router;
}

module.exports = createChatRouter;


