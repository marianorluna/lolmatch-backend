const mongoose = require("mongoose");
const User = require("../models/User.js");
const userDTO = require("../dtos/userDTO.js");
const { getCurrentDateInTimezone } = require("../utils/timezoneUtils.js");

//obtener usuarios para GG Match (filtrados por región y excluyendo al usuario actual)
const getUsersForMatch = async (req, res) => {
  //req.user viene del middleware authMiddleware
  const currentUserId = req.user._id;
  const currentUserRegion = req.user.lolProfile?.region;

  try {
    //si el usuario no tiene región configurada, devolver array vacío
    if (!currentUserRegion) {
      return res.status(200).json({ users: [] });
    }

    //construir query para filtrar usuarios
    const query = {
      _id: { $ne: currentUserId }, //excluir al usuario actual
      "lolProfile.region": currentUserRegion, //misma región
      isVerified: true, //solo usuarios verificados
      "preferences.isVisible": true, //solo usuarios visibles
      "preferences.accountStatus": "active", //solo cuentas activas
    };

    //obtener usuarios que cumplan los criterios
    const users = await User.find(query)
      .select("-password -security.twoFactorCode -security.twoFactorCodeExpires")
      .lean();

    //transformar usuarios al formato esperado por el frontend
    const formattedUsers = users.map((user) => ({
      id: user._id.toString(),
      name: user.userName,
      tier: user.lolProfile?.ranks && user.lolProfile?.tier
        ? `${user.lolProfile.ranks} ${user.lolProfile.tier}`
        : "Unranked",
      honor: user.lolProfile?.honor || "Honor 3",
      role: user.lolProfile?.roleLol?.toLowerCase() || "top",
      avatar: user.avatar,
    }));

    //status 200: ok
    res.status(200).json({ users: formattedUsers });
  } catch (err) {
    console.error("Error getting users for match:", err);
    //status 500: server error
    res.status(500).json({ message: "Error getting users for match ❌" });
  }
};

//agregar un match a la lista de matches del usuario
const addMatch = async (req, res) => {
  //req.user viene del middleware authMiddleware
  const currentUserId = req.user._id;
  const { userId } = req.body;

  try {
    //validar que se proporcione el userId
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    //validar que no sea el mismo usuario
    if (userId === currentUserId.toString() || userId.toString() === currentUserId.toString()) {
      return res.status(400).json({ message: "Cannot add yourself as a match" });
    }

    //convertir userId a ObjectId para asegurar compatibilidad
    let userIdObjectId;
    try {
      userIdObjectId = new mongoose.Types.ObjectId(userId);
    } catch (err) {
      return res.status(400).json({ message: "Invalid userId format" });
    }

    //verificar que el usuario a agregar existe
    const userToAdd = await User.findById(userIdObjectId);
    if (!userToAdd) {
      return res.status(404).json({ message: "User to add not found" });
    }

    //obtener el usuario actual SIN populate primero para verificar duplicados
    const user = await User.findById(currentUserId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    //verificar si el match ya existe (comparar ObjectIds directamente)
    const matchExists = user.matches.some(
      (match) => match.userId.toString() === userIdObjectId.toString()
    );

    if (matchExists) {
      return res.status(409).json({ message: "Match already exists" });
    }

    //agregar el match con ObjectId
    //obtener la timezone del usuario o usar la por defecto
    const userTimezone = user.preferences?.timezone || "Europe/Madrid";
    user.matches.push({
      userId: userIdObjectId,
      addedAt: getCurrentDateInTimezone(userTimezone),
    });

    //guardar el usuario
    await user.save();

    //re-populate después de guardar para obtener los datos completos
    await user.populate({
      path: "matches.userId",
      select: "userName avatar lolProfile",
    });

    //status 200: ok
    res.status(200).json({
      message: "Match added successfully ✅",
      user: userDTO(user),
    });
  } catch (err) {
    console.error("Error adding match:", err);
    //status 500: server error
    res.status(500).json({ message: "Error adding match ❌", error: err.message });
  }
};

//eliminar un match de la lista de matches del usuario
const removeMatch = async (req, res) => {
  //req.user viene del middleware authMiddleware
  const currentUserId = req.user._id;
  const { userId } = req.body;

  try {
    //validar que se proporcione el userId
    if (!userId) {
      return res.status(400).json({ message: "userId is required" });
    }

    //convertir userId a ObjectId para asegurar compatibilidad
    let userIdObjectId;
    try {
      userIdObjectId = new mongoose.Types.ObjectId(userId);
    } catch (err) {
      return res.status(400).json({ message: "Invalid userId format" });
    }

    //obtener el usuario actual
    const user = await User.findById(currentUserId);

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    //verificar si el match existe
    const matchIndex = user.matches.findIndex(
      (match) => match.userId.toString() === userIdObjectId.toString()
    );

    if (matchIndex === -1) {
      return res.status(404).json({ message: "Match not found" });
    }

    //eliminar el match del array
    user.matches.splice(matchIndex, 1);

    //guardar el usuario
    await user.save();

    //re-populate después de guardar para obtener los datos completos
    await user.populate({
      path: "matches.userId",
      select: "userName avatar lolProfile",
    });

    //status 200: ok
    res.status(200).json({
      message: "Match removed successfully ✅",
      user: userDTO(user),
    });
  } catch (err) {
    console.error("Error removing match:", err);
    //status 500: server error
    res.status(500).json({ message: "Error removing match ❌", error: err.message });
  }
};

module.exports = {
  getUsersForMatch,
  addMatch,
  removeMatch,
};

