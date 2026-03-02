const mongoose = require("mongoose");
const User = require("../models/User.js");
require("dotenv").config();

/**
 * Script de migración para limpiar campos enum vacíos en la base de datos
 * Convierte cadenas vacías ("") a null en los campos lolProfile.tier y lolProfile.ranks
 * 
 * Uso: node scripts/fixEnumFields.js
 */
async function fixEnumFields() {
    try {
        console.log("🔌 Conectando a MongoDB...");
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ Conectado a MongoDB");

        //buscar usuarios con cadenas vacías en tier o ranks
        const usersWithEmptyFields = await User.find({
            $or: [
                { "lolProfile.tier": "" },
                { "lolProfile.ranks": "" }
            ]
        }).select("_id userName lolProfile.tier lolProfile.ranks");

        console.log(`📊 Encontrados ${usersWithEmptyFields.length} usuarios con campos enum vacíos`);

        if (usersWithEmptyFields.length === 0) {
            console.log("✅ No hay usuarios que necesiten corrección");
            await mongoose.disconnect();
            return;
        }

        //actualizar todos los usuarios que tengan cadenas vacías en tier o ranks
        const result = await User.updateMany(
            {
                $or: [
                    { "lolProfile.tier": "" },
                    { "lolProfile.ranks": "" }
                ]
            },
            {
                $set: {
                    "lolProfile.tier": null,
                    "lolProfile.ranks": null
                }
            }
        );

        console.log(`✅ Actualizados ${result.modifiedCount} usuarios`);
        console.log(`📝 Usuarios corregidos:`);
        usersWithEmptyFields.forEach(user => {
            console.log(`   - ${user.userName} (${user._id})`);
        });

        await mongoose.disconnect();
        console.log("✅ Desconectado de MongoDB");
        console.log("🎉 Migración completada exitosamente");
    } catch (error) {
        console.error("❌ Error durante la migración:", error);
        await mongoose.disconnect().catch(() => { });
        process.exit(1);
    }
}

//ejecutar la migración
if (require.main === module) {
    fixEnumFields();
}

module.exports = fixEnumFields;

