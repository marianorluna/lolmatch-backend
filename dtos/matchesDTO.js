//DTO para los matches del usuario
//transforma el array de matches del usuario al formato esperado por el frontend
//espera que match.userId esté populado con los datos del usuario

function matchesDTO(matches) {
  if (!matches || !Array.isArray(matches)) {
    return [];
  }

  return matches
    .filter((match) => match.userId) //filtrar matches con userId válido (por si se eliminó el usuario)
    .map((match) => {
      const user = match.userId;

      //obtener datos del usuario populado
      const userId = user._id?.toString() || user.id?.toString() || match.userId?.toString();
      const userName = user.userName || "";
      const avatar = user.avatar || "";

      //obtener datos del perfil de LoL
      const tier = user.lolProfile?.ranks && user.lolProfile?.tier
        ? `${user.lolProfile.ranks} ${user.lolProfile.tier}`
        : "Unranked";
      const honor = user.lolProfile?.honor || "Honor 3";
      const role = user.lolProfile?.roleLol?.toLowerCase() || "top";

      return {
        id: userId,
        name: userName,
        tier: tier,
        honor: honor,
        role: role,
        avatar: avatar,
        addedAt: match.addedAt || null,
      };
    });
}

module.exports = matchesDTO;

