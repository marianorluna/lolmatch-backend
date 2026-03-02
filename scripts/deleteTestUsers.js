require("dotenv").config();
const mongoose = require("mongoose");
const User = require("../models/User");

//función principal para eliminar usuarios de prueba
const deleteTestUsers = async () => {
  try {
    //conectar a la base de datos
    const uri =
      process.env.NODE_ENV === "production"
        ? process.env.MONGO_URI_ATLAS
        : process.env.MONGO_URI_LOCAL;

    await mongoose.connect(uri);
    console.log("✅ MongoDB Connected");

    //buscar usuarios con email que empiece por "user" y termine en "gmail.com"
    const result = await User.deleteMany({
      email: { $regex: /^user.*@gmail\.com$/ },
    });

    console.log(`\n🗑️  Deleted ${result.deletedCount} test user(s)`);
    console.log("🎉 Cleanup completed successfully!");

    //cerrar conexión
    await mongoose.connection.close();
    console.log("🔌 Database connection closed");
    process.exit(0);
  } catch (error) {
    console.error("❌ Error deleting test users:", error);
    await mongoose.connection.close();
    process.exit(1);
  }
};

//ejecutar el script
deleteTestUsers();

