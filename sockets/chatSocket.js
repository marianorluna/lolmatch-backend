const mongoose = require("mongoose");
const ChatMessage = require("../models/ChatMessage.js");
const ChatRoom = require("../models/ChatRoom.js");
const PrivateConversation = require("../models/PrivateConversation.js");
const PrivateMessage = require("../models/PrivateMessage.js");
const User = require("../models/User.js");

//mapa de salas -> Set de socket.id para rastrear usuarios conectados
const roomUsers = new Map();

//mapa de userId -> Set de socket.id para rastrear usuarios conectados
const connectedUsers = new Map();

//helper: emitir conteo de usuarios en una sala (broadcast global)
function emitRoomCount(io, room) {
  const count = roomUsers.get(room)?.size || 0;
  //emitir a todos los clientes conectados, no solo a la sala
  io.emit("room:count", { room, count });
}

//helper: verificar si un usuario está conectado
function isUserConnected(userId) {
  const sockets = connectedUsers.get(String(userId));
  return sockets && sockets.size > 0;
}

//helper: emitir estado de conexión de un usuario a sus conversaciones
async function emitUserConnectionStatus(io, userId, isConnected) {
  try {
    //buscar todas las conversaciones donde este usuario participa
    const conversations = await PrivateConversation.find({
      participants: userId,
    }).lean();

    //notificar a todos los participantes de las conversaciones
    conversations.forEach((conv) => {
      conv.participants.forEach((participantId) => {
        const participantIdStr = String(participantId);
        //no notificar al mismo usuario
        if (participantIdStr !== String(userId)) {
          io.to(`user_${participantIdStr}`).emit("user:connection_status", {
            userId: String(userId),
            isConnected,
          });
        }
      });
    });
  } catch (error) {
    console.error("Error emitting user connection status:", error);
  }
}

