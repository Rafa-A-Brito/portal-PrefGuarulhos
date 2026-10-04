import { Router } from "express";
import * as adminPatrimonioController from "../controllers/adminPatrimonioController.js";

const router = Router();

// Não existe GET aqui de propósito: pra listar ou ver um patrimônio, tanto
// o painel admin quanto o site público usam a mesma rota pública
// (GET /patrimonios), então não faz sentido duplicar essa leitura.
router.post("/", adminPatrimonioController.criar);
router.put("/:id", adminPatrimonioController.atualizar);
router.delete("/:id", adminPatrimonioController.excluir);

export default router;
