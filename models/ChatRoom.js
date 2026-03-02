const mongoose = require("mongoose");

//esquema de la base de datos para las salas de chat públicas
const ChatRoomSchema = new mongoose.Schema(
  {
    //nombre único de la sala (usado como identificador)
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    //región o categoría de la sala
    region: {
      type: String,
      required: true,
      trim: true,
    },
    //descripción opcional de la sala
    description: {
      type: String,
      trim: true,
      default: "",
    },
    //estado de la sala (active, archived, etc.)
    status: {
      type: String,
      enum: ["active", "archived", "hidden"],
      default: "active",
    },
    //contador de miembros (se actualiza dinámicamente)
    memberCount: {
      type: Number,
      default: 0,
    },
    //último mensaje para mostrar preview
    lastMessage: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "ChatMessage",
      default: null,
    },
    //fecha del último mensaje para ordenar
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: { createdAt: true, updatedAt: true } }
);

//índice para ordenar por último mensaje
ChatRoomSchema.index({ lastMessageAt: -1 });

//índice compuesto para filtrar salas activas
ChatRoomSchema.index({ status: 1, lastMessageAt: -1 });

module.exports = mongoose.model("ChatRoom", ChatRoomSchema);

