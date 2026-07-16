import express from "express";
import cors from "cors";
import { prisma } from "./lib/prisma.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  return res.status(200).json({
    status: "OK",
    message: "AllenVoice API is running 🚀",
  });
});

app.get("/health/database", async (_req, res) => {
  try {
    const companyCount = await prisma.company.count();

    return res.status(200).json({
      status: "OK",
      database: "connected",
      companyCount,
    });
  } catch (error) {
    console.error("Database connection error:", error);

    return res.status(500).json({
      status: "ERROR",
      database: "disconnected",
    });
  }
});

export default app;