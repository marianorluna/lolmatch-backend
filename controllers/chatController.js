const ChatMessage = require("../models/ChatMessage.js");
const ChatRoom = require("../models/ChatRoom.js");
const PrivateConversation = require("../models/PrivateConversation.js");
const PrivateMessage = require("../models/PrivateMessage.js");

//obtener todas las salas de chat
async function getRooms(req, res) {
    try {
        const rooms = await ChatRoom.find({ status: "active" })
            .populate({
                path: "lastMessage",
                select: "text user createdAt",
                populate: {
                    path: "user",
                    select: "userName avatar",
                },
            })
            .sort({ lastMessageAt: -1 })
            .lean();

        const formatted = rooms.map((room) => ({
            id: String(room._id),
            name: room.name,
            region: room.region,
            description: room.description || "",
            memberCount: room.memberCount || 0,
            lastMessage: room.lastMessage
                ? {
                    text: room.lastMessage.text,
                    userName: room.lastMessage.user?.userName || null,
                    createdAt: room.lastMessage.createdAt,
                }
                : null,
            lastMessageAt: room.lastMessageAt,
            createdAt: room.createdAt,
        }));

        res.json(formatted);
    } catch (e) {
        console.error("Error in getRooms:", e);
        res.status(500).json({ error: "rooms_error" });
    }
}

//obtener el historial de mensajes de una sala de chat
//usado en ChatPanel.jsx
async function getHistory(req, res) {
    try {
        const roomName = req.query.room || "community";
        const limit = Math.min(parseInt(req.query.limit || "50", 10), 200);

        //buscar la sala por nombre
        const room = await ChatRoom.findOne({ name: roomName, status: "active" });
        if (!room) {
            return res.status(404).json({ error: "Room not found" });
        }

        //obtener los mensajes de la sala de chat con datos de usuario
        const docs = await ChatMessage.find({ room: room._id })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate({ path: "user", select: "userName avatar" })
            .lean();

        //mapear a la forma esperada por el cliente (userName / avatar sin denormalizar en DB)
        const mapped = docs.map((d) => ({
            id: String(d._id),
            room: d.roomName || roomName,
            text: d.text,
            user: d.user?._id,
            userName: d.user?.userName || null,
            avatar: d.user?.avatar || null,
            createdAt: d.createdAt,
        }));
        //devolver en orden cronológico
        res.json(mapped.reverse());
    } catch (e) {
        console.error("Error in getHistory:", e);
        res.status(500).json({ error: "history_error" });
    }
}

//obtener o crear una conversación privada entre dos usuarios
async function getOrCreateConversation(req, res) {
    try {
        const currentUserId = req.user._id;
        const { userId } = req.body;

        if (!userId) {
            return res.status(400).json({ error: "userId is required" });
        }

        if (userId === currentUserId.toString()) {
            return res.status(400).json({ error: "Cannot create conversation with yourself" });
        }

        //buscar o crear la conversación
        const conversation = await PrivateConversation.findOrCreateConversation(
            currentUserId,
            userId
        );

        //obtener el otro participante
        const otherParticipant = conversation.getOtherParticipant(currentUserId);

        res.json({
            conversationId: conversation._id,
            otherParticipant: {
                id: otherParticipant._id,
                userName: otherParticipant.userName,
                avatar: otherParticipant.avatar,
            },
            lastMessageAt: conversation.lastMessageAt,
            unreadCount: conversation.unreadCount.get(String(currentUserId)) || 0,
        });
    } catch (e) {
        console.error("Error in getOrCreateConversation:", e);
        res.status(500).json({ error: "conversation_error" });
    }
}

