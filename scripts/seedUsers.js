require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

//datos de referencia basados en PLAYERS de matches.js (usados para generar usuarios de prueba)
const RANKS = [
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
];

const TIERS = ["I", "II", "III", "IV"];

const HONOR_LEVELS = ["Honor 1", "Honor 2", "Honor 3", "Honor 4", "Honor 5"];

const ROLES = ["Top", "Jungle", "Mid", "ADC", "Support"];

const REGIONS = [
  "EUW",
  // "EUNE",
  // "NA",
  // "LAN",
  // "LAS",
  // "KR",
  // "JP",
  // "OCE",
  // "BR",
  // "TR",
  // "RU",
];

//pool de usernames basados en usersMocks.js (usados para generar usuarios de prueba)
const USERNAME_POOL = [
  //no repetir nombres
  "ShadowBlade",
  "ArcaneSoul",
  "MysticFlame",
  "DragonSlayer",
  "NightHunter",
  "CrystalMage",
  "IronGuardian",
  "SilentArrow",
  "StormCaller",
  "VoidWalker",
  "PhoenixFury",
  "ThunderStrike",
  "ShadowKnight",
  "FrostHex",
  "RiftDancer",
  "EchoBlade",
  "CelestialFang",
  "RuneSinger",
  "NightshadeVex",
  "SpectralNova",
  "InfernalPulse",
  "TwilightRune",
  "GlacialStorm",
];

//configuración de Cloudinary para avatares (basado en images.js)
const CLOUDINARY_BASE_URL =
  "https://res.cloudinary.com/dotrj7xbo/image/upload/";
const MODIFIER_250 = "w_250,h_250,c_fit,f_auto,q_auto/";
const FOLDER = "v1762381404/";
const NUM_AVATARS = 22; //número de avatares disponibles en Cloudinary

//función para generar URL de avatar basado en el número
const generateAvatarUrl = (avatarNumber) => {
  const num = String(avatarNumber).padStart(2, "0"); //formato 01, 02, ...
  return `${CLOUDINARY_BASE_URL}${MODIFIER_250}${FOLDER}avatar-mock-${num}.webp`;
};

//función para obtener un avatar aleatorio
const getRandomAvatar = () => {
  const avatarNumber = Math.floor(Math.random() * NUM_AVATARS) + 1; //número entre 1 y 22
  return generateAvatarUrl(avatarNumber);
};

//función auxiliar para elegir un elemento aleatorio
const getRandomItem = (array) =>
  array[Math.floor(Math.random() * array.length)];

//función para generar un tier aleatorio
const generateTier = () => {
  return getRandomItem(TIERS);
};

//función para generar un rank aleatorio
const generateRank = () => {
  return getRandomItem(RANKS);
};

//función para parsear el tier del formato "Rank Tier" (ej: "Diamond II")
const parseTier = (tierString) => {
  const parts = tierString.split(" ");
  if (parts.length >= 2) {
    return {
      rank: parts[0],
      tier: parts[1],
    };
  }
  return {
    rank: getRandomItem(RANKS),
    tier: getRandomItem(TIERS),
  };
};

//función para convertir role a formato del schema
//Top, Jungle, Mid, ADC (todo mayúsculas), Support
const formatRole = (role) => {
  if (!role) return getRandomItem(ROLES);
  const roleLower = role.toLowerCase();

  //caso especial para ADC que debe estar todo en mayúsculas
  if (roleLower === "adc") {
    return "ADC";
  }

  //para los demás roles: primera letra mayúscula, resto minúsculas
  return role.charAt(0).toUpperCase() + role.slice(1).toLowerCase();
};

//función para generar usuarios de prueba
const generateUsers = () => {
  const NUM_USERS = 10; //número de usuarios a generar
  const users = [];

  for (let i = 0; i < NUM_USERS; i++) {
    const username = USERNAME_POOL[i] || `TestUser${i + 1}`;
    const email = `user${String(i + 1).padStart(3, "0")}@gmail.com`;
    const password = "qwe123Q+"; //password por defecto para pruebas
    const role = getRandomItem(ROLES);
    const rank = generateRank();
    const tier = generateTier();
    const honor = getRandomItem(HONOR_LEVELS);
    const region = getRandomItem(REGIONS);
    const queue = getRandomItem(["Ranked Solo/Duo", "Ranked Flex 5v5"]);

    //generar gameName y tagLine
    const gameName = username;
    const tagLine = `#${Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0")}`;

    const user = {
      userName: username,
      email: email,
      password: password,
      role: "user",
      avatar: getRandomAvatar(), //avatar aleatorio de Cloudinary
      isVerified: true,
      verifiedAt: new Date(),
      preferences: {
        theme: "dark",
        isPremium: Math.random() > 0.7, //30% de probabilidad de ser premium
        isVisible: true,
        accountStatus: "active",
      },
      notifications: {
        emailNotification: true,
        pushNotification: true,
        marketingNotification: Math.random() > 0.5,
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
        gameName: gameName,
        tagLine: tagLine,
        region: region,
        roleLol: formatRole(role),
        tier: tier,
        ranks: rank,
        queue: queue,
        honor: honor,
        mySquad: [],
      },
      squadNotifications: [],
      matches: [],
    };

    users.push(user);
  }

  return users;
};

//función principal para ejecutar el seed
const seedUsers = async () => {
  try {
    //conectar a la base de datos
    const uri =
      process.env.NODE_ENV === "production"
        ? process.env.MONGO_URI_ATLAS
        : process.env.MONGO_URI_LOCAL;

    await mongoose.connect(uri);
    console.log("✅ MongoDB Connected");

    //generar usuarios
    const users = generateUsers();

    //verificar si los usuarios ya existen
    for (const userData of users) {
      const existingUser = await User.findOne({
        $or: [{ userName: userData.userName }, { email: userData.email }],
      });

      if (existingUser) {
        console.log(
          `⚠️  User ${userData.userName} already exists, skipping...`
        );
        continue;
      }

      //crear usuario
      const user = new User(userData);
      await user.save();
      console.log(`✅ User created: ${userData.userName} (${userData.email})`);
    }

    console.log("\n🎉 Seed completed successfully!");
    console.log(`📊 Total users created: ${users.length}`);

    //cerrar conexión
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error seeding users:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

//ejecutar el seed
seedUsers();
