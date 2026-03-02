const mongoose = require("mongoose");
const hashPassword = require("../middlewares/hashPassword.js");
const timezoneMiddleware = require("../middlewares/timezoneMiddleware.js");

const userSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      required: true,
      trim: true,
      unique: true,
      lowercase: true,
      match: /^[a-zA-Z0-9_-]+$/,
      minlength: 3,
      maxlength: 30,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: true,
      trim: true,
      //select: false, //para que no se muestre el password en las consultas
    },
    role: {
      type: String,
      enum: ["user", "moderator", "admin"],
      default: "user",
    },
    avatar: {
      type: String,
      trim: true,
      default:
        "https://res.cloudinary.com/dotrj7xbo/image/upload/v1762420706/default-avatar.png",
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    verifiedAt: {
      type: Date,
    },
    passwordChangedAt: {
      type: Date,
    },
    //campos para los DTOs
    //preferences: configuración personal del usuario
    //opciones que afectan la experiencia del usuario en la app
    preferences: {
      theme: { type: String, enum: ["dark", "light"], default: "dark" },
      isPremium: { type: Boolean, default: false },
      isVisible: { type: Boolean, default: true },
      accountStatus: {
        type: String,
        enum: [
          "active",
          "inactive",
          "pending",
          "deleted",
          "banned",
          "suspended",
        ],
        default: "active",
      },
      timezone: { type: String, default: "Europe/Madrid" },
    },
    notifications: {
      emailNotification: { type: Boolean, default: true },
      pushNotification: { type: Boolean, default: true },
      marketingNotification: { type: Boolean, default: true },
      weeklyNotification: { type: Boolean, default: true },
      securityNotification: { type: Boolean, default: true },
    },
    //campos de seguridad: autenticación de dos factores (2FA)
    security: {
      isTwoFactorEnabled: {
        type: Boolean,
        default: false,
      },
      twoFactorCode: {
        type: String,
        default: null,
      },
      twoFactorCodeExpires: {
        type: Date,
        default: null,
      },
      isLoginNotification: {
        type: Boolean,
        default: false,
      },
    },
    //address: ubicación geográfica
    //útil para estadísticas regionales, emparejamientos o personalización
    address: {
      city: { type: String, default: "" },
      country: { type: String, default: "" },
    },
    //contact: canales de comunicación
    //permite conectar jugadores o recibir soporte
    contact: {
      name: { type: String, default: "" },
      lastname: { type: String, default: "" },
      phone: { type: String, default: "" },
      discord: { type: String, default: "" },
      hobbies: { type: String, default: "" }, // ✅ nuevo campo
    },
    //stats: estadísticas personales del jugadores
    //refleja el rendimiento y perfil competitivo del usuario
    lolStats: {
      champion: { type: String, default: null },
      winRate: { type: String, default: null },
      matchesPlayed: { type: String, default: null },
      kills: { type: String, default: null },
      deaths: { type: String, default: null },
      assists: { type: String, default: null },
    },
    //lolProfile: perfil de jugador de lol
    //contiene la información del perfil personal en el lol
    lolProfile: {
      gameName: { type: String, default: "" },
      tagLine: { type: String, default: "" },
      region: {
        type: String,
        enum: [
          "EUW",
          "EUNE",
          "NA",
          "LAN",
          "LAS",
          "KR",
          "JP",
          "OCE",
          "BR",
          "TR",
          "RU",
        ],
        required: false,
        default: "EUW",
      },
      roleLol: {
        type: String,
        enum: ["Top", "Jungle", "Mid", "ADC", "Support"],
        required: false,
        default: function () {
          const roles = ["Top", "Jungle", "Mid", "ADC", "Support"];
          return roles[Math.floor(Math.random() * roles.length)]; //asignar un rol aleatorio al usuario
        },
      },
      tier: {
        type: String,
        enum: ["I", "II", "III", "IV"],
        required: false,
        default: null,
      },
      ranks: {
        type: String,
        enum: [
          "Challenger",
          "Grandmaster",
          "Master",
          "Diamond",
          "Emerald",
          "Platinum",
          "Gold",
          "Silver",
          "Bronze",
          "Iron",
        ],
        required: false,
        default: null,
      },
      queue: {
        type: String,
        enum: ["Ranked Solo/Duo", "Ranked Flex 5v5"],
        required: false,
        default: null,
      },
      honor: {
        type: String,
        enum: ["Honor 1", "Honor 2", "Honor 3", "Honor 4", "Honor 5"],
        required: false,
        default: "Honor 3",
      },
      //mySquad: array de miembros del squad con su rol y fecha de agregado
      mySquad: [
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
          addedAt: { type: Date, default: Date.now },
        },
      ],
    },
    //squadNotifications: notificaciones relacionadas con solicitudes de squad
    squadNotifications: [
      {
        fromUserId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        type: {
          type: String,
          enum: [
            "squad_invitation",
            "squad_accepted",
            "squad_rejected",
            "squad_left",
            "squad_deleted",
            "squad_joined",
          ],
          required: true,
        },
        status: {
          type: String,
          enum: ["pending", "accepted", "rejected", "read"],
          default: "pending",
        },
        createdAt: { type: Date, default: Date.now },
        readAt: { type: Date, default: null },
      },
    ],
    //matches: lista de usuarios que el usuario ha agregado como matches
    //solo guardamos el userId y la fecha, los datos se obtienen con populate
    matches: [
      {
        userId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "User",
          required: true,
        },
        addedAt: { type: Date, default: Date.now },
      },
    ],
    // ✅ Nuevo objeto para información personal extendida
    profile: {
      bio: { type: String, default: "" }, // descripción personal
    },
  },
  {
    timestamps: true, //crea los campos createdAt y updatedAt
    collection: "users", //es el nombre de la collection en la base de datos
  }
);

hashPassword(userSchema);
timezoneMiddleware(userSchema);

//middleware para limpiar campos enum vacíos antes de la validación
//previene errores de validación cuando se intenta guardar cadenas vacías en campos enum
userSchema.pre("save", function (next) {
  //si lolProfile existe, limpiar tier y ranks si son cadenas vacías
  if (this.lolProfile) {
    if (this.lolProfile.tier === "") {
      this.lolProfile.tier = null;
    }
    if (this.lolProfile.ranks === "") {
      this.lolProfile.ranks = null;
    }
  }
  next();
});

module.exports = mongoose.model("User", userSchema);
