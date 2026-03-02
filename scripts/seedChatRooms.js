require("dotenv").config();
const mongoose = require("mongoose");
const ChatRoom = require("../models/ChatRoom");
const ChatMessage = require("../models/ChatMessage");

//salas de chat basadas en los mocks del frontend
const chatRoomConfigs = [
    {
        name: "Champions Gamers",
        region: "EUW",
        description: "European West gaming community",
        welcomeMessages: [
            {
                text: "Welcome to Champions Gamers!",
                offsetMs: 3600_000, // 1 hora atrás
            },
        ],
    },
    {
        name: "Summoners Leaders",
        region: "EUNE",
        description: "European Nordic & East community",
        welcomeMessages: [
            {
                text: "Welcome to Summoners Leaders!",
                offsetMs: 7200_000, // 2 horas atrás
            },
        ],
    },
    {
        name: "Player Legends",
        region: "LAN",
        description: "Latin America North community",
        welcomeMessages: [
            {
                text: "Welcome to Player Legends!",
                offsetMs: 5400_000, // 1.5 horas atrás
            },
        ],
    },
    {
        name: "Global Strategy",
        region: "Global",
        description: "Global strategy discussions",
        welcomeMessages: [
            {
                text: "Welcome to Global Strategy!",
                offsetMs: 900_000, // 15 minutos atrás
            },
        ],
    },
    {
        name: "Team Tactics",
        region: "Global",
        description: "Team tactics and coordination",
        welcomeMessages: [
            {
                text: "Welcome to Team Tactics!",
                offsetMs: 1080_000, // 18 minutos atrás
            },
        ],
    },
    {
        name: "Strategic Planning",
        region: "Global",
        description: "Strategic planning discussions",
        welcomeMessages: [
            {
                text: "Welcome to Strategic Planning!",
                offsetMs: 1260_000, // 21 minutos atrás
            },
        ],
    },
];

async function seedChatRooms() {
    try {
        //conectar a la base de datos
        const uri =
            process.env.NODE_ENV === "production"
                ? process.env.MONGO_URI_ATLAS
                : process.env.MONGO_URI_LOCAL;

        await mongoose.connect(uri);
        console.log("✅ MongoDB Connected");

        const createdRooms = [];
        const existingRooms = [];
        const createdMessages = [];

        for (const roomConfig of chatRoomConfigs) {
            //verificar si la sala ya existe
            let room = await ChatRoom.findOne({ name: roomConfig.name });

            if (room) {
                console.log(`⏭️  Room "${roomConfig.name}" already exists, skipping...`);
                existingRooms.push(roomConfig.name);
                room = room; //usar la sala existente
            } else {
                //crear la sala
                room = await ChatRoom.create({
                    name: roomConfig.name,
                    region: roomConfig.region,
                    description: roomConfig.description || "",
                    status: "active",
                    memberCount: 0,
                });
                console.log(`✅ Created room: ${roomConfig.name}`);
                createdRooms.push(roomConfig.name);
            }

            //crear mensajes de bienvenida si no existen
            if (roomConfig.welcomeMessages && roomConfig.welcomeMessages.length > 0) {
                for (const welcomeMsg of roomConfig.welcomeMessages) {
                    //verificar si el mensaje ya existe (por texto y sala)
                    const existingMessage = await ChatMessage.findOne({
                        room: room._id,
                        text: welcomeMsg.text,
                    });

                    if (!existingMessage) {
                        const messageDate = new Date(Date.now() - welcomeMsg.offsetMs);

                        //crear el mensaje con la fecha correcta
                        const message = await ChatMessage.create({
                            room: room._id,
                            roomName: room.name,
                            text: welcomeMsg.text,
                            user: null, //mensaje del sistema
                            createdAt: messageDate,
                        });

                        //actualizar la sala con el último mensaje si es el más reciente
                        if (!room.lastMessage || !room.lastMessageAt || room.lastMessageAt < messageDate) {
                            room.lastMessage = message._id;
                            room.lastMessageAt = messageDate;
                            await room.save();
                        }

                        createdMessages.push({
                            room: room.name,
                            text: welcomeMsg.text,
                        });
                        console.log(`  ✅ Created welcome message in ${room.name}`);
                    } else {
                        console.log(`  ⏭️  Welcome message already exists in ${room.name}`);
                    }
                }
            }
        }

        console.log("\n📊 Summary:");
        console.log(`  ✅ Created ${createdRooms.length} rooms`);
        console.log(`  ⏭️  ${existingRooms.length} rooms already existed`);
        console.log(`  ✅ Created ${createdMessages.length} welcome messages`);

        if (createdRooms.length > 0) {
            console.log("\n📝 Created rooms:");
            createdRooms.forEach((name) => console.log(`   - ${name}`));
        }

        if (existingRooms.length > 0) {
            console.log("\n⏭️  Existing rooms:");
            existingRooms.forEach((name) => console.log(`   - ${name}`));
        }

        console.log("\n✅ Seed completed successfully!");

        //cerrar conexión
        await mongoose.connection.close();
        console.log("🔌 Database connection closed");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error seeding chat rooms:", error);
        await mongoose.connection.close();
        process.exit(1);
    }
}

//ejecutar el seed
seedChatRooms();

