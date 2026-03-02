//para editar perfiles de usuario con el controller de update
//const updateUserDTO = require("../dtos/updateUserDTO");
//const updatedData = updateUserDTO(req.body);

function updateUserDTO(data) {
  return {
    userName: data.userName,
    avatar: data.avatar,
    preferences: {
      theme: data.preferences?.theme,
      notifications: data.preferences?.notifications,
      squad: data.preferences?.squad,
    },
    address: {
      city: data.address?.city,
      country: data.address?.country,
      postalCode: data.address?.postalCode,
    },
    contact: {
      phone: data.contact?.phone,
      discord: data.contact?.discord,
      twitter: data.contact?.twitter,
    },
  };
}

module.exports = updateUserDTO;
