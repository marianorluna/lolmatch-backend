const Session = require("../models/Session.js");

//obtener sesiones activas del usuario
const getActiveSessions = async (req, res) => {
  //req.user viene del middleware authMiddleware
  const userId = req.user._id;

  try {
    const sessions = await Session.find({ userId })
      .sort({ lastActivity: -1 })
      .limit(10)
      .lean();

    //formatear sesiones para el frontend
    const formattedSessions = sessions.map((session) => ({
      id: session._id.toString(),
      device: session.deviceInfo.device,
      browser: session.deviceInfo.browser,
      os: session.deviceInfo.os,
      ip: session.deviceInfo.ip,
      isCurrentSession: session.isCurrentSession,
      lastActivity: session.lastActivity,
      createdAt: session.createdAt,
    }));

    //status 200: ok
    res.status(200).json({ sessions: formattedSessions });
  } catch (err) {
    console.error("Error getting active sessions:", err);
    //status 500: server error
    res.status(500).json({ message: "Error getting active sessions ❌" });
  }
};

//cerrar una sesión específica
const deleteSession = async (req, res) => {
  //req.user viene del middleware authMiddleware
  const userId = req.user._id;
  const { sessionId } = req.params;

  try {
    const session = await Session.findOne({ _id: sessionId, userId });
    if (!session) {
      return res.status(404).json({ message: "Session not found" });
    }

    //no permitir cerrar la sesión actual
    if (session.isCurrentSession) {
      return res
        .status(400)
        .json({ message: "Cannot delete current session" });
    }

    await Session.deleteOne({ _id: sessionId });

    //status 200: ok
    res.status(200).json({ message: "Session closed successfully ✅" });
  } catch (err) {
    console.error("Error deleting session:", err);
    //status 500: server error
    res.status(500).json({ message: "Error deleting session ❌" });
  }
};

//cerrar todas las sesiones excepto la actual
const deleteAllOtherSessions = async (req, res) => {
  //req.user viene del middleware authMiddleware
  const userId = req.user._id;

  try {
    await Session.deleteMany({
      userId,
      isCurrentSession: false,
    });

    //status 200: ok
    res.status(200).json({
      message: "All other sessions closed successfully ✅",
    });
  } catch (err) {
    console.error("Error deleting all sessions:", err);
    //status 500: server error
    res.status(500).json({ message: "Error deleting sessions ❌" });
  }
};

module.exports = {
  getActiveSessions,
  deleteSession,
  deleteAllOtherSessions,
};

