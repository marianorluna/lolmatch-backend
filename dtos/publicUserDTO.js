//para mostrar otros jugadores con datos públicos
//usado en endpoints como /community, /search, /squad:id
//const publicUserDTO = require("../dtos/publicUserDTO");
//const users = await User.find(...);
//const response = users.map(publicUserDTO);
//res.json({ users: response });

function publicUserDTO(user) {
  return {
    id: user._id,
    userName: user.userName,
    avatar: user.avatar,
    squad: user.preferences?.squad,
    rank: user.stats?.rank,
    mainRole: user.stats?.mainRole,
    country: user.address?.country,
  };
}

module.exports = publicUserDTO;
