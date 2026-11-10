import BaseError from "../errors/BaseError.js";
import { loginAccounts } from "../services/loginAccountService.js";

export function accountLimitError(res, seconds) {
    res.setHeader("Retry-After", seconds);
    const error = new BaseError("Muitas tentativas de login. Aguarde e tente novamente.", 429);
    error.code = "TOO_MANY_REQUESTS";
    return error;
}

export default async function loginAccountLimiter(req, res, next) {
    req.loginAttempt = await loginAccounts.begin(req.body.email);
    if (req.loginAttempt.retryAfter) throw accountLimitError(res, req.loginAttempt.retryAfter);
    next();
}