//obtener todas las conversaciones del usuario actual
async function getConversations(req, res) {
    try {
        const currentUserId = req.user._id;

        //obtener todas las conversaciones donde el usuario es participante
        //y filtrar las que el usuario ha eliminado (soft delete)
        const conversations = await PrivateConversation.find({
            participants: currentUserId,
            //excluir conversaciones eliminadas por el usuario actual
            deletedBy: { $ne: currentUserId },
        })
            .populate("participants", "userName avatar _id")
            .populate({
                path: "lastMessage",
                select: "text sender createdAt",
                populate: {
                    path: "sender",
                    select: "userName avatar _id",
                },
            })
            .sort({ lastMessageAt: -1 })
            .lean();

        //formatear las conversaciones
        const formatted = conversations
            .map((conv) => {
                const otherParticipant = conv.participants?.find(
                    (p) => p._id.toString() !== currentUserId.toString()
                );

                //si no hay otro participante, saltar esta conversación
                if (!otherParticipant) {
                    return null;
                }

                //obtener el contador de no leídos de forma segura
                let unreadCount = 0;
                if (conv.unreadCount && typeof conv.unreadCount.get === "function") {
                    unreadCount = conv.unreadCount.get(String(currentUserId)) || 0;
                } else if (conv.unreadCount && conv.unreadCount[String(currentUserId)]) {
                    //si es un objeto plano en lugar de Map
                    unreadCount = conv.unreadCount[String(currentUserId)] || 0;
                }

                return {
                    conversationId: String(conv._id),
                    otherParticipant: {
                        id: String(otherParticipant._id),
                        userName: otherParticipant.userName || "Unknown",
                        avatar: otherParticipant.avatar || null,
                    },
                    lastMessage: conv.lastMessage
                        ? {
                            text: conv.lastMessage.text || "",
                            senderId: conv.lastMessage.sender?._id ? String(conv.lastMessage.sender._id) : null,
                            senderName: conv.lastMessage.sender?.userName || null,
                            createdAt: conv.lastMessage.createdAt,
                        }
                        : null,
                    lastMessageAt: conv.lastMessageAt || conv.createdAt,
                    unreadCount: unreadCount,
                    createdAt: conv.createdAt,
                };
            })
            .filter((conv) => conv !== null); //filtrar conversaciones nulas

        res.json(formatted);
    } catch (e) {
        console.error("Error in getConversations:", e);
        console.error("Error stack:", e.stack);
        res.status(500).json({
            error: "conversations_error",
            message: e.message
        });
    }
}

//obtener el historial de mensajes de una conversación privada
async function getPrivateHistory(req, res) {
    try {
        const currentUserId = req.user._id;
        const { conversationId } = req.query;

        if (!conversationId) {
            return res.status(400).json({ error: "conversationId is required" });
        }

        //verificar que el usuario es participante de la conversación
        const conversation = await PrivateConversation.findById(conversationId);
        if (!conversation) {
            return res.status(404).json({ error: "Conversation not found" });
        }

        const isParticipant = conversation.participants.some(
            (p) => p.toString() === currentUserId.toString()
        );

        if (!isParticipant) {
            return res.status(403).json({ error: "Access denied" });
        }

        const limit = Math.min(parseInt(req.query.limit || "50", 10), 200);

        //obtener los mensajes de la conversación
        const messages = await PrivateMessage.find({ conversation: conversationId })
            .sort({ createdAt: -1 })
            .limit(limit)
            .populate({ path: "sender", select: "userName avatar" })
            .lean();

        //marcar mensajes como leídos
        await PrivateMessage.updateMany(
            {
                conversation: conversationId,
                sender: { $ne: currentUserId },
                read: false,
            },
            {
                read: true,
                readAt: new Date(),
            }
        );

        //actualizar contador de no leídos
        conversation.unreadCount.set(String(currentUserId), 0);
        await conversation.save();

        //formatear mensajes
        const formatted = messages
            .reverse()
            .map((msg) => ({
                id: String(msg._id),
                conversationId: String(msg.conversation),
                text: msg.text,
                sender: msg.sender?._id,
                senderName: msg.sender?.userName || null,
                senderAvatar: msg.sender?.avatar || null,
                read: msg.read,
                readAt: msg.readAt,
                isSystemMessage: msg.isSystemMessage || false,
                createdAt: msg.createdAt,
            }));

        res.json(formatted);
    } catch (e) {
        console.error("Error in getPrivateHistory:", e);
        res.status(500).json({ error: "private_history_error" });
    }
}

