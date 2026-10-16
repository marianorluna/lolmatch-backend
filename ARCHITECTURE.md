# 🏗 Arquitectura del Sistema - LoL Match

Documentación técnica que describe la arquitectura, patrones de diseño y componentes principales del sistema LoL Match.

## 📋 Tabla de Contenidos

- [Arquitectura General](#-arquitectura-general)
- [Backend Architecture](#-backend-architecture)
- [Frontend Architecture](#-frontend-architecture)
- [Flujo de Datos](#-flujo-de-datos)
- [Patrones de Diseño](#-patrones-de-diseño)
- [Componentes Clave](#-componentes-clave)
- [Integraciones](#-integraciones)
- [Testing](#-testing)

## 🏛 Arquitectura General

LoL Match sigue una arquitectura **cliente-servidor** con separación clara entre frontend y backend:

```
┌─────────────────┐         ┌─────────────────┐         ┌─────────────────┐
│                 │         │                 │         │                 │
│    Frontend     │◄───────►│    Backend      │◄───────►│   MongoDB       │
│   (React/Vite)  │  HTTP   │  (Node/Express) │  ODM    │   (Database)    │
│                 │         │                 │         │                 │
└─────────────────┘         └─────────────────┘         └─────────────────┘
       │                            │                            │
       │                            │                            │
       │                            ▼                            │
       │                   ┌─────────────────┐                   │
       │                   │   Socket.io     │                   │
       │                   │  (WebSockets)   │                   │
       │                   └─────────────────┘                   │
       │                                                         │
       ▼                                                         ▼
┌─────────────────┐                                     ┌─────────────────┐
│                 │                                     │                 │
│  Riot Games API │                                     │   Cloudinary    │
│   (External)    │                                     │  (File Storage) │
│                 │                                     │                 │
└─────────────────┘                                     └─────────────────┘
```

### Características Principales

- **Separación de responsabilidades**: Frontend y backend completamente independientes
- **API RESTful**: Comunicación mediante endpoints REST estándar
- **WebSockets**: Comunicación bidireccional en tiempo real
- **Base de datos NoSQL**: MongoDB para flexibilidad en esquemas
- **Autenticación basada en tokens**: JWT almacenado en cookies httpOnly

## 🔧 Backend Architecture

### Estructura en Capas

El backend sigue una arquitectura en capas (Layered Architecture):

```
┌─────────────────────────────────────────────────────────┐
│                    Routes Layer                          │
│  (Definición de endpoints y validación de entrada)      │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                  Controllers Layer                       │
│  (Lógica de negocio y orquestación de servicios)        │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                  Services Layer                          │
│  (Servicios externos: Riot API, Email, etc.)            │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                  Models Layer                            │
│  (Esquemas de Mongoose y acceso a datos)                │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                  Database Layer                          │
│  (MongoDB - Persistencia de datos)                      │
└─────────────────────────────────────────────────────────┘
```

### Flujo de Request

1. **Request llega a Route** → Validación con Zod/express-validator
2. **Route llama a Controller** → Lógica de negocio
3. **Controller usa Services** → Llamadas a APIs externas si es necesario
4. **Controller interactúa con Models** → Operaciones CRUD
5. **Model persiste en Database** → MongoDB
6. **Response se envía al cliente** → JSON con datos o errores

### Middlewares

Los middlewares se ejecutan en el siguiente orden:

```
Request → CORS → JSON Parser → Cookie Parser → Auth Middleware → Route Handler
```

**Middlewares principales:**

- **CORS Dinámico**: Control de acceso cross-origin
  - Permite dominios explícitos (localhost, lol-match.netlify.app)
  - Permite automáticamente subdominios de netlify.app
  - Validación centralizada reutilizada por Express y Socket.io
  - Configuración flexible para agregar nuevos dominios
- **JSON Parser**: Parseo de bodies JSON
- **Cookie Parser**: Lectura de cookies
- **Auth Middleware**: Verificación de JWT
- **Timezone Middleware**: Normalización de zonas horarias
- **Hash Password Middleware**: Encriptación de contraseñas antes de guardar
- **Enum Validation Middleware**: Limpieza de campos enum vacíos (pre-save hook en User model)

### WebSockets

Socket.io se integra con Express en el mismo servidor HTTP con CORS dinámico:

```javascript
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    // reutiliza el mismo callback corsOrigin que Express (una única fuente de verdad)
    origin: corsOrigin,
    credentials: true
  }
});
```

**Eventos principales:**

- **Chat**: `join-room`, `leave-room`, `send-message`, `new-message`
- **Notificaciones**: `notification`, `squad-invitation`, `match-request`

## 🎨 Frontend Architecture

### Arquitectura de Componentes

El frontend sigue una arquitectura basada en componentes con Context API:

```
┌─────────────────────────────────────────────────────────┐
│                    App Component                         │
│  (Punto de entrada, rutas principales)                  │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                  Context Providers                       │
│  (Auth, Socket, Chat, Notifications)                    │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                  Layout Components                       │
│  (AppLayout, AuthLayout)                                 │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                  Page Components                         │
│  (Statistics, Squads, Profile, etc.)                    │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│              Business Components                         │
│  (UserCard, SquadCard, ChatRoom, etc.)                  │
└────────────────────┬────────────────────────────────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                  UI Components                           │
│  (Button, Input, Dialog, etc. - Radix UI)                │
└─────────────────────────────────────────────────────────┘
```

### Gestión de Estado

**Context API** para estado global:

- **AuthContext**: Estado de autenticación y usuario
- **SocketContext**: Conexión WebSocket
- **ChatContext**: Estado del chat
- **NotificationContext**: Notificaciones

**Estado Local** con React Hooks:

- `useState` para estado de componentes
- `useEffect` para efectos secundarios
- Custom hooks para lógica reutilizable

### Servicios

Los servicios encapsulan la comunicación con el backend:

```
Services Layer
├── apiService.js      (Cliente HTTP base)
├── authService.js     (Autenticación)
├── chatService.js     (Chat)
└── riotService.js     (Riot Games API)
```

## 🔄 Flujo de Datos

### Autenticación

```
1. Usuario ingresa credenciales
   ↓
2. Frontend: authService.loginUser()
   ↓
3. Backend: POST /api/auth/login
   ↓
4. Backend: Verifica credenciales → Genera JWT
   ↓
5. Backend: Establece cookie httpOnly con token
   ↓
6. Frontend: AuthContext actualiza estado
   ↓
7. Frontend: Redirige a página principal
```

### Chat en Tiempo Real

```
1. Usuario envía mensaje
   ↓
2. Frontend: Socket.emit('send-message', data)
   ↓
3. Backend: Socket handler procesa mensaje
   ↓
4. Backend: Guarda mensaje en DB
   ↓
5. Backend: Socket.broadcast('new-message', data)
   ↓
6. Frontend: Socket.on('new-message') → Actualiza UI
```

### Sincronización de Perfil Riot

```
1. Usuario ingresa gameName y tagLine
   ↓
2. Frontend: riotService.syncProfile()
   ↓
3. Backend: POST /api/lol/sync-profile
   ↓
4. Backend: riotApi.getFullPlayerStats()
   ↓
5. Backend: Llamada a Riot Games API
   ↓
6. Backend: Procesa y guarda datos en User.lolProfile
   ↓
7. Frontend: Actualiza perfil del usuario
```

## 🎯 Patrones de Diseño

### Backend

1. **MVC (Model-View-Controller)**

   - Models: Esquemas de Mongoose
   - Controllers: Lógica de negocio
   - Routes: Vistas (endpoints)

2. **Repository Pattern** (implícito)

   - Models encapsulan acceso a datos
   - Controllers no acceden directamente a DB

3. **Service Layer Pattern**

   - Servicios externos separados (Riot API, Email)
   - Reutilización y testabilidad

4. **Middleware Pattern**

   - Funciones intermedias para procesamiento
   - Autenticación, validación, logging

5. **DTO Pattern**
   - Data Transfer Objects para formatear respuestas
   - Separación entre modelo interno y API externa

### Frontend

1. **Component Composition**

   - Componentes pequeños y reutilizables
   - Composición sobre herencia

2. **Container/Presentational Pattern**

   - Containers: Lógica y estado
   - Presentational: UI pura

3. **Custom Hooks Pattern**

   - Lógica reutilizable en hooks
   - Separación de concerns

4. **Context Pattern**

   - Estado global compartido
   - Evita prop drilling

5. **Service Layer Pattern**
   - Servicios encapsulan llamadas API
   - Separación de lógica de negocio

## 🔑 Componentes Clave

### Backend

#### AuthController

Gestiona toda la lógica de autenticación:

- Registro con verificación de email
- Login con JWT y gestión de sesiones
- Recuperación de contraseña
- Autenticación de dos factores
- Gestión de sesiones activas

**Dependencias:**

- `User` model
- `Session` model
- `generateToken` utility
- Email services

#### RiotController

Integración con Riot Games API:

- Sincronización de perfiles
- Obtención de estadísticas
- Historial de partidas
- Información de ranking

**Dependencias:**

- `riotApi` service
- `cache` utility
- `User` model

#### ChatController

Gestión de mensajería:

- Creación de salas
- Envío de mensajes
- Conversaciones privadas
- Historial de mensajes

**Dependencias:**

- `ChatRoom` model
- `PrivateConversation` model
- Socket.io instance

### Frontend

#### AuthContext

Gestiona el estado de autenticación:

```javascript
// Funcionalidades principales
- Verificación automática de sesión
- Login y logout
- Actualización de datos de usuario
- Gestión de cookies
```

**Hooks relacionados:**

- `useSessionCheck` - Verificación inicial
- `useLogoutWithModal` - Logout con confirmación

#### SocketContext

Maneja conexión WebSocket:

```javascript
// Funcionalidades principales
- Conexión/desconexión automática
- Reconexión en caso de error
- Eventos de conexión
- Integración con autenticación
```

#### ChatContext

Estado del chat:

```javascript
// Funcionalidades principales
- Gestión de salas activas
- Mensajes en tiempo real
- Conversaciones privadas
- Notificaciones de mensajes nuevos
```

## 🔌 Integraciones

### Riot Games API

**Endpoints utilizados:**

- `/riot/account/v1/accounts/by-riot-id/{gameName}/{tagLine}` - Obtener PUUID
- `/lol/summoner/v4/summoners/by-puuid/{puuid}` - Información de invocador
- `/lol/league/v4/entries/by-summoner/{summonerId}` - Ranking
- `/lol/match/v5/matches/by-puuid/{puuid}/ids` - IDs de partidas
- `/lol/match/v5/matches/{matchId}` - Detalles de partida

**Características:**

- Sistema de caché para optimizar llamadas
- Soporte para múltiples regiones
- Manejo de rate limits
- Transformación de datos a formato interno

### Cloudinary

**Uso:**

- Almacenamiento de avatares de usuario
- Almacenamiento de imágenes de squads
- Optimización automática de imágenes
- URLs CDN para carga rápida

**Integración:**

- Multer para upload de archivos
- `multer-storage-cloudinary` para almacenamiento directo
- Transformaciones automáticas (resize, format)

### Zoho Mail (SMTP)

**Uso:**

- Emails de verificación de cuenta
- Emails de recuperación de contraseña
- Notificaciones de seguridad
- Códigos de autenticación de dos factores
- Export de datos y confirmación de borrado de cuenta

**Templates:**

- Email de bienvenida
- Verificación de cuenta
- Recuperación de contraseña y cambio de contraseña
- Código 2FA
- Notificaciones de seguridad

El transporte SMTP se centraliza en `config/mailer.js` (nodemailer); los utils de `utils/send*.js` consumen el helper `sendMail` y no conocen el proveedor concreto.

## 🔐 Seguridad

### Autenticación

- **JWT Tokens**: Almacenados en cookies httpOnly
- **Expiración**: Tokens con tiempo de vida limitado (7 días)
- **Refresh**: Renovación automática de tokens
- **Sesiones**: Gestión de múltiples sesiones por usuario
- **Cookies Cross-Origin**: 
  - Cookies configuradas con `sameSite: "None"` y `secure: true` para cross-origin
  - Logout limpia la cookie del dominio actual
  - CORS dinámico permite la conexión desde lol-match.netlify.app

### Validación

- **Zod**: Validación de esquemas en backend
- **express-validator**: Validación de requests HTTP
- **React Hook Form + Zod**: Validación en frontend

### Seguridad de Datos

- **Bcrypt**: Hash de contraseñas (10 rounds)
- **Sanitización**: Limpieza de inputs de usuario
- **CORS**: Control de orígenes permitidos
- **Rate Limiting**: Protección contra abuso (implementable)

## 📊 Base de Datos

### Modelos Principales

#### User

```javascript
{
  userName: String (único, requerido)
  email: String (único, requerido)
  password: String (hasheado)
  role: Enum ['user', 'moderator', 'admin']
  avatar: String (URL)
  isVerified: Boolean
  lolProfile: {
    gameName: String
    tagLine: String
    puuid: String
    region: String
    ranks: Enum ['Challenger', 'Grandmaster', 'Master', 'Diamond', 'Emerald', 'Platinum', 'Gold', 'Silver', 'Bronze', 'Iron'] (nullable)
    tier: Enum ['I', 'II', 'III', 'IV'] (nullable)
    stats: Object
    mySquad: ObjectId (ref: Squad)
  }
  matches: [ObjectId] (ref: User)
  security: {
    twoFactorEnabled: Boolean
    isLoginNotification: Boolean
  }
  sessions: [ObjectId] (ref: Session)
}
```

**Validación de Campos Enum:**

El modelo User incluye un middleware pre-save que limpia automáticamente cadenas vacías (`""`) en campos enum (`lolProfile.tier` y `lolProfile.ranks`), convirtiéndolas a `null` antes de la validación de Mongoose. Esto previene errores de validación cuando estos campos tienen restricciones de enum.

```javascript
// Middleware pre-save en User.js
userSchema.pre("save", function (next) {
  if (this.lolProfile) {
    if (this.lolProfile.tier === "") this.lolProfile.tier = null;
    if (this.lolProfile.ranks === "") this.lolProfile.ranks = null;
  }
  next();
});
```

**Migración de Datos:**

Para limpiar datos existentes en la base de datos, se proporciona el script `scripts/fixEnumFields.js` que actualiza todos los usuarios con cadenas vacías en estos campos.

#### Squad

```javascript
{
  name: String (único, requerido)
  description: String
  avatar: String (URL)
  members: [ObjectId] (ref: User)
  maxMembers: Number
  isPublic: Boolean
  requirements: {
    minRank: String
    minLevel: Number
  }
  stats: Object
}
```

#### Session

```javascript
{
  userId: ObjectId (ref: User)
  tokenHash: String
  device: String
  ip: String
  lastActivity: Date
  createdAt: Date
}
```

### Relaciones

- **User ↔ Squad**: Many-to-One (un usuario puede estar en un squad)
- **User ↔ User**: Many-to-Many (matches entre usuarios)
- **User ↔ Session**: One-to-Many (múltiples sesiones por usuario)
- **Squad ↔ User**: One-to-Many (múltiples usuarios en un squad)

## 🚀 Optimizaciones

### Backend

- **Caché**: Sistema de caché para llamadas a Riot API
- **Índices**: Índices en campos frecuentemente consultados
- **Paginación**: Paginación en listados grandes
- **Lazy Loading**: Carga diferida de relaciones

### Frontend

- **Code Splitting**: División de código por rutas
- **Lazy Loading**: Carga diferida de componentes
- **Memoización**: React.memo y useMemo para optimización
- **Image Optimization**: Optimización automática con Vite

## 🧪 Testing

### Estrategia de Testing

El backend implementa tests unitarios para verificar la funcionalidad de utilidades y servicios críticos.

```
┌─────────────────────────────────────────────────────────┐
│              Tests Unitarios (Jest)                      │
│  (Utilidades, servicios, funciones puras)               │
└─────────────────────────────────────────────────────────┘
```

### Tests Unitarios (Jest)

**Herramientas:**

- **Jest**: Framework de testing para Node.js
- **Entorno Node**: Sin necesidad de DOM o navegador

**Estructura:**

- Tests en carpetas `__tests__` junto a los módulos
- Configuración en `jest.config.js`
- Cobertura generada en `coverage/`

**Cobertura actual:**

- ✅ **Cache**: Sistema de caché en memoria
- ✅ **generateToken**: Generación y validación de tokens JWT
- ✅ **generateTwoFactorCode**: Generación de códigos 2FA
- ✅ **timezoneUtils**: Conversión y validación de timezones

**Ejemplo de test:**

```javascript
// utils/__tests__/generateToken.test.js
const generateToken = require("../generateToken");
const jwt = require("jsonwebtoken");

describe("generateToken", () => {
  it("should generate a valid JWT token", () => {
    const payload = { id: "123" };
    const token = generateToken(payload);
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    expect(decoded.id).toBe("123");
  });
});
```

### Arquitectura de Tests

Los tests siguen la misma estructura en capas que el código de producción:

```
Tests Layer
├── Utils Tests          (Funciones puras, sin dependencias)
├── Services Tests      (Mock de APIs externas)
├── Controllers Tests    (Mock de Models y Services)
└── Integration Tests    (Tests de flujos completos - futuro)
```

### Mocking y Stubs

Para tests de servicios que dependen de APIs externas:

```javascript
// Ejemplo de mock para Riot API
jest.mock("../services/riotApi", () => ({
  getFullPlayerStats: jest.fn().mockResolvedValue(mockStats),
}));
```

### Integración en CI/CD

Los tests están diseñados para ejecutarse en pipelines de CI/CD:

```yaml
# Ejemplo de configuración CI
- name: Run tests
  run: npm test

- name: Generate coverage report
  run: npm run test:coverage
```

## 📝 Notas Finales

- La arquitectura está diseñada para ser escalable y mantenible
- La separación de concerns facilita el testing
- Los patrones utilizados son estándar en la industria
- La documentación del código facilita la colaboración
- Los tests unitarios garantizan la calidad de utilidades críticas

---

**Última actualización**: 2024
