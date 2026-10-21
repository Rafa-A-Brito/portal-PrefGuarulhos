import { Router } from "express";
import { login, changePassword, refresh, logout } from "../controllers/authController.js";
import validate from "../middlewares/validate.js";
import authenticate from "../middlewares/authenticate.js";
import authorize from "../middlewares/authorize.js";
import { loginSchema, changePasswordSchema, refreshSchema } from "../schemas/authSchema.js";
import loginLimiter, { criarLimitadorLogin } from "../middlewares/loginLimiter.js";
import env from "../config/env.js";

const router = Router();

router.post("/login", loginLimiter, validate(loginSchema), login);
router.post("/refresh", criarLimitadorLogin({ accountMax: env.LOGIN_RATE_IP_MAX }), validate(refreshSchema), refresh);
router.post("/logout", validate(refreshSchema), logout);
router.patch("/senha", authenticate, authorize("EDITOR", "ADMIN"), validate(changePasswordSchema), changePassword);

export default router;
