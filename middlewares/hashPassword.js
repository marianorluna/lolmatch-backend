const bcrypt = require("bcrypt");

//función para encriptar el password
function hashPassword(schema) {
  schema.pre("save", async function (next) {
    //evita que se vuelva a encriptar si ya está encriptado
    if (!this.isModified("password")) return next();
    //encripta el password
    try {
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(this.password, salt);
      next();
    } catch (error) {
      next(error);
    }
  });
}

module.exports = hashPassword;
