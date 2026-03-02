const mongoose = require("mongoose");

//esquema de la base de datos para los mensajes de chat
const ChatMessageSchema = new mongoose.Schema(
    {
        //relación con la sala de chat (referencia al modelo ChatRoom)
        room: { 
            type: mongoose.Schema.Types.ObjectId, 
            ref: "ChatRoom", 
            index: true, 
            required: true 
        },
        //mantener el nombre de la sala como string para compatibilidad (denormalizado)
        roomName: { 
            type: String, 
            index: true, 
            required: true 
        },
        text: { type: String, required: true, maxlength: 5000 },
        //relación con usuario
        user: { type: mongoose.Schema.Types.ObjectId, ref: "User", index: true, default: null },
    },
    { timestamps: { createdAt: true, updatedAt: false } }
);

//índice compuesto para búsquedas por sala y fecha
ChatMessageSchema.index({ room: 1, createdAt: -1 });
ChatMessageSchema.index({ roomName: 1, createdAt: -1 });

module.exports = mongoose.model("ChatMessage", ChatMessageSchema);


