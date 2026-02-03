// config/db.js
import mongoose from "mongoose";
import dns from "node:dns";

dns.setServers(["1.1.1.1", "8.8.8.8"]);

export async function connectDB() {
  try {
    const mongoUri = process.env.DATABASE_URL;

    if (!mongoUri) {
      throw new Error("MongoDB URI is not defined in environment variables");
    }

    await mongoose.connect(mongoUri);

    console.log("✅ MongoDB connected with Mongoose");
  } catch (err) {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  }
}
