import pool from "../config/database.js";

/**
 * Espelha o contrato que o front já espera (json-server:
 * GET /usuarios?email=x&senha=y -> array). A senha ainda viaja em texto
 * puro porque isto é o modo MOCK — ver o aviso extenso em
 * frontend/src/context/AuthContext.jsx sobre o que muda em produção
 * (hash de senha, cookie HttpOnly, etc.).
 */
export async function buscarUsuarioPorCredenciais(email, senha) {
  const [linhas] = await pool.query(
    "SELECT id, nome, email, senha, perfil FROM usuarios WHERE email = ? AND senha = ? LIMIT 1",
    [email, senha],
  );
  return linhas;
}
