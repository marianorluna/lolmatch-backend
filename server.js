const express = require("express"); //permite crear un servidor express
const http = require("http"); //permite crear un servidor http
const cors = require("cors"); //permite que el backend se comunique con el frontend
const dotenv = require("dotenv"); //permite usar variables de entorno
dotenv.config(); //debe estar arriba de las rutas
const cookieParser = require("cookie-parser"); //permite parsear las cookies
const connectDB = require("./config/db.js"); //conexión a la base de datos
const authRouter = require("./routes/authRoutes.js"); //rutas de autenticación
const riotRouter = require("./routes/riotRoutes.js"); //rutas de Riot Games
const createChatRouter = require("./routes/chatRoutes.js"); //rutas de chat
const squadRouter = require("./routes/squadRoutes.js"); //rutas de squads
const { Server } = require("socket.io"); //permite crear un servidor socket.io
const { registerChatSocket } = require("./sockets/chatSocket.js"); //handlers de chat
const { registerNotificationSocket } = require("./sockets/notificationSocket.js"); //handlers de notificaciones
const profileRoutes = require("./routes/profileRoutes");

connectDB();

const app = express();
const server = http.createServer(app);

//array de dominios permitidos (útil cuando está en desarrollo y producción)
const allowedOrigins = [
  "http://localhost:5173",
  "https://lol-match.netlify.app",
];

//valida si un origin puede conectarse (lista explícita + subdominios de netlify.app)
const isOriginAllowed = (origin) => {
  //permitir requests sin origin (como Postman, mobile apps, o requests del mismo servidor)
  if (!origin) return true;

  //verificar si el origin está en la lista permitida
  if (allowedOrigins.indexOf(origin) !== -1) return true;

  //permitir subdominios de netlify.app para flexibilidad (previews, deploys, etc.)
  return origin.endsWith(".netlify.app");
};

//callback de CORS reutilizado por Express y Socket.io (una única fuente de verdad)
const corsOrigin = (origin, callback) => {
  if (isOriginAllowed(origin)) {
    callback(null, true);
  } else {
    callback(new Error("Not allowed by CORS"));
  }
};

//cors dinámico que acepta dominios dentro de allowedOrigins y sus subdominios
app.use(
  cors({
    origin: corsOrigin,
    credentials: true, //permite cookies entre backend y frontend
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

//parseo de json
app.use(express.json());

//parseo de cookies
app.use(cookieParser());

//permite ver archivo riot.txt en la raíz del proyecto
app.use(express.static(__dirname));

//socket.io básico para el chat con CORS dinámico
const io = new Server(server, {
  cors: {
    origin: corsOrigin,
    credentials: true
  },
  path: "/socket.io",
  transports: ["websocket", "polling"],
});

//rutas (chatRouter necesita io)
const chatRouter = createChatRouter(io);
app.use("/api/auth", authRouter);
app.use("/api/lol", riotRouter);
app.use("/api/profile", profileRoutes);







app.use("/api/chat", chatRouter);
app.use("/api/squads", squadRouter);

//puerto y host
const PORT = process.env.PORT || 5000;
const HOST = process.env.HOST || "localhost";

registerChatSocket(io);
registerNotificationSocket(io);

//exportar io para usarlo en los controladores
module.exports = { io };

//arranca el servidor
server.listen(PORT, "0.0.0.0", () =>
  console.log(`Server running on ${HOST}:${PORT} 🚀`)

);


