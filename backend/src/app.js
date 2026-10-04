import express from "express";
import cors from "cors";
import routes from "./routes/index.js";
import { errorMiddleware } from "./middlewares/errorMiddleware.js";

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

app.use("/", routes);

app.use((req, res) => {
  res.status(404).json({ erro: "Rota não encontrada." });
});

app.use(errorMiddleware);

export default app;
