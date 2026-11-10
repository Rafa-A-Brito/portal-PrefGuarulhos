import { auth } from "../services/index.js";
import env from "../config/env.js";
const { loginAccounts, accountLimitError, scheduleAccess } = env.MOCK_DATA ? {} : Object.assign({},
    ...await Promise.all([import("../services/loginAccountService.js"), import("../middlewares/loginAccountLimiter.js"),
        import("../services/loginAccessService.js")]));
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
        const signals = { ip: req.ip, userAgent: req.get("user-agent") };
        res.once("finish", () => scheduleAccess(data.user.id, signals));
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