//registrar el socket de chat
//usado en server.js
function registerChatSocket(io) {
  io.on("connection", (socket) => {
    console.log("💎 [socket] connected:", socket.id);

    //variable para almacenar el userId asociado a este socket
    let socketUserId = null;

    //registrar usuario cuando se une a su sala de usuario
    socket.on("register_user", (userId) => {
      if (!userId) return;
      socketUserId = String(userId);

      //unirse a la sala del usuario
      socket.join(`user_${socketUserId}`);

      //agregar socket al mapa de usuarios conectados
      if (!connectedUsers.has(socketUserId)) {
        connectedUsers.set(socketUserId, new Set());
      }
      connectedUsers.get(socketUserId).add(socket.id);

      //emitir estado de conexión a otros usuarios que puedan estar interesados
      emitUserConnectionStatus(io, socketUserId, true);

      console.log(`[socket] User ${socketUserId} registered, socket: ${socket.id}`);
    });

    //solicitar estado de conexión de un usuario
    socket.on("user:check_status", (userId, ack) => {
      if (!userId) {
        if (ack) ack({ isConnected: false });
        return;
      }
      const isConnected = isUserConnected(userId);
      if (ack) ack({ userId: String(userId), isConnected });
    });

    //solicitar conteo de una sala sin unirse
    socket.on("room:get-count", (room, ack) => {
      if (typeof room !== "string" || !room) return;
      const count = roomUsers.get(room)?.size || 0;
      if (ack) ack({ room, count });
    });

    //unirse a una sala
    socket.on("room:join", async (room) => {
      if (typeof room !== "string" || !room) return;
      socket.join(room);
      //rastrear usuario en la sala
      if (!roomUsers.has(room)) roomUsers.set(room, new Set());
      roomUsers.get(room).add(socket.id);
      
      //actualizar contador de miembros en la BD
      try {
        const chatRoom = await ChatRoom.findOne({ name: room, status: "active" });
        if (chatRoom) {
          //el contador se actualiza dinámicamente desde roomUsers, pero podemos guardarlo
          const currentCount = roomUsers.get(room)?.size || 0;
          chatRoom.memberCount = currentCount;
          await chatRoom.save();
        }
      } catch (error) {
        console.error("[socket] Error updating room member count:", error);
      }
      
      //emitir conteo actualizado
      emitRoomCount(io, room);
    });

    //salir de una sala
    socket.on("room:leave", async (room) => {
      if (typeof room !== "string" || !room) return;
      socket.leave(room);
      //remover usuario de la sala
      const users = roomUsers.get(room);
      if (users) {
        users.delete(socket.id);
        if (users.size === 0) {
          roomUsers.delete(room);
        }
        
        //actualizar contador de miembros en la BD
        try {
          const chatRoom = await ChatRoom.findOne({ name: room, status: "active" });
          if (chatRoom) {
            const currentCount = roomUsers.get(room)?.size || 0;
            chatRoom.memberCount = currentCount;
            await chatRoom.save();
          }
        } catch (error) {
          console.error("[socket] Error updating room member count:", error);
        }
        
        //emitir conteo actualizado
        emitRoomCount(io, room);
      }
    });

    //recibir y distribuir mensajes
    //usado en ChatPanel.jsx
    socket.on("chat:send", async (payload, ack) => {
      try {
        const { text, room, user } = payload || {};
        if (typeof text !== "string" || !text.trim()) {
          return ack && ack({ ok: false, error: "invalid_text" });
        }
        const targetRoomName =
          typeof room === "string" && room ? room : "community";
        if (mongoose.connection.readyState !== 1) {
          console.error(
            "[socket] mongo not connected. readyState:",
            mongoose.connection.readyState
          );
          return ack && ack({ ok: false, error: "mongo_not_connected" });
        }
        console.log(
          "[socket] chat:send to",
          targetRoomName,
          "by",
          socket.id,
          "text:",
          text.trim()
        );
        
        //buscar o crear la sala
        let chatRoom = await ChatRoom.findOne({ name: targetRoomName, status: "active" });
        if (!chatRoom) {
          //crear la sala si no existe
          chatRoom = await ChatRoom.create({
            name: targetRoomName,
            region: "Global",
            description: "",
            status: "active",
          });
        }
        
        let userId = user?.id || user?._id || null;
        if (userId) {
          try {
            const u = await User.findById(userId).lean();
            if (u) {
              userId = u._id;
            }
          } catch { }
        }
        
        //crear el mensaje con referencia a la sala
        let doc = await ChatMessage.create({
          room: chatRoom._id,
          roomName: targetRoomName,
          text: text.trim(),
          user: userId,
        });
        
        //actualizar la sala con el último mensaje
        chatRoom.lastMessage = doc._id;
        chatRoom.lastMessageAt = new Date();
        await chatRoom.save();
        
        //poblar user para emitir username/avatar sin denormalizar en DB
        doc = await doc.populate({ path: "user", select: "userName avatar" });
        const msg = {
          id: String(doc._id),
          room: targetRoomName,
          text: doc.text,
          user: doc.user?._id,
          userName: doc.user?.userName || null,
          avatar: doc.user?.avatar || null,
          createdAt: doc.createdAt,
        };
        io.to(targetRoomName).emit("chat:new", msg);
        ack && ack({ ok: true, id: msg.id });
      } catch (e) {
        console.error("[socket] chat:send error:", e);
        ack && ack({ ok: false, error: "send_failed" });
      }
    });

    //enviar mensaje privado
    socket.on("chat:private:send", async (payload, ack) => {
      try {
        const { text, conversationId, recipientId, user } = payload || {};
        if (typeof text !== "string" || !text.trim()) {
          return ack && ack({ ok: false, error: "invalid_text" });
        }

        if (mongoose.connection.readyState !== 1) {
          console.error(
            "[socket] mongo not connected. readyState:",
            mongoose.connection.readyState
          );
          return ack && ack({ ok: false, error: "mongo_not_connected" });
        }

        let userId = user?.id || user?._id || null;
        if (userId) {
          try {
            const u = await User.findById(userId).lean();
            if (u) {
              userId = u._id;
            }
          } catch { }
        }

        let conversation;

        //si se proporciona conversationId, usar esa conversación
        if (conversationId) {
          conversation = await PrivateConversation.findById(conversationId);
          if (!conversation) {
            return ack && ack({ ok: false, error: "conversation_not_found" });
          }

          //verificar que el usuario es participante
          const isParticipant = conversation.participants.some(
            (p) => p.toString() === userId.toString()
          );
          if (!isParticipant) {
            return ack && ack({ ok: false, error: "access_denied" });
          }
        } else if (recipientId) {
          //si no hay conversationId pero hay recipientId, crear o obtener la conversación
          conversation = await PrivateConversation.findOrCreateConversation(
            userId,
            recipientId
          );
        } else {
          return ack && ack({ ok: false, error: "conversationId_or_recipientId_required" });
        }

        //crear el mensaje
        const message = await PrivateMessage.create({
          conversation: conversation._id,
          sender: userId,
          text: text.trim(),
        });

        //poblar datos del remitente
        await message.populate({ path: "sender", select: "userName avatar" });

        //actualizar la conversación
        conversation.lastMessage = message._id;
        conversation.lastMessageAt = new Date();

        //incrementar contador de no leídos para el otro participante
        const otherParticipant = conversation.getOtherParticipant(userId);
        const currentUnread = conversation.unreadCount.get(String(otherParticipant._id)) || 0;
        conversation.unreadCount.set(String(otherParticipant._id), currentUnread + 1);

        await conversation.save();

        //formatear mensaje para emitir
        const msg = {
          id: String(message._id),
          conversationId: String(conversation._id),
          text: message.text,
          sender: message.sender._id,
          senderName: message.sender.userName,
          senderAvatar: message.sender.avatar,
          read: message.read,
          isSystemMessage: message.isSystemMessage || false,
          createdAt: message.createdAt,
        };

        //emitir a ambos participantes usando sus IDs como rooms
        const participantIds = conversation.participants.map((p) => String(p._id));
        participantIds.forEach((participantId) => {
          io.to(`user_${participantId}`).emit("chat:private:new", msg);
        });

        ack && ack({ ok: true, id: msg.id, conversationId: msg.conversationId });
      } catch (e) {
        console.error("[socket] chat:private:send error:", e);
        ack && ack({ ok: false, error: "send_private_failed" });
      }
    });

    socket.on("disconnect", (reason) => {
      console.log("[socket] disconnected:", socket.id, reason);

      //remover usuario del mapa de usuarios conectados
      if (socketUserId) {
        const userSockets = connectedUsers.get(socketUserId);
        if (userSockets) {
          userSockets.delete(socket.id);
          if (userSockets.size === 0) {
            connectedUsers.delete(socketUserId);
            //emitir que el usuario se desconectó
            emitUserConnectionStatus(io, socketUserId, false);
          }
        }
      }

      //remover de todas las salas
      for (const [room, users] of roomUsers.entries()) {
        if (users.has(socket.id)) {
          users.delete(socket.id);
          if (users.size === 0) {
            roomUsers.delete(room);
          } else {
            emitRoomCount(io, room);
          }
        }
      }
    });
  });
}

module.exports = { registerChatSocket };
