import pool from "../config/database.js";

/**
 * Aviso importante sobre este middleware
 *
 * Assim como o resto da autenticação deste projeto (dá uma olhada nos
 * comentários de frontend/src/context/AuthContext.jsx), estamos numa fase
 * de mock. O front manda quem é o usuário logado em dois headers simples,
 * x-user-email e x-user-perfil, lidos do sessionStorage no navegador. Isso
 * não é seguro de verdade: qualquer pessoa com o DevTools aberto consegue
 * trocar esses headers e se passar por outra pessoa. O que este middleware
 * faz de bom é só confirmar que o email enviado corresponde a um usuário
 * admin que realmente existe no banco, então pelo menos evita erros bobos
 * e mostra onde a checagem de permissão deveria acontecer.
 *
 * Quando o login virar de verdade (sessão por cookie HttpOnly ou JWT), essa
 * função muda para ler o usuário a partir do token validado no servidor,
 * em vez de confiar em qualquer coisa que venha do header.
 */
export async function exigirAdmin(req, res, next) {
  const email = req.headers["x-user-email"];

  if (!email) {
    return res
      .status(401)
      .json({ erro: "Faça login para acessar essa área." });
  }

  try {
    const [linhas] = await pool.query(
      "SELECT id, nome, email, perfil FROM usuarios WHERE email = ? LIMIT 1",
      [String(email).trim().toLowerCase()],
    );

    const usuario = linhas[0];

    if (!usuario || usuario.perfil !== "admin") {
      return res
        .status(403)
        .json({ erro: "Essa área é restrita a administradores." });
    }

    // Fica disponível pros controllers, caso precisem saber quem fez a ação
    // (por exemplo, pra registrar quem criou ou editou um registro).
    req.usuarioLogado = usuario;
    next();
  } catch (err) {
    next(err);
  }
}
