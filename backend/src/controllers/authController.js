import * as authService from "../services/authService.js";

/**
 * GET /usuarios?email=...&senha=...
 * Mesmo contrato que o json-server tinha — devolve um array (vazio se
 * não bater) para o front continuar funcionando sem mudar nada.
 */
export async function listarUsuarios(req, res, next) {
  try {
    const { email, senha } = req.query;

    if (!email || !senha) {
      return res.json([]);
    }

    const usuarios = await authService.buscarUsuarioPorCredenciais(
      String(email).trim().toLowerCase(),
      String(senha),
    );

    res.json(usuarios);
  } catch (err) {
    next(err);
  }
}
