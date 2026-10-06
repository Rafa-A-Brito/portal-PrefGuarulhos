import { Router } from "express";

import authenticate from "../middlewares/authenticate.js";
import authorize from "../middlewares/authorize.js";
import { uploadImagem } from "../middlewares/uploadImage.js";

import { list, detail, create, update, remove } from "../controllers/adminExposicaoController.js";

const router = Router();

router.use(authenticate, authorize("ADMIN", "EDITOR"));

router.get("/", list);

router.get("/:id", detail);

router.post("/", uploadImagem("exposicoes"), create);

router.patch("/:id", uploadImagem("exposicoes"), update);

router.delete("/:id", authorize("ADMIN"), remove);

export default router;
