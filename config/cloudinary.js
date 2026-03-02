const cloudinary = require("cloudinary");
const multer = require("multer");

//mantenemos la carga segura del storage que arreglamos antes
const storageLib = require("multer-storage-cloudinary");
const CloudinaryStorage =
  storageLib.CloudinaryStorage || storageLib.default || storageLib;


//configuramos la v2 de cloudinary
cloudinary.v2.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

//configuramos el storage
const storage = new CloudinaryStorage({
  cloudinary: cloudinary,
  params: {
    folder: "avatars",
    allowed_formats: ["jpg", "png", "jpeg", "webp"],
    transformation: [
      {
        width: 250,
        height: 250,
        crop: "fit",
        fetch_format: "auto",
        quality: "auto",
      },
    ],
  },
});

//configuramos el upload con límite de tamaño máximo (2MB)
const uploadCloudinary = multer({
  storage,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2MB en bytes
  },
});

module.exports = uploadCloudinary;
