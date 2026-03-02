require("dotenv").config();
const mongoose = require("mongoose");
const fs = require("fs");
const path = require("path");
const User = require("../models/User");
const Squad = require("../models/Squad");

//roles disponibles
const ROLES = ["Top", "Jungle", "Mid", "ADC", "Support"];

//pool de usernames para crear usuarios ficticios si no existen
const USERNAME_POOL = [
    "NightHowler",
    "ArcaneMage",
    "SunfireWarrior",
    "StormBreaker",
    "ShadowHunter",
    "CrystalGuard",
    "ThunderStrike",
    "VoidWalker",
    "PhoenixRider",
    "FrostBlade",
    "RiftDancer",
    "EchoStrike",
    "CelestialFang",
    "RuneSinger",
    "NightshadeVex",
    "SpectralNova",
    "InfernalPulse",
    "TwilightRune",
    "GlacialStorm",
    "DragonSlayer",
    "IronGuardian",
    "SilentArrow",
    "StormCaller",
    "MysticFlame",
    "ShadowKnight",
    "FrostHex",
    "EchoBlade",
    "CelestialFang",
    "RuneSinger",
    "NightshadeVex",
];

//configuración de Cloudinary para avatares (fallback)
const CLOUDINARY_BASE_URL =
    "https://res.cloudinary.com/dotrj7xbo/image/upload/";
const MODIFIER_250 = "w_250,h_250,c_fit,f_auto,q_auto/";
const FOLDER = "v1762381404/";
const NUM_AVATARS = 22;

//ruta a la carpeta de avatares del frontend
const AVATARS_LOCAL_PATH = path.join(
    __dirname,
    "..",
    "..",
    "TFM-rojo-frontend",
    "public",
    "images",
    "avatars"
);

//función para verificar si un archivo existe localmente
const fileExists = (filePath) => {
    try {
        return fs.existsSync(filePath) && fs.statSync(filePath).isFile();
    } catch (error) {
        return false;
    }
};

//función para generar URL de avatar (local primero, Cloudinary como fallback)
const generateAvatarUrl = (avatarNumber) => {
    const num = String(avatarNumber).padStart(2, "0");
    const fileName = `avatar-mock-${num}.webp`;
    const localFilePath = path.join(AVATARS_LOCAL_PATH, fileName);

    //verificar si el archivo existe localmente
    if (fileExists(localFilePath)) {
        //devolver ruta relativa para el frontend
        return `/images/avatars/${fileName}`;
    }

    //si no existe localmente, usar Cloudinary como fallback
    return `${CLOUDINARY_BASE_URL}${MODIFIER_250}${FOLDER}${fileName}`;
};

//función para obtener un avatar aleatorio
const getRandomAvatar = () => {
    const avatarNumber = Math.floor(Math.random() * NUM_AVATARS) + 1;
    return generateAvatarUrl(avatarNumber);
};

//función auxiliar para elegir un elemento aleatorio
const getRandomItem = (array) =>
    array[Math.floor(Math.random() * array.length)];

//función para crear o obtener un usuario ficticio
const getOrCreateUser = async (username, role) => {
    let user = await User.findOne({ userName: username.toLowerCase() });

    if (!user) {
        const email = `${username.toLowerCase()}@squadtest.com`;
        const password = "qwe123Q+"; //password por defecto para pruebas

        user = new User({
            userName: username.toLowerCase(),
            email: email,
            password: password,
            role: "user",
            avatar: getRandomAvatar(),
            isVerified: true,
            verifiedAt: new Date(),
            preferences: {
                theme: "dark",
                isPremium: false,
                isVisible: true,
                accountStatus: "active",
            },
            notifications: {
                emailNotification: true,
                pushNotification: true,
                marketingNotification: false,
                weeklyNotification: true,
                securityNotification: true,
            },
            security: {
                isTwoFactorEnabled: false,
                twoFactorCode: null,
                twoFactorCodeExpires: null,
                isLoginNotification: false,
            },
            address: {
                city: "",
                country: "",
            },
            contact: {
                name: "",
                lastname: "",
                phone: "",
                discord: "",
            },
            lolStats: {
                champion: null,
                winRate: null,
                matchesPlayed: null,
                kills: null,
                deaths: null,
                assists: null,
            },
            lolProfile: {
                gameName: username,
                tagLine: `#${Math.floor(Math.random() * 10000)
                    .toString()
                    .padStart(4, "0")}`,
                region: "EUW",
                roleLol: role,
                tier: getRandomItem(["I", "II", "III", "IV"]),
                ranks: getRandomItem([
                    "Challenger",
                    "Grandmaster",
                    "Master",
                    "Diamond",
                    "Emerald",
                    "Platinum",
                    "Gold",
                ]),
                queue: "Ranked Flex 5v5",
                honor: "Honor 3",
                mySquad: [],
            },
            squadNotifications: [],
            matches: [],
        });

        await user.save();
        console.log(`  ✅ Created user: ${username}`);
    }

    return user;
};

