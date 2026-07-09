import express from "express";
import cors from "cors";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  return res.status(200).json({
    status: "OK",
    message: "AllenVoice API is running 🚀"
  });
});

export default app;