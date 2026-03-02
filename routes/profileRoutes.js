const express = require("express");
const router = express.Router();
const authMiddleware = require("../middlewares/authMiddleware.js");
const multerErrorHandler = require("../middlewares/multerErrorHandler.js");
const uploadCloudinary = require("../config/cloudinary.js");
const { uploadAvatar, updateProfile } = require("../controllers/indexController.js");

//ruta para subir avatar (imagen)
router.post(
  "/upload-avatar",
  authMiddleware,
  //podría ser: array, fields, none o single
  //single: sube un solo archivo
  uploadCloudinary.single("avatar"),
  multerErrorHandler, //maneja errores de Multer (tamaño, formato, etc.)
  uploadAvatar
);

//ruta para actualizar perfil (texto + LOL)
router.patch("/update-profile", authMiddleware, updateProfile);

module.exports = router;
