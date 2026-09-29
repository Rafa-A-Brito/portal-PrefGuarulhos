import app from "./app.js";
import pool from "./config/database.js";

const PORT = process.env.PORT || 4000;
const MAX_TENTATIVAS = 20;
const INTERVALO_MS = 1500;

// Espera o MySQL aceitar conexões antes de subir o Express — no Docker
// Compose o container do backend costuma iniciar antes do banco estar
// pronto para receber conexões, mesmo com depends_on/healthcheck.
async function aguardarBancoDeDados() {
  for (let tentativa = 1; tentativa <= MAX_TENTATIVAS; tentativa++) {
    try {
      await pool.query("SELECT 1");
      console.log("[DB] Conectado ao MySQL.");
      return;
    } catch {
      console.log(
        `[DB] MySQL ainda não disponível (tentativa ${tentativa}/${MAX_TENTATIVAS})...`,
      );
      await new Promise((resolve) => setTimeout(resolve, INTERVALO_MS));
    }
  }
  throw new Error("Não foi possível conectar ao MySQL a tempo.");
}

async function iniciar() {
  await aguardarBancoDeDados();
  app.listen(PORT, () => {
    console.log(`[Server] Backend rodando em http://localhost:${PORT}`);
  });
}

iniciar().catch((err) => {
  console.error("[Server] Falha ao iniciar:", err);
  process.exit(1);
});