//enviar un mensaje privado
async function sendPrivateMessage(req, res) {
    try {
        const currentUserId = req.user._id;
        const { conversationId, text, recipientId } = req.body;

        if (!text || !text.trim()) {
            return res.status(400).json({ error: "text is required" });
        }

        let conversation;

        //si se proporciona conversationId, usar esa conversación
        if (conversationId) {
            conversation = await PrivateConversation.findById(conversationId);
            if (!conversation) {
                return res.status(404).json({ error: "Conversation not found" });
            }

            //verificar que el usuario es participante
            const isParticipant = conversation.participants.some(
                (p) => p.toString() === currentUserId.toString()
            );
            if (!isParticipant) {
                return res.status(403).json({ error: "Access denied" });
            }

            //si el usuario había eliminado esta conversación, restaurarla
            const userIdStr = String(currentUserId);
            const wasDeleted = conversation.deletedBy.some(
                (id) => String(id) === userIdStr
            );
            if (wasDeleted) {
                conversation.deletedBy = conversation.deletedBy.filter(
                    (id) => String(id) !== userIdStr
                );
                await conversation.save();
            }
        } else if (recipientId) {
            //si no hay conversationId pero hay recipientId, crear o obtener la conversación
            conversation = await PrivateConversation.findOrCreateConversation(
                currentUserId,
                recipientId
            );
        } else {
            return res.status(400).json({ error: "conversationId or recipientId is required" });
        }

        //crear el mensaje
        const message = await PrivateMessage.create({
            conversation: conversation._id,
            sender: currentUserId,
            text: text.trim(),
        });

        //poblar datos del remitente
        await message.populate({ path: "sender", select: "userName avatar" });

        //actualizar la conversación
        conversation.lastMessage = message._id;
        conversation.lastMessageAt = new Date();

        //incrementar contador de no leídos para el otro participante
        const otherParticipant = conversation.getOtherParticipant(currentUserId);
        const currentUnread = conversation.unreadCount.get(String(otherParticipant._id)) || 0;
        conversation.unreadCount.set(String(otherParticipant._id), currentUnread + 1);

        await conversation.save();

        //formatear respuesta
        const formatted = {
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

        res.json(formatted);
    } catch (e) {
        console.error("Error in sendPrivateMessage:", e);
        res.status(500).json({ error: "send_private_message_error" });
    }
}

//eliminar una conversación privada (soft delete - solo se elimina de la lista del usuario)
//la conversación y mensajes se eliminan definitivamente solo cuando ambos usuarios la eliminen
async function deleteConversation(req, res, io) {
    try {
        const currentUserId = req.user._id;
        const { conversationId } = req.body;

        if (!conversationId) {
            return res.status(400).json({ error: "conversation_id_required" });
        }

        //verificar que la conversación existe y el usuario es participante
        const conversation = await PrivateConversation.findOne({
            _id: conversationId,
            participants: currentUserId,
        }).populate("participants", "userName");

        if (!conversation) {
            return res.status(404).json({ error: "conversation_not_found" });
        }

        //verificar si el usuario ya eliminó esta conversación
        const userIdStr = String(currentUserId);
        const isAlreadyDeleted = conversation.deletedBy.some(
            (id) => String(id) === userIdStr
        );

        if (isAlreadyDeleted) {
            return res.json({
                success: true,
                message: "Conversation already deleted by this user",
            });
        }

        //obtener el otro participante antes de agregar a deletedBy
        const otherParticipant = conversation.getOtherParticipant(currentUserId);
        const currentUser = conversation.participants.find(
            (p) => String(p._id) === userIdStr
        );

        //verificar si la conversación tiene mensajes
        const messageCount = await PrivateMessage.countDocuments({
            conversation: conversationId,
        });
        const hasMessages = messageCount > 0;

        //agregar el usuario a la lista de usuarios que eliminaron la conversación
        conversation.deletedBy.push(currentUserId);
        await conversation.save();

        //recargar la conversación para obtener deletedBy actualizado
        const updatedConversation = await PrivateConversation.findById(conversationId);

        //verificar si ambos usuarios han eliminado la conversación (después de agregar a deletedBy)
        const participantIds = updatedConversation.participants.map(p => String(p._id || p));
        const deletedByIds = updatedConversation.deletedBy.map(d => String(d._id || d));
        const allParticipantsDeleted = participantIds.every(participantId =>
            deletedByIds.includes(participantId)
        );

        let deletedMessagesCount = 0;
        let permanentlyDeleted = false;

        //caso 1: conversación sin mensajes - eliminar inmediatamente (no crear mensaje del sistema)
        if (!hasMessages) {
            //eliminar la conversación definitivamente (no hay mensajes que eliminar)
            await PrivateConversation.findByIdAndDelete(conversationId);
            permanentlyDeleted = true;
        }
        //caso 2: ambos usuarios eliminaron la conversación - eliminar permanentemente
        else if (allParticipantsDeleted) {
            //eliminar todos los mensajes de la conversación
            const deleteMessagesResult = await PrivateMessage.deleteMany({
                conversation: conversationId,
            });
            deletedMessagesCount = deleteMessagesResult.deletedCount;

            //eliminar la conversación definitivamente
            await PrivateConversation.findByIdAndDelete(conversationId);
            permanentlyDeleted = true;
        }
        //caso 3: solo un usuario eliminó y hay mensajes - crear mensaje del sistema
        else if (otherParticipant) {
            const otherParticipantId = otherParticipant._id || otherParticipant;
            const systemMessage = await PrivateMessage.create({
                conversation: conversation._id,
                sender: currentUserId,
                text: `${currentUser?.userName || "The other user"} has deleted this chat, you will no longer receive messages.`,
                isSystemMessage: true,
            });

            //actualizar la conversación con el último mensaje
            conversation.lastMessage = systemMessage._id;
            conversation.lastMessageAt = new Date();
            await conversation.save();

            //emitir el mensaje del sistema al otro usuario vía socket
            if (io) {
                const formattedMessage = {
                    id: String(systemMessage._id),
                    conversationId: String(conversation._id),
                    text: systemMessage.text,
                    sender: currentUserId,
                    senderName: currentUser?.userName || "Sistema",
                    senderAvatar: null,
                    read: false,
                    isSystemMessage: true,
                    createdAt: systemMessage.createdAt,
                };

                //emitir al otro participante
                io.to(`user_${String(otherParticipantId)}`).emit("chat:private:new", formattedMessage);
            }
        }

        res.json({
            success: true,
            message: permanentlyDeleted
                ? "Conversation and all messages deleted permanently (both users deleted it)"
                : "Conversation removed from your list. It will be permanently deleted when the other user also deletes it.",
            deletedMessagesCount: permanentlyDeleted ? deletedMessagesCount : 0,
            permanentlyDeleted,
        });
    } catch (e) {
        console.error("Error in deleteConversation:", e);
        console.error("Error stack:", e.stack);
        res.status(500).json({ error: "delete_conversation_error", message: e.message });
    }
}

//inicializar salas de chat por defecto
async function initializeDefaultRooms(req, res) {
    try {
        const defaultRooms = [
            { name: "Champions Gamers", region: "EUW", description: "European West gaming community" },
            { name: "Summoners Leaders", region: "EUNE", description: "European Nordic & East community" },
            { name: "Player Legends", region: "LAN", description: "Latin America North community" },
            { name: "Global Strategy", region: "Global", description: "Global strategy discussions" },
            { name: "Team Tactics", region: "Global", description: "Team tactics and coordination" },
            { name: "Strategic Planning", region: "Global", description: "Strategic planning discussions" },
            { name: "community", region: "Global", description: "General community chat" },
        ];

        const createdRooms = [];
        const existingRooms = [];

        for (const roomData of defaultRooms) {
            const existingRoom = await ChatRoom.findOne({ name: roomData.name });
            if (existingRoom) {
                existingRooms.push(roomData.name);
            } else {
                const newRoom = await ChatRoom.create({
                    ...roomData,
                    status: "active",
                });
                createdRooms.push(newRoom.name);
            }
        }

        res.json({
            success: true,
            created: createdRooms,
            existing: existingRooms,
            message: `Created ${createdRooms.length} rooms, ${existingRooms.length} already existed`,
        });
    } catch (e) {
        console.error("Error initializing default rooms:", e);
        res.status(500).json({ error: "initialization_error", message: e.message });
    }
}

module.exports = {
    getRooms,
    getHistory,
    getOrCreateConversation,
    getConversations,
    getPrivateHistory,
    sendPrivateMessage,
    deleteConversation,
    initializeDefaultRooms,
};


