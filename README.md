# 🚀 Backend - LoL Match API

API REST desarrollada con Node.js y Express que proporciona los servicios backend para la plataforma **LoL Match**, una aplicación web fullstack desarrollada como proyecto TFM que permite a los jugadores de League of Legends gestionar sus perfiles, formar equipos (squads), buscar partidas y conectarse con la comunidad.

Incluye autenticación, gestión de usuarios, integración con Riot Games API, sistema de chat en tiempo real y gestión de equipos.

## 📋 Tabla de Contenidos

- [Características](#-características)
- [Tecnologías](#-tecnologías)
- [Estructura del Proyecto](#-estructura-del-proyecto)
- [Instalación](#-instalación)
- [Configuración](#-configuración)
- [API Endpoints](#-api-endpoints)
- [Modelos de Datos](#-modelos-de-datos)
- [Servicios](#-servicios)
- [Scripts](#-scripts)
- [Documentación](#-documentación)

## ✨ Características

- **Autenticación JWT**: Sistema seguro con tokens almacenados en cookies httpOnly
- **Gestión de Sesiones**: Control de sesiones activas y dispositivos
- **Autenticación de Dos Factores**: 2FA mediante códigos por email
- **Integración Riot Games API**: Sincronización de perfiles y estadísticas de League of Legends
- **Chat en Tiempo Real**: WebSockets con Socket.io para mensajería instantánea
- **Gestión de Squads**: Creación y administración de equipos
- **Sistema de Matches**: Búsqueda y gestión de partidas con otros jugadores
- **Almacenamiento de Imágenes**: Integración con Cloudinary
- **Validación de Datos**: Esquemas con Zod y express-validator
- **Caché**: Sistema de caché para optimizar llamadas a APIs externas

## 🛠 Tecnologías

### Core

- **Node.js** - Runtime de JavaScript
- **Express 5** - Framework web
- **MongoDB** - Base de datos NoSQL
- **Mongoose** - ODM para MongoDB

### Autenticación y Seguridad

- **jsonwebtoken** - Tokens JWT
- **bcrypt** - Hash de contraseñas
- **cookie-parser** - Manejo de cookies

### Comunicación

- **Socket.io** - WebSockets para tiempo real
- **nodemailer** - Cliente SMTP para el envío de correos (Zoho Mail en local)
- **axios** - Cliente HTTP (Riot API y API HTTPS de Brevo en producción)

### Validación y Utilidades

- **Zod** - Validación de esquemas
- **express-validator** - Validación de requests
- **moment-timezone** - Manejo de zonas horarias

### Servicios Externos

- **Cloudinary** - Almacenamiento de imágenes
- **multer** + **multer-storage-cloudinary** - Upload de archivos
- **axios** - Cliente HTTP para APIs externas
- **node-cache** - Sistema de caché en memoria

## 📁 Estructura del Proyecto

```
TFM-rojo-backend/
├── config/                    # Configuraciones
│   ├── db.js                 # Conexión a MongoDB
│   └── cloudinary.js         # Configuración de Cloudinary
│
├── controllers/              # Lógica de negocio
│   ├── authController.js     # Autenticación y sesiones
│   ├── profileController.js  # Gestión de perfiles
│   ├── riotController.js     # Integración Riot API
│   ├── chatController.js     # Gestión de chat
│   ├── squadController.js    # Gestión de squads
│   ├── matchController.js    # Sistema de matches
│   └── ...
│
├── dtos/                     # Data Transfer Objects
│   ├── userDTO.js            # DTOs de usuario
│   ├── lolProfileDTO.js      # DTOs de perfil LOL
│   └── ...
│
├── middlewares/              # Middlewares personalizados
│   ├── authMiddleware.js     # Verificación de JWT
│   ├── hashPassword.js       # Hash de contraseñas
│   └── timezoneMiddleware.js # Manejo de timezones
│
├── models/                   # Esquemas de Mongoose
│   ├── User.js               # Modelo de usuario
│   ├── Session.js             # Modelo de sesiones
│   ├── Squad.js               # Modelo de squads
│   ├── ChatRoom.js            # Modelo de salas de chat
│   └── ...
│
├── routes/                    # Definición de rutas
│   ├── authRoutes.js          # Rutas de autenticación
│   ├── profileRoutes.js       # Rutas de perfil
│   ├── riotRoutes.js          # Rutas de Riot API
│   ├── chatRoutes.js          # Rutas de chat
│   └── squadRoutes.js         # Rutas de squads
│
├── schemas/                   # Esquemas de validación
│   ├── authSchemas.js         # Validación de auth
│   └── profileSchemas.js      # Validación de perfiles
│
├── services/                  # Servicios externos
│   └── riotApi.js             # Cliente de Riot Games API
│
├── sockets/                   # Handlers de WebSocket
│   ├── chatSocket.js          # Eventos de chat
│   └── notificationSocket.js  # Eventos de notificaciones
│
├── utils/                     # Utilidades
│   ├── __tests__/             # Tests unitarios
│   │   ├── cache.test.js      # Tests del sistema de caché
│   │   ├── generateToken.test.js # Tests de generación JWT
│   │   ├── generateTwoFactorCode.test.js # Tests de códigos 2FA
│   │   └── timezoneUtils.test.js # Tests de utilidades timezone
│   ├── generateToken.js       # Generación de JWT
│   ├── cache.js               # Sistema de caché
│   ├── generateTwoFactorCode.js # Generación de códigos 2FA
│   ├── timezoneUtils.js       # Utilidades de timezone
│   ├── sendVerificationEmail.js
│   └── ...
│
├── scripts/                   # Scripts de utilidad
│   ├── seedUsers.js           # Poblar usuarios de prueba
│   ├── seedSquads.js           # Poblar squads
│   ├── seedChatRooms.js        # Poblar salas de chat
│   └── fixEnumFields.js        # Migración: limpiar campos enum vacíos
│
├── jest.config.js             # Configuración de Jest
└── server.js                  # Punto de entrada
```

## ⚙️ Instalación

### Prerrequisitos

- Node.js v18 o superior
- MongoDB (local o MongoDB Atlas)
- Cuenta de Riot Games API (opcional)
- Cuenta de Cloudinary
- Cuenta de correo en Zoho Mail con App Password (para emails)

### Pasos de Instalación

1. **Clonar el repositorio**

```bash
git clone https://github.com/FSD0625ESP/TFM-rojo-backend.git
cd TFM-rojo-backend
```

2. **Instalar dependencias**

```bash
npm install
```

3. **Configurar variables de entorno**

Crear archivo `.env` en la raíz del proyecto:

```env
# Base de datos
MONGO_URI_LOCAL=mongodb://localhost:27017/lol-match
MONGO_URI_ATLAS=mongodb+srv://user:password@cluster.mongodb.net/lol-match

# JWT
JWT_SECRET=tu_secret_key_super_segura_minimo_32_caracteres
JWT_EXPIRES_IN=7d

# Servidor
PORT=5000
HOST=localhost
NODE_ENV=development

# Riot Games API
RIOT_API_KEY=RGAPI-tu_api_key_aqui

# Cloudinary
CLOUDINARY_CLOUD_NAME=tu_cloud_name
CLOUDINARY_API_KEY=tu_api_key
CLOUDINARY_API_SECRET=tu_api_secret

# Transporte de correo
# MAIL_TRANSPORT: 'smtp' | 'brevo' (por defecto: brevo en producción, smtp en el resto)
# MAIL_TRANSPORT=brevo

# Zoho Mail SMTP (transporte en desarrollo/local)
SMTP_HOST=smtp.zoho.eu
SMTP_PORT=465
SMTP_SECURE=true
SMTP_USER=lolmatch@tudominio.com
SMTP_PASS=tu_app_password_de_zoho
MAIL_FROM_NAME=LOL MATCH
MAIL_FROM_EMAIL=lolmatch@tudominio.com

# Brevo API HTTPS (transporte en producción: Render free bloquea puertos SMTP)
BREVO_API_KEY=tu_brevo_api_key

# Frontend URLs (para CORS y enlaces en correos)
FRONTEND_URL_DEV=http://localhost:5173
FRONTEND_URL_PROD=https://lol-match.netlify.app
```

4. **Iniciar el servidor**

Modo desarrollo (con nodemon):

```bash
npm run dev
```

Modo producción:

```bash
npm start
```

El servidor estará disponible en `http://localhost:5000`

## 🔧 Configuración

### Base de Datos

La aplicación soporta MongoDB local y MongoDB Atlas. La conexión se selecciona automáticamente según `NODE_ENV`:

- `development`: Usa `MONGO_URI_LOCAL`
- `production`: Usa `MONGO_URI_ATLAS`

### CORS

El backend implementa **CORS dinámico** que permite dominios explícitos y sus subdominios:

```javascript
// Dominios permitidos explícitamente
const allowedOrigins = [
  "http://localhost:5173",
  "https://lol-match.netlify.app"
];

// CORS dinámico que también permite:
// - Cualquier subdominio de .netlify.app
```

**Características:**
- Dominio único: Funciona con el frontend en lol-match.netlify.app
- Subdominios automáticos: Permite cualquier subdominio de netlify.app
- Credentials habilitados: Permite cookies entre dominios (sameSite: "None")
- Configuración flexible: Fácil agregar nuevos dominios sin modificar la lógica

### WebSockets

Socket.io está configurado en el mismo servidor HTTP. Los eventos se registran en:

- `sockets/chatSocket.js` - Chat en tiempo real
- `sockets/notificationSocket.js` - Notificaciones push

## 📡 API Endpoints

### Autenticación (`/api/auth`)

| Método | Endpoint                  | Descripción                | Autenticado |
| ------ | ------------------------- | -------------------------- | ----------- |
| POST   | `/register`               | Registro de nuevo usuario  | No          |
| POST   | `/login`                  | Inicio de sesión           | No          |
| POST   | `/logout`                 | Cerrar sesión              | Sí          |
| GET    | `/check-session`          | Verificar sesión activa    | Sí          |
| POST   | `/forgot-password`        | Solicitar recuperación     | No          |
| POST   | `/reset-password`         | Restablecer contraseña     | No          |
| GET    | `/verify-account/:token`  | Verificar cuenta           | No          |
| POST   | `/change-password`        | Cambiar contraseña         | Sí          |
| POST   | `/2fa/enable`             | Habilitar 2FA              | Sí          |
| POST   | `/2fa/verify`             | Verificar código 2FA       | No          |
| POST   | `/2fa/disable`            | Deshabilitar 2FA           | Sí          |
| GET    | `/sessions`               | Obtener sesiones activas   | Sí          |
| DELETE | `/sessions/:id`           | Eliminar sesión            | Sí          |
| DELETE | `/sessions/others`        | Eliminar otras sesiones    | Sí          |
| POST   | `/export-data`            | Exportar datos del usuario | Sí          |
| POST   | `/delete-account/request` | Solicitar eliminación      | Sí          |
| POST   | `/delete-account/confirm` | Confirmar eliminación      | No          |

### Perfil (`/api/profile`)

| Método | Endpoint   | Descripción            | Autenticado |
| ------ | ---------- | ---------------------- | ----------- |
| GET    | `/me`      | Obtener perfil actual  | Sí          |
| PUT    | `/me`      | Actualizar perfil      | Sí          |
| GET    | `/:userId` | Obtener perfil público | No          |
| POST   | `/avatar`  | Subir avatar           | Sí          |
| DELETE | `/avatar`  | Eliminar avatar        | Sí          |

### Riot Games (`/api/lol`)

| Método | Endpoint                      | Descripción                | Autenticado |
| ------ | ----------------------------- | -------------------------- | ----------- |
| POST   | `/sync-profile`               | Sincronizar perfil de Riot | Sí          |
| GET    | `/profile/:gameName/:tagLine` | Obtener perfil público     | No          |
| GET    | `/matches/:puuid`             | Obtener partidas recientes | No          |
| GET    | `/stats/:puuid`               | Obtener estadísticas       | No          |

### Chat (`/api/chat`)

| Método | Endpoint                  | Descripción                      | Autenticado |
| ------ | ------------------------- | -------------------------------- | ----------- |
| GET    | `/rooms`                  | Obtener salas de chat            | Sí          |
| GET    | `/rooms/:roomId`          | Obtener sala específica          | Sí          |
| GET    | `/rooms/:roomId/messages` | Obtener mensajes                 | Sí          |
| POST   | `/rooms/:roomId/messages` | Enviar mensaje                   | Sí          |
| GET    | `/conversations`          | Obtener conversaciones privadas  | Sí          |
| GET    | `/conversations/:userId`  | Obtener conversación con usuario | Sí          |
| POST   | `/conversations/:userId`  | Enviar mensaje privado           | Sí          |

### Squads (`/api/squads`)

| Método | Endpoint                    | Descripción      | Autenticado |
| ------ | --------------------------- | ---------------- | ----------- |
| GET    | `/`                         | Listar squads    | No          |
| POST   | `/`                         | Crear squad      | Sí          |
| GET    | `/:squadId`                 | Obtener squad    | No          |
| PUT    | `/:squadId`                 | Actualizar squad | Sí          |
| DELETE | `/:squadId`                 | Eliminar squad   | Sí          |
| POST   | `/:squadId/join`            | Unirse a squad   | Sí          |
| POST   | `/:squadId/leave`           | Abandonar squad  | Sí          |
| POST   | `/:squadId/invite`          | Invitar usuario  | Sí          |
| DELETE | `/:squadId/members/:userId` | Eliminar miembro | Sí          |

### Matches (`/api/auth/matches`)

| Método | Endpoint          | Descripción                  | Autenticado |
| ------ | ----------------- | ---------------------------- | ----------- |
| GET    | `/`               | Obtener matches del usuario  | Sí          |
| POST   | `/add`            | Agregar match                | Sí          |
| DELETE | `/remove/:userId` | Eliminar match               | Sí          |
| GET    | `/available`      | Obtener usuarios disponibles | Sí          |

## 🗄 Modelos de Datos

### User

Modelo principal que almacena información de usuarios:

- **Credenciales**: `userName`, `email`, `password`
- **Perfil**: `avatar`, `role`, `isVerified`
- **LOL Profile**: `lolProfile` (objeto con datos de Riot Games)
- **Squad**: Referencia al squad al que pertenece
- **Matches**: Array de referencias a otros usuarios
- **Preferencias**: Configuraciones de notificaciones y privacidad
- **Seguridad**: `twoFactorEnabled`, `passwordChangedAt`, `sessions`

### Squad

Modelo para equipos de jugadores:

- **Información**: `name`, `description`, `avatar`
- **Miembros**: Array de referencias a usuarios
- **Configuración**: `maxMembers`, `isPublic`, `requirements`

### Session

Modelo para gestionar sesiones activas:

- **Usuario**: Referencia al usuario
- **Token**: Hash del token JWT
- **Device**: Información del dispositivo
- **IP**: Dirección IP
- **Última actividad**: Timestamp

### ChatRoom

Modelo para salas de chat públicas:

- **Información**: `name`, `description`
- **Mensajes**: Array de mensajes con referencias a usuarios

### PrivateConversation

Modelo para conversaciones privadas:

- **Participantes**: Array de dos usuarios
- **Mensajes**: Array de mensajes privados

## 🔌 Servicios

### Riot Games API Service

El servicio `services/riotApi.js` proporciona métodos para interactuar con la API de Riot Games:

- `getFullPlayerStats(gameName, tagLine, region)` - Obtiene estadísticas completas
- `getPlayerMatches(puuid, region, count)` - Obtiene partidas recientes
- `getPlayerRank(puuid, region)` - Obtiene información de ranking

**Regiones soportadas**: EUW, EUNE, NA, KR, JP, BR, LAS, LAN, OCE, RU, TR

### Cache Service

Sistema de caché en memoria para optimizar llamadas a APIs externas:

- Caché de perfiles de Riot Games (TTL: 5 minutos)
- Caché de partidas (TTL: 2 minutos)
- Caché de rankings (TTL: 10 minutos)

## 📜 Scripts

### Desarrollo

```bash
npm run dev          # Inicia servidor con nodemon
```

### Producción

```bash
npm start            # Inicia servidor en producción
```

### Seeders

```bash
npm run seed:users           # Crea usuarios de prueba
npm run seed:squads          # Crea squads de ejemplo
npm run seed:chat-rooms      # Crea salas de chat
npm run seed:delete-test-users  # Elimina usuarios de prueba
```

### Migraciones

```bash
node scripts/fixEnumFields.js  # Limpia campos enum vacíos en la base de datos
```

**Nota**: El script `fixEnumFields.js` corrige usuarios que tengan cadenas vacías (`""`) en los campos `lolProfile.tier` o `lolProfile.ranks`, convirtiéndolas a `null`. Esto previene errores de validación de Mongoose cuando estos campos tienen restricciones de enum.

## 🔒 Seguridad

### Autenticación

- Tokens JWT almacenados en cookies httpOnly
- Verificación de tokens en cada request protegido
- Expiración automática de tokens
- Gestión de sesiones múltiples

### Validación

- Validación de entrada con Zod y express-validator
- Sanitización de datos de usuario
- Validación de tipos y formatos

### Seguridad de Contraseñas

- Hash con bcrypt (10 rounds)
- Validación de fortaleza de contraseña
- Historial de cambios de contraseña

## 🧪 Testing

El proyecto incluye una suite de tests unitarios con **Jest** para verificar la funcionalidad de utilidades y servicios.

### Tests Unitarios (Jest)

Los tests unitarios están ubicados en carpetas `__tests__` junto a los módulos que prueban.

**Estructura de tests:**

```
utils/
├── __tests__/
│   ├── cache.test.js                    # Tests del sistema de caché
│   ├── generateToken.test.js            # Tests de generación de tokens JWT
│   ├── generateTwoFactorCode.test.js     # Tests de códigos 2FA
│   └── timezoneUtils.test.js            # Tests de utilidades de timezone
└── cache.js
```

**Tests implementados:**

- ✅ **Cache**: Sistema de caché (get/set, diferentes tipos de datos)
- ✅ **generateToken**: Generación y validación de tokens JWT
- ✅ **generateTwoFactorCode**: Generación de códigos de 6 dígitos para 2FA
- ✅ **timezoneUtils**: Conversión de timezones, validación, listado de zonas horarias

**Ejecutar tests:**

```bash
# Ejecutar todos los tests
npm test

# Modo watch (ejecuta tests al cambiar archivos)
npm run test:watch

# Con reporte de cobertura
npm run test:coverage
```

**Configuración:**

- Archivo de configuración: `jest.config.js`
- Entorno: `node` (sin DOM)
- Timeout: 10 segundos por test
- Cobertura: Genera reportes en `coverage/`

**Ejemplo de test:**

```javascript
// utils/__tests__/cache.test.js
const { get, set } = require('../cache');

describe('Cache', () => {
  it('should set and get a value', () => {
    set('key', 'value');
    expect(get('key')).toBe('value');
  });
});
```

### Testing Manual de Endpoints

Para probar los endpoints manualmente, puedes usar herramientas como:

- **Postman** - Colección de requests
- **Thunder Client** - Extensión de VS Code
- **curl** - Línea de comandos

Ejemplo de login:

```bash
curl -X POST http://localhost:5000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"password123"}' \
  -c cookies.txt
```

### Cobertura de Tests

La configuración actual incluye tests mínimos para utilidades críticas. Se recomienda expandir la cobertura según las necesidades:

- **Controllers**: Lógica de negocio y manejo de errores
- **Services**: Integraciones con APIs externas (Riot API)
- **Middlewares**: Autenticación, validación, timezone
- **Models**: Validaciones y hooks de Mongoose

## 🐛 Troubleshooting

### Error de conexión a MongoDB

- Verificar que MongoDB esté corriendo
- Revisar `MONGO_URI_LOCAL` o `MONGO_URI_ATLAS`
- Verificar credenciales de Atlas si es el caso

### Error de CORS

- Verificar que el frontend esté en `allowedOrigins` o sea un subdominio permitido
- Revisar configuración de CORS dinámico en `server.js`
- Verificar que `credentials: true` esté habilitado en el frontend
- Comprobar que las cookies tengan `sameSite: "None"` y `secure: true` en producción

### Error de Riot API

- Verificar que `RIOT_API_KEY` esté configurada
- Comprobar límites de rate limit de la API
- Verificar que el formato de la key sea correcto

## 📝 Notas Adicionales

- El servidor escucha en `0.0.0.0` para permitir conexiones desde la red local
- Los archivos estáticos (como `riot.txt`) se sirven desde la raíz
- Socket.io está disponible en el path `/socket.io`

## 🔑 Funcionalidades Clave del Proyecto

### Autenticación y Seguridad

- Registro con verificación de email
- Login con JWT y cookies httpOnly
- Recuperación de contraseña
- Autenticación de dos factores (2FA)
- Gestión de sesiones activas

### Integración con Riot Games

- Sincronización de perfil de invocador
- Estadísticas de partidas clasificatorias
- Historial de partidas recientes
- Información de ranking y ligas

### Comunicación

- Chat en tiempo real por WebSockets
- Notificaciones push
- Mensajes privados entre usuarios

### Gestión de Equipos

- Creación y gestión de squads
- Invitaciones a equipos
- Perfiles de squad con estadísticas agregadas

## 📚 Documentación

Para más información sobre la arquitectura del sistema, consulta:

- [ARCHITECTURE.md](./ARCHITECTURE.md) - Arquitectura completa del sistema, patrones de diseño y flujos de datos
- [CONTRIBUTING.md](./CONTRIBUTING.md) - Guía de contribución y estándares de código

## 🧑‍💻 Autores

- **Aimón Pérez**
- **José Hernández**
- **Mariano Luna** - [GitHub](https://github.com/marianorluna)

## 📄 Licencia

Este proyecto está bajo la licencia MIT.
