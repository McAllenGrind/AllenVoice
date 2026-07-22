import cors from "cors";
import express from "express";
import { prisma } from "./lib/prisma.js";
import { errorMiddleware } from "./middlewares/error.middleware.js";
import companyRouter from "./routes/company.routes.js";
import authRouter from "./routes/auth.routes.js";
import knowledgeRouter from "./routes/knowledge.routes.js";
import aiRouter from "./routes/ai.routes.js";
import voiceRouter from "./routes/voice.routes.js";

const app = express();

app.use(cors());
app.use(express.json());

app.use(
  express.urlencoded({
    extended: false,
  }),
);

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

app.use("/companies", companyRouter);
app.use("/auth", authRouter);
app.use("/knowledge", knowledgeRouter);
app.use("/ai", aiRouter);
app.use("/voice", voiceRouter);


// Toujours placer le middleware d’erreurs après les routes.
app.use(errorMiddleware);

export default app;