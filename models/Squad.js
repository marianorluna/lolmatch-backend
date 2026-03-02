const mongoose = require("mongoose");

//esquema de la base de datos para los squads
const SquadSchema = new mongoose.Schema(
    {
        //nombre del squad (editable por cualquier integrante)
        name: {
            type: String,
            required: true,
            trim: true,
            maxlength: 100,
            unique: true,
        },
        //descripción del squad (editable por cualquier integrante)
        description: {
            type: String,
            trim: true,
            maxlength: 500,
            default: "",
        },
        //miembros del squad (máximo 5, cada uno con un rol distinto)
        members: [
            {
                userId: {
                    type: mongoose.Schema.Types.ObjectId,
                    ref: "User",
                    required: true,
                },
                role: {
                    type: String,
                    enum: ["Top", "Jungle", "Mid", "ADC", "Support"],
                    required: true,
                },
                joinedAt: {
                    type: Date,
                    default: Date.now,
                },
            },
        ],
        //usuario que creó el squad
        createdBy: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        //si el squad es público o privado
        isPublic: {
            type: Boolean,
            default: true,
        },
    },
    {
        timestamps: true, //crea los campos createdAt y updatedAt
        collection: "squads",
    }
);

//validación personalizada: máximo 5 miembros
SquadSchema.pre("save", function (next) {
    if (this.members.length > 5) {
        return next(new Error("Un squad no puede tener más de 5 miembros"));
    }
    next();
});

//validación personalizada: roles únicos
SquadSchema.pre("save", function (next) {
    const roles = this.members.map((member) => member.role);
    const uniqueRoles = [...new Set(roles)];
    if (roles.length !== uniqueRoles.length) {
        return next(new Error("Cada miembro debe tener un rol único"));
    }
    next();
});

//índice para filtrar squads públicos
SquadSchema.index({ isPublic: 1, createdAt: -1 });

//índice para buscar por miembros
SquadSchema.index({ "members.userId": 1 });

module.exports = mongoose.model("Squad", SquadSchema);

