import "dotenv/config";
import express from "express";
import cors from "cors";
import { connectDB } from "./config/db.js";

import Routes from "./routes/index.js";
const app = express();
const PORT = 3001;

app.use(express.json());
app.use(
  cors({
    origin: [
      "https://www.droppr.ai",
      "http://dropprai.vercel.app",
      "https://dropprai.vercel.app",
      "http://localhost:3000",
      "http://localhost:3001",
      "https://54.83.134.31",
      "https://54.83.134.31:3000",
      "https://54.83.134.31:3001"
    ],
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  }),
);

// Connect DB
connectDB();

// Health check
app.get("/", (req, res) => {
  res.send("DropPR.ai backend is running!");
});

//  route
app.use("/api/v1", Routes);
// app.use("/api/settings", settingsRoutes);

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🌐 Server running at http://localhost:${PORT}`);
});
