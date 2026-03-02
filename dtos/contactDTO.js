function contactDTO(contact = {}) {
  return {
    name: contact.name || "",
    lastname: contact.lastname || "",
    phone: contact.phone || "",
    discord: contact.discord || "",
    hobbies: contact.hobbies || "",
    
  };
}

module.exports = contactDTO;
