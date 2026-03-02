const User = require("../models/User.js");
const userDTO = require("../dtos/userDTO.js");
const { updateProfileSchema } = require("../schemas/profileSchemas.js");
const cloudinary = require("cloudinary").v2;

//función auxiliar para extraer el public_id de una URL de Cloudinary
const extractPublicIdFromUrl = (url) => {
    if (!url || typeof url !== "string") return null;

    //formato de URL: https://res.cloudinary.com/cloud_name/image/upload/v1234567890/folder/image.jpg
    //o: https://res.cloudinary.com/cloud_name/image/upload/folder/image.jpg

    try {
        const match = url.match(/\/upload\/(?:v\d+\/)?(.+?)(?:\.[^.]+)?$/);
        return match ? match[1] : null;
    } catch (error) {
        console.error("Error extracting public_id from URL:", error);
        return null;
    }
};

//función auxiliar para eliminar imagen de Cloudinary
const deleteImageFromCloudinary = async (url) => {
    if (!url) return;

    const defaultAvatarUrl = "https://res.cloudinary.com/dotrj7xbo/image/upload/v1762420706/default-avatar.png";

    //no eliminar el avatar por defecto
    if (url === defaultAvatarUrl || url.includes("default-avatar.png")) {
        return;
    }

    try {
        const publicId = extractPublicIdFromUrl(url);
        if (publicId) {
            await cloudinary.uploader.destroy(publicId);
            console.log(`🗑️ [BACKEND] Imagen eliminada de Cloudinary: ${publicId}`);
        }
    } catch (error) {
        //no bloquear si falla la eliminación, solo loguear
        console.error("⚠️ [BACKEND] Error al eliminar imagen de Cloudinary:", error.message);
    }
};

//ruta para subir avatar (imagen)
const uploadAvatar = async (req, res) => {
    let oldAvatarUrl = null;

    try {
        const userId = req.user._id;
        //console.log("📸 [BACKEND] Iniciando subida para usuario:", userId);

        //1. obtener el avatar actual antes de actualizarlo
        const currentUser = await User.findById(userId);
        oldAvatarUrl = currentUser?.avatar || null;

        //2. verificamos si llegó el archivo
        if (!req.file) {
            console.log(
                "❌ [BACKEND] No uploaded any file (req.file is undefined)"
            );
            return res
                .status(400)
                .json({ success: false, message: "Not uploaded image" });
        }

        //3. fix crucial: Cloudinary a veces devuelve .path y a veces .secure_url
        const avatarUrl = req.file.path || req.file.secure_url || req.file.url;

        if (!avatarUrl) {
            console.error(
                "⚠️ [BACKEND] Cloudinary processed the file but did not return URL."
            );
            return res.status(500).json({
                success: false,
                message: "Error getting URL from Cloudinary",
            });
        }

        //console.log("✅ [BACKEND] URL found:", avatarUrl);

        //4. actualizamos en Mongo
        const user = await User.findByIdAndUpdate(
            userId,
            { avatar: avatarUrl },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        //5. si todo fue exitoso, eliminar la imagen anterior de Cloudinary
        if (oldAvatarUrl && oldAvatarUrl !== avatarUrl) {
            await deleteImageFromCloudinary(oldAvatarUrl);
        }

        //console.log("💾 [BACKEND] Avatar guardado en DB.");

        //devolvemos el usuario limpio
        res.json(userDTO(user));
    } catch (error) {
        console.error("🔥 [BACKEND] Fatal error uploading avatar:", error);
        res.status(500).json({
            success: false,
            message: "Error uploading image",
        });
        //si hay error, no eliminamos nada (se mantiene la imagen anterior)
    }
};

//ruta para actualizar perfil (texto + LOL)
const updateProfile = async (req, res) => {
    try {
        //validación con zod
        const result = updateProfileSchema.safeParse(req.body);
        if (!result.success) {
            const errors = result.error.issues.map((err) => ({
                field: err.path.join("."),
                message: err.message,
            }));
            return res.status(400).json({
                success: false,
                message: "Validation error",
                errors,
            });
        }

        const userId = req.user._id;
        const updatedData = result.data; //usar datos validados

        //console.log("✏️ [BACKEND] Actualizando perfil para:", userId);

        //construir objeto de actualización solo con campos que tienen valores
        const updateFields = {};

        //datos de contacto
        if (updatedData.firstName !== undefined && updatedData.firstName !== "") {
            updateFields["contact.name"] = updatedData.firstName;
        }
        if (updatedData.lastName !== undefined && updatedData.lastName !== "") {
            updateFields["contact.lastname"] = updatedData.lastName;
        }
        if (updatedData.phone !== undefined) {
            updateFields["contact.phone"] = updatedData.phone || "";
        }
        if (updatedData.discord !== undefined) {
            updateFields["contact.discord"] = updatedData.discord || "";
        }
        if (updatedData.hobbies !== undefined) {
            updateFields["contact.hobbies"] = updatedData.hobbies || "";
        }

        //biografia
        if (updatedData.bio !== undefined) {
            updateFields["profile.bio"] = updatedData.bio || "";
        }

        //direccion
        if (updatedData.city !== undefined) {
            updateFields["address.city"] = updatedData.city || "";
        }
        if (updatedData.country !== undefined) {
            updateFields["address.country"] = updatedData.country || "";
        }

        //datos de LOL
        if (updatedData.gameName !== undefined) {
            updateFields["lolProfile.gameName"] = updatedData.gameName || "";
        }
        if (updatedData.tagLine !== undefined) {
            updateFields["lolProfile.tagLine"] = updatedData.tagLine || "";
        }
        if (updatedData.region !== undefined) {
            updateFields["lolProfile.region"] = updatedData.region || "EUW";
        }
        if (updatedData.roleLol !== undefined) {
            updateFields["lolProfile.roleLol"] = updatedData.roleLol || null;
        }
        if (updatedData.tier !== undefined) {
            updateFields["lolProfile.tier"] = updatedData.tier || null;
        }
        if (updatedData.ranks !== undefined) {
            updateFields["lolProfile.ranks"] = updatedData.ranks || null;
        }

        const user = await User.findByIdAndUpdate(
            userId,
            { $set: updateFields },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({
                success: false,
                message: "User not found",
            });
        }

        //console.log("💾 [BACKEND] Perfil actualizado correctamente.");

        //devolvemos el usuario actualizado
        res.json(userDTO(user));
    } catch (err) {
        console.error("🔥 [BACKEND] Error updating profile:", err);
        res.status(500).json({ success: false, message: "Internal error" });
    }
};

module.exports = {
    uploadAvatar,
    updateProfile,
};

