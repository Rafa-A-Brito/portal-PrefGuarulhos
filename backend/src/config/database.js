import mysql from "mysql2/promise";

/**
 * Pool de conexões com o MySQL. As credenciais vêm de variáveis de
 * ambiente (ver docker-compose.yml / .env) — nunca hardcoded aqui.
 */
const pool = mysql.createPool({
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "guarulhos_patrimonio",
  charset: "utf8mb4",
  waitForConnections: true,
  connectionLimit: 10,
});

export default pool;
