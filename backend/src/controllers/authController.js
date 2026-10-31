import { auth } from "../services/index.js";
const { login: loginService, changePassword: changePasswordService, refresh: refreshService, logout: logoutService } = auth;

export async function login(req, res) {
    const data = await loginService(req.body);
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
