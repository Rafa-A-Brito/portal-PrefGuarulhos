import authenticate from "./authenticate.js";

export default function authenticateOpcional(req, res, next) {
    // Ausência de credencial permite visitante; credencial enviada deve ser válida.
    // A consulta do usuário mantém os erros de banco e a checagem de conta ativa.
    if (req.get("authorization") === undefined) return next();
    return authenticate(req, res, next);
}
