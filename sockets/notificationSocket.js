//registro de socket de notificaciones
//usado en server.js
function registerNotificationSocket(io) {
  io.on("connection", (socket) => {
    //unirse a la sala del usuario para recibir notificaciones
    socket.on("join_user_room", (userId, callback) => {
      if (!userId) {
        if (callback) callback({ success: false, error: "userId is required" });
        return;
      }

      const room = `user_${userId}`;
      socket.join(room);

      //verificar si el socket está en la sala
      const roomSockets = io.sockets.adapter.rooms.get(room);
      const socketCount = roomSockets ? roomSockets.size : 0;

      if (callback) {
        callback({ success: true, room, socketCount });
      }
    });

    //salir de la sala del usuario
    socket.on("leave_user_room", (userId) => {
      if (!userId) return;
      const room = `user_${userId}`;
      socket.leave(room);
    });

    //unirse a la sala del squad para recibir actualizaciones
    socket.on("join_squad_room", (squadId, callback) => {
      if (!squadId) {
        if (callback) callback({ success: false, error: "squadId is required" });
        return;
      }

      const room = `squad_${squadId}`;
      socket.join(room);

      if (callback) {
        callback({ success: true, room });
      }
    });

    //salir de la sala del squad
    socket.on("leave_squad_room", (squadId) => {
      if (!squadId) return;
      const room = `squad_${squadId}`;
      socket.leave(room);
    });

    socket.on("disconnect", () => {
      //manejar desconexión
    });
  });
}

//función auxiliar para emitir notificación a un usuario específico
//io se obtiene de server.js
function emitSquadNotification(userId, notificationData) {
  try {
    const { io } = require("../server.js");
    if (!io) {
      return;
    }

    const room = `user_${userId}`;

    //verificar cuántos sockets están en la sala
    const roomSockets = io.sockets.adapter.rooms.get(room);
    const socketCount = roomSockets ? roomSockets.size : 0;

    //emitir notificación a todos los sockets en la sala
    io.to(room).emit("squad:new_notification", notificationData);
  } catch (err) {
    //manejar errores silenciosamente
  }
}

//función auxiliar para emitir cuando una solicitud es aceptada
//ahora recibe notificationData completa (similar a emitSquadNotification)
function emitSquadAccepted(userId, notificationData) {
  try {
    const { io } = require("../server.js");
    if (!io) {
      return;
    }
    const room = `user_${userId}`;
    io.to(room).emit("squad:accepted", notificationData);
  } catch (err) {
    //manejar errores silenciosamente
  }
}

//función auxiliar para emitir cuando una solicitud es rechazada
function emitSquadRejected(userId, notificationData) {
  try {
    const { io } = require("../server.js");
    if (!io) {
      return;
    }
    const room = `user_${userId}`;
    io.to(room).emit("squad:rejected", notificationData);
  } catch (err) {
    //manejar errores silenciosamente
  }
}

module.exports = {
  registerNotificationSocket,
  emitSquadNotification,
  emitSquadAccepted,
  emitSquadRejected,
};
