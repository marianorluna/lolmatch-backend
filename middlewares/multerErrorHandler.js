//middleware para manejar errores de Multer (tamaño de archivo, formato, etc.)
const multerErrorHandler = (err, req, res, next) => {
    if (err) {
        //error de Multer
        if (err.code === "LIMIT_FILE_SIZE") {
            return res.status(400).json({
                success: false,
                message: "File too large. Maximum size is 2MB",
            });
        }

        if (err.code === "LIMIT_FILE_COUNT") {
            return res.status(400).json({
                success: false,
                message: "Too many files",
            });
        }

        if (err.code === "LIMIT_UNEXPECTED_FILE") {
            return res.status(400).json({
                success: false,
                message: "Unexpected file field",
            });
        }

        //otros errores de Multer
        if (err.name === "MulterError") {
            return res.status(400).json({
                success: false,
                message: `Upload error: ${err.message}`,
            });
        }

        //si no es un error de Multer, pasar al siguiente middleware
        return next(err);
    }

    //si no hay error, continuar
    next();
};

module.exports = multerErrorHandler;

