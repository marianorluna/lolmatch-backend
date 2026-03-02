const mongoose = require("mongoose");

//esquema de la base de datos para las conversaciones privadas entre usuarios
const PrivateConversationSchema = new mongoose.Schema(
    {
        //participantes de la conversación (array de 2 usuarios)
        participants: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "User",
                required: true,
            },
        ],
        //último mensaje para mostrar preview
        lastMessage: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PrivateMessage",
            default: null,
        },
        //fecha del último mensaje para ordenar
        lastMessageAt: {
            type: Date,
            default: Date.now,
        },
        //contador de mensajes no leídos por participante
        unreadCount: {
            type: Map,
            of: Number,
            default: new Map(),
        },
        //usuarios que han eliminado esta conversación (soft delete)
        deletedBy: {
            type: [mongoose.Schema.Types.ObjectId],
            ref: "User",
            default: [],
        },
    },
    { timestamps: { createdAt: true, updatedAt: true } }
);

//índice compuesto para búsquedas rápidas de conversaciones entre dos usuarios
PrivateConversationSchema.index({ participants: 1 });

//índice para ordenar por último mensaje
PrivateConversationSchema.index({ lastMessageAt: -1 });

//método estático para encontrar o crear una conversación entre dos usuarios
PrivateConversationSchema.statics.findOrCreateConversation = async function (userId1, userId2) {
    //asegurar que los IDs están en orden consistente para evitar duplicados
    const sortedIds = [userId1, userId2].sort();

    let conversation = await this.findOne({
        participants: { $all: sortedIds, $size: 2 },
    }).populate("participants", "userName avatar");

    if (!conversation) {
        conversation = await this.create({
            participants: sortedIds,
            unreadCount: new Map([
                [String(userId1), 0],
                [String(userId2), 0],
            ]),
        });
        await conversation.populate("participants", "userName avatar");
    }

    return conversation;
};

//método para obtener el otro participante
PrivateConversationSchema.methods.getOtherParticipant = function (currentUserId) {
    return this.participants.find(
        (p) => p._id.toString() !== currentUserId.toString()
    );
};

module.exports = mongoose.model("PrivateConversation", PrivateConversationSchema);

