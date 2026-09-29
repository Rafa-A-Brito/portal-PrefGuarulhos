import { Router } from "express";
import * as authController from "../controllers/authController.js";

const router = Router();

router.get("/", authController.listarUsuarios);

export default router;