//configuración de los 6 squads
const squadConfigs = [
    {
        name: "Night Howlers",
        description: "Aggressive jungle-focused team. We dominate the early game and control objectives.",
        members: [
            { username: "NightHowler", role: "Jungle" },
            { username: "ShadowHunter", role: "Top" },
            { username: "ArcaneMage", role: "Mid" },
            { username: "StormBreaker", role: "ADC" },
            { username: "CrystalGuard", role: "Support" },
        ],
    },
    {
        name: "Arcane Order",
        description: "Midlane control and macro play. Strategic teamfighting and objective control.",
        members: [
            { username: "ArcaneMage", role: "Mid" },
            { username: "ThunderStrike", role: "Jungle" },
            { username: "VoidWalker", role: "Top" },
            { username: "PhoenixRider", role: "ADC" },
        ],
    },
    {
        name: "Sunfire Legion",
        description: "Friendly and casual team. We play for fun and improvement, no toxicity allowed.",
        members: [
            { username: "SunfireWarrior", role: "Top" },
            { username: "FrostBlade", role: "Jungle" },
            { username: "RiftDancer", role: "Mid" },
        ],
    },
    {
        name: "Stormbreakers",
        description: "High elo competitive team. Looking for consistent players to climb ranked together.",
        members: [
            { username: "StormBreaker", role: "ADC" },
            { username: "StormCaller", role: "Support" },
            { username: "DragonSlayer", role: "Top" },
            { username: "IronGuardian", role: "Jungle" },
            { username: "SilentArrow", role: "Mid" },
        ],
    },
    {
        name: "Shadow Syndicate",
        description: "Elite team focused on coordination and communication. We analyze every play.",
        members: [
            { username: "ShadowHunter", role: "Jungle" },
            { username: "ShadowKnight", role: "Top" },
            { username: "EchoStrike", role: "Mid" },
            { username: "CelestialFang", role: "ADC" },
        ],
    },
    {
        name: "Rift Warriors",
        description: "Experienced players looking for a fifth member. We practice daily and compete in tournaments.",
        members: [
            { username: "RuneSinger", role: "Support" },
            { username: "NightshadeVex", role: "Mid" },
            { username: "SpectralNova", role: "Jungle" },
            { username: "InfernalPulse", role: "Top" },
            { username: "TwilightRune", role: "ADC" },
        ],
    },
];

//función principal para ejecutar el seed
const seedSquads = async () => {
    try {
        //conectar a la base de datos
        const uri =
            process.env.NODE_ENV === "production"
                ? process.env.MONGO_URI_ATLAS
                : process.env.MONGO_URI_LOCAL;

        await mongoose.connect(uri);
        console.log("✅ MongoDB Connected");

        const createdSquads = [];
        const existingSquads = [];
        const createdUsers = [];

        for (const squadConfig of squadConfigs) {
            //verificar si el squad ya existe
            let squad = await Squad.findOne({ name: squadConfig.name });

            if (squad) {
                console.log(`⏭️  Squad "${squadConfig.name}" already exists, skipping...`);
                existingSquads.push(squadConfig.name);
                continue;
            }

            //crear o obtener usuarios para los miembros
            const members = [];
            for (const memberConfig of squadConfig.members) {
                const user = await getOrCreateUser(
                    memberConfig.username,
                    memberConfig.role
                );
                members.push({
                    userId: user._id,
                    role: memberConfig.role,
                });
                if (!createdUsers.includes(memberConfig.username)) {
                    createdUsers.push(memberConfig.username);
                }
            }

            //crear el squad
            squad = new Squad({
                name: squadConfig.name,
                description: squadConfig.description,
                members: members,
                createdBy: members[0].userId, //el primer miembro es el creador
                isPublic: true,
            });

            await squad.save();
            console.log(`✅ Created squad: ${squadConfig.name} (${members.length} members)`);
            createdSquads.push(squadConfig.name);
        }

        console.log("\n📊 Summary:");
        console.log(`  ✅ Created ${createdSquads.length} squads`);
        console.log(`  ⏭️  ${existingSquads.length} squads already existed`);
        console.log(`  ✅ Created ${createdUsers.length} users`);

        if (createdSquads.length > 0) {
            console.log("\n📝 Created squads:");
            createdSquads.forEach((name) => console.log(`   - ${name}`));
        }

        if (existingSquads.length > 0) {
            console.log("\n⏭️  Existing squads:");
            existingSquads.forEach((name) => console.log(`   - ${name}`));
        }

        if (createdUsers.length > 0) {
            console.log("\n👥 Created users:");
            createdUsers.forEach((username) => console.log(`   - ${username}`));
        }

        console.log("\n✅ Seed completed successfully!");

        //cerrar conexión
        await mongoose.connection.close();
        console.log("🔌 Database connection closed");
        process.exit(0);
    } catch (error) {
        console.error("❌ Error seeding squads:", error);
        await mongoose.connection.close();
        process.exit(1);
    }
};

//ejecutar el seed
seedSquads();

