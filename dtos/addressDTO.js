function addressDTO(addr = {}) {
  return {
    city: addr.city || "",
    country: addr.country || "",
  };
}

module.exports = addressDTO;
