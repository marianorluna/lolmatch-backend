const mongoose = require("mongoose");
const uri =
  process.env.NODE_ENV === "production"
    ? process.env.MONGO_URI_ATLAS
    : process.env.MONGO_URI_LOCAL;

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(uri);
    console.log(`MongoDB Connected: ${conn.connection.host} ✅`);
  } catch (error) {
    console.log("Error to connect MongoDB ❌", error);
    process.exit(1);
  }
};

module.exports = connectDB;
