const mongoose = require("mongoose");

//esquema de la base de datos para los mensajes privados
const PrivateMessageSchema = new mongoose.Schema(
    {
        //conversación a la que pertenece el mensaje
        conversation: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "PrivateConversation",
            required: true,
            index: true,
        },
        //usuario que envía el mensaje
        sender: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
        //texto del mensaje
        text: {
            type: String,
            required: true,
            maxlength: 5000,
        },
        //estado de lectura del mensaje
        read: {
            type: Boolean,
            default: false,
        },
        //fecha de lectura
        readAt: {
            type: Date,
            default: null,
        },
        //indica si es un mensaje del sistema (ej: "Usuario eliminó el chat")
        isSystemMessage: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

//índice para búsquedas por conversación y fecha
PrivateMessageSchema.index({ conversation: 1, createdAt: -1 });

module.exports = mongoose.model("PrivateMessage", PrivateMessageSchema);

