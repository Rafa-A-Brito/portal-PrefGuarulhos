import { auth } from "../services/index.js";
import env from "../config/env.js";
const { loginAccounts } = env.MOCK_DATA ? {} : await import("../services/loginAccountService.js");
const { accountLimitError } = env.MOCK_DATA ? {} : await import("../middlewares/loginAccountLimiter.js");
const { login: loginService, changePassword: changePasswordService, refresh: refreshService, logout: logoutService } = auth;

export async function login(req, res) {
    let data;
    try {
        data = await loginService(req.body);
    } catch (error) {
        if (error.statusCode === 401 && req.loginAttempt) {
            const retry = await loginAccounts.finish(req.loginAttempt, false);
            if (retry) throw accountLimitError(res, retry);
        }
        throw error;
    }
    if (req.loginAttempt) {
        await loginAccounts.finish(req.loginAttempt, true);
    }
    res.setHeader("Cache-Control", "no-store");
    res.json({ success: true, data });
}

export async function refresh(req, res) {
    res.setHeader("Cache-Control", "no-store");
    const data = await refreshService(req.body.refreshToken);
    res.json({ success: true, data });
}

export async function logout(req, res) {
    res.setHeader("Cache-Control", "no-store");
    await logoutService(req.body.refreshToken);
    res.json({ success: true, message: "Sessão encerrada." });
}

export async function changePassword(req, res) {
    await changePasswordService(req.user.id, req.body);
    res.json({ success: true, message: "Senha alterada com sucesso." });
}
