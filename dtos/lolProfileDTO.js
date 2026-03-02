function lolProfileDTO(profile = {}) {
  return {
    gameName: profile.gameName || "",
    tagLine: profile.tagLine || "",
    region: profile.region || "EUW",
    roleLol: profile.roleLol || null,
    tier: profile.tier || null,
    ranks: profile.ranks || null,
    queue: profile.queue || null,
    honor: profile.honor || "Honor 3",
    //mySquad: array de miembros del squad con sus datos
    mySquad: profile.mySquad && Array.isArray(profile.mySquad) 
      ? profile.mySquad.map((member) => ({
          userId: member.userId?._id || member.userId || null,
          userName: member.userId?.userName || null,
          avatar: member.userId?.avatar || null,
          role: member.role || null,
          roleLol: member.userId?.lolProfile?.roleLol || null,
          ranks: member.userId?.lolProfile?.ranks || null,
          tier: member.userId?.lolProfile?.tier || null,
          honor: member.userId?.lolProfile?.honor || "Honor 3",
          addedAt: member.addedAt || null,
        }))
      : [],
  };
}

module.exports = lolProfileDTO;
